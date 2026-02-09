"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ==================
// CLIENT TYPES
// ==================

export type ClientInput = {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    isActive?: boolean;
    subscriptionType?: string;
    subscriptionAmount?: number;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
};

// ==================
// CLIENT ACTIONS
// ==================

export async function createClient(companyId: string, data: ClientInput) {
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

        const client = await db.client.create({
            data: {
                ...data,
                companyId,
            },
        });

        revalidatePath(`/company/${companyId}`);
        return { success: true, client };
    } catch (error) {
        console.error("Failed to create client:", error);
        return { error: "Failed to create client" };
    }
}

export async function updateClient(clientId: string, data: Partial<ClientInput>) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        // Verify ownership through company
        const existingClient = await db.client.findFirst({
            where: { id: clientId },
            include: { company: { select: { userId: true, id: true } } },
        });

        if (!existingClient || existingClient.company.userId !== session.user.id) {
            return { error: "Client not found" };
        }

        const client = await db.client.update({
            where: { id: clientId },
            data,
        });

        revalidatePath(`/company/${existingClient.company.id}`);
        return { success: true, client };
    } catch (error) {
        console.error("Failed to update client:", error);
        return { error: "Failed to update client" };
    }
}

export async function deleteClient(clientId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const existingClient = await db.client.findFirst({
            where: { id: clientId },
            include: { company: { select: { userId: true, id: true } } },
        });

        if (!existingClient || existingClient.company.userId !== session.user.id) {
            return { error: "Client not found" };
        }

        await db.client.delete({
            where: { id: clientId },
        });

        revalidatePath(`/company/${existingClient.company.id}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete client:", error);
        return { error: "Failed to delete client" };
    }
}

export async function getClients(companyId: string) {
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

        const clients = await db.client.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: { invoices: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return clients;
    } catch (error) {
        console.error("Failed to get clients:", error);
        return [];
    }
}

export async function getClient(clientId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const client = await db.client.findFirst({
            where: { id: clientId },
            include: {
                company: { select: { userId: true } },
                invoices: {
                    orderBy: { issueDate: "desc" },
                    take: 10,
                },
            },
        });

        if (!client || client.company.userId !== session.user.id) {
            return null;
        }

        return client;
    } catch (error) {
        console.error("Failed to get client:", error);
        return null;
    }
}

// ==================
// MRR/ARR CALCULATIONS
// ==================

export async function getSubscriptionMetrics(companyId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { mrr: 0, arr: 0, activeSubscriptions: 0, totalClients: 0 };
    }

    try {
        const company = await db.company.findFirst({
            where: { id: companyId, userId: session.user.id },
        });

        if (!company) {
            return { mrr: 0, arr: 0, activeSubscriptions: 0, totalClients: 0 };
        }

        const clients = await db.client.findMany({
            where: {
                companyId,
                isActive: true,
                subscriptionAmount: { not: null },
            },
            select: {
                subscriptionType: true,
                subscriptionAmount: true,
            },
        });

        const totalClients = await db.client.count({
            where: { companyId },
        });

        let mrr = 0;

        for (const client of clients) {
            if (!client.subscriptionAmount) continue;

            const amount = Number(client.subscriptionAmount);

            switch (client.subscriptionType) {
                case "monthly":
                    mrr += amount;
                    break;
                case "yearly":
                    mrr += amount / 12;
                    break;
                // One-time payments don't count towards MRR
            }
        }

        return {
            mrr: Math.round(mrr * 100) / 100,
            arr: Math.round(mrr * 12 * 100) / 100,
            activeSubscriptions: clients.length,
            totalClients,
        };
    } catch (error) {
        console.error("Failed to get subscription metrics:", error);
        return { mrr: 0, arr: 0, activeSubscriptions: 0, totalClients: 0 };
    }
}
