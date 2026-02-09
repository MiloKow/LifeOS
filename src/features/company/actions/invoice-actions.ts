"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { InvoiceStatus } from "@prisma/client";

// ==================
// INVOICE TYPES
// ==================

export type InvoiceItemInput = {
    description: string;
    quantity: number;
    unitPrice: number;
};

export type InvoiceInput = {
    clientId: string;
    dueDate: Date;
    taxRate?: number;
    notes?: string;
    items: InvoiceItemInput[];
};

export type InvoiceUpdateInput = {
    status?: InvoiceStatus;
    dueDate?: Date;
    taxRate?: number;
    notes?: string;
};

// ==================
// INVOICE ACTIONS
// ==================

async function generateInvoiceNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();

    const lastInvoice = await db.invoice.findFirst({
        where: {
            companyId,
            invoiceNumber: { startsWith: `INV-${year}-` },
        },
        orderBy: { invoiceNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastInvoice) {
        const match = lastInvoice.invoiceNumber.match(/INV-\d+-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    return `INV-${year}-${String(nextNumber).padStart(3, "0")}`;
}

export async function createInvoice(companyId: string, data: InvoiceInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        // Verify company ownership
        const company = await db.company.findFirst({
            where: { id: companyId, userId: session.user.id },
        });

        if (!company) {
            return { error: "Company not found" };
        }

        // Verify client belongs to company
        const client = await db.client.findFirst({
            where: { id: data.clientId, companyId },
        });

        if (!client) {
            return { error: "Client not found" };
        }

        // Calculate totals
        const subtotal = data.items.reduce(
            (acc, item) => acc + item.quantity * item.unitPrice,
            0
        );
        const taxAmount = data.taxRate ? subtotal * (data.taxRate / 100) : 0;
        const total = subtotal + taxAmount;

        const invoiceNumber = await generateInvoiceNumber(companyId);

        const invoice = await db.invoice.create({
            data: {
                invoiceNumber,
                clientId: data.clientId,
                companyId,
                dueDate: data.dueDate,
                subtotal,
                taxRate: data.taxRate,
                taxAmount,
                total,
                notes: data.notes,
                items: {
                    create: data.items.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.quantity * item.unitPrice,
                    })),
                },
            },
            include: { items: true, client: true },
        });

        revalidatePath(`/company/${companyId}`);
        return { success: true, invoice };
    } catch (error) {
        console.error("Failed to create invoice:", error);
        return { error: "Failed to create invoice" };
    }
}

export async function updateInvoice(invoiceId: string, data: InvoiceUpdateInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const existingInvoice = await db.invoice.findFirst({
            where: { id: invoiceId },
            include: { company: { select: { userId: true, id: true } } },
        });

        if (!existingInvoice || existingInvoice.company.userId !== session.user.id) {
            return { error: "Invoice not found" };
        }

        const updateData: Record<string, unknown> = { ...data };

        // If marking as paid, set paidDate
        if (data.status === "PAID" && !existingInvoice.paidDate) {
            updateData.paidDate = new Date();
        }

        const invoice = await db.invoice.update({
            where: { id: invoiceId },
            data: updateData,
        });

        revalidatePath(`/company/${existingInvoice.company.id}`);
        return { success: true, invoice };
    } catch (error) {
        console.error("Failed to update invoice:", error);
        return { error: "Failed to update invoice" };
    }
}

export async function markInvoiceAsPaid(invoiceId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const existingInvoice = await db.invoice.findFirst({
            where: { id: invoiceId },
            include: { company: { select: { userId: true, id: true } } },
        });

        if (!existingInvoice || existingInvoice.company.userId !== session.user.id) {
            return { error: "Invoice not found" };
        }

        // Update invoice status
        const invoice = await db.invoice.update({
            where: { id: invoiceId },
            data: {
                status: "PAID",
                paidDate: new Date(),
            },
        });

        // Create income transaction
        await db.transaction.create({
            data: {
                type: "INCOME",
                amount: existingInvoice.total,
                description: `Invoice ${existingInvoice.invoiceNumber}`,
                date: new Date(),
                category: "Invoice Payment",
                userId: session.user.id,
                companyId: existingInvoice.companyId,
            },
        });

        revalidatePath(`/company/${existingInvoice.company.id}`);
        return { success: true, invoice };
    } catch (error) {
        console.error("Failed to mark invoice as paid:", error);
        return { error: "Failed to mark invoice as paid" };
    }
}

export async function deleteInvoice(invoiceId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const existingInvoice = await db.invoice.findFirst({
            where: { id: invoiceId },
            include: { company: { select: { userId: true, id: true } } },
        });

        if (!existingInvoice || existingInvoice.company.userId !== session.user.id) {
            return { error: "Invoice not found" };
        }

        await db.invoice.delete({
            where: { id: invoiceId },
        });

        revalidatePath(`/company/${existingInvoice.company.id}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete invoice:", error);
        return { error: "Failed to delete invoice" };
    }
}

export async function getInvoices(
    companyId: string,
    filters?: { status?: InvoiceStatus; clientId?: string }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const company = await db.company.findFirst({
            where: { id: companyId, userId: session.user.id },
        });

        if (!company) {
            return [];
        }

        const where: Record<string, unknown> = { companyId };

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.clientId) {
            where.clientId = filters.clientId;
        }

        const invoices = await db.invoice.findMany({
            where,
            include: {
                client: {
                    select: { id: true, name: true, email: true },
                },
                _count: {
                    select: { items: true },
                },
            },
            orderBy: { issueDate: "desc" },
        });

        return invoices;
    } catch (error) {
        console.error("Failed to get invoices:", error);
        return [];
    }
}

export async function getInvoice(invoiceId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const invoice = await db.invoice.findFirst({
            where: { id: invoiceId },
            include: {
                company: { select: { userId: true, name: true } },
                client: true,
                items: true,
            },
        });

        if (!invoice || invoice.company.userId !== session.user.id) {
            return null;
        }

        return invoice;
    } catch (error) {
        console.error("Failed to get invoice:", error);
        return null;
    }
}

// ==================
// INVOICE SUMMARY
// ==================

export async function getInvoiceSummary(companyId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { draft: 0, sent: 0, paid: 0, overdue: 0, totalPending: 0, totalPaid: 0 };
    }

    try {
        const company = await db.company.findFirst({
            where: { id: companyId, userId: session.user.id },
        });

        if (!company) {
            return { draft: 0, sent: 0, paid: 0, overdue: 0, totalPending: 0, totalPaid: 0 };
        }

        const invoices = await db.invoice.findMany({
            where: { companyId },
            select: { status: true, total: true, dueDate: true },
        });

        const now = new Date();
        let draft = 0;
        let sent = 0;
        let paid = 0;
        let overdue = 0;
        let totalPending = 0;
        let totalPaid = 0;

        for (const inv of invoices) {
            const total = Number(inv.total);

            switch (inv.status) {
                case "DRAFT":
                    draft++;
                    break;
                case "SENT":
                    sent++;
                    totalPending += total;
                    if (inv.dueDate < now) {
                        overdue++;
                    }
                    break;
                case "PAID":
                    paid++;
                    totalPaid += total;
                    break;
                case "OVERDUE":
                    overdue++;
                    totalPending += total;
                    break;
            }
        }

        return {
            draft,
            sent,
            paid,
            overdue,
            totalPending: Math.round(totalPending * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100,
        };
    } catch (error) {
        console.error("Failed to get invoice summary:", error);
        return { draft: 0, sent: 0, paid: 0, overdue: 0, totalPending: 0, totalPaid: 0 };
    }
}
