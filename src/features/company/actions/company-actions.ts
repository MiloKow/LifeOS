"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { TransactionType } from "@prisma/client";

// Company Actions
export type CompanyInput = {
    name: string;
    description?: string;
    logo?: string;
};

export async function createCompany(data: CompanyInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const company = await db.company.create({
            data: {
                ...data,
                userId: session.user.id,
            },
        });

        revalidatePath("/company");
        return { success: true, company };
    } catch (error) {
        console.error("Failed to create company:", error);
        return { error: "Failed to create company" };
    }
}

export async function getCompanies() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const companies = await db.company.findMany({
            where: { userId: session.user.id },
            include: {
                _count: {
                    select: {
                        projects: true,
                        transactions: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return companies;
    } catch (error) {
        console.error("Failed to get companies:", error);
        return [];
    }
}

export async function getCompany(companyId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const company = await db.company.findUnique({
            where: { id: companyId, userId: session.user.id },
            include: {
                projects: {
                    where: { deletedAt: null },
                    include: {
                        tasks: {
                            where: { deletedAt: null },
                            select: { id: true, status: true },
                        },
                        timeEntries: {
                            select: { duration: true },
                        },
                    },
                },
                transactions: {
                    orderBy: { date: "desc" },
                    take: 20,
                },
            },
        });

        return company;
    } catch (error) {
        console.error("Failed to get company:", error);
        return null;
    }
}

// Time Entry Actions
export type TimeEntryInput = {
    description?: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    projectId: string;
};

export async function createTimeEntry(data: TimeEntryInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        let duration = data.duration;
        if (data.endTime && !duration) {
            duration = Math.round(
                (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60)
            );
        }

        const entry = await db.timeEntry.create({
            data: {
                ...data,
                duration,
                userId: session.user.id,
            },
        });

        revalidatePath("/company");
        return { success: true, entry };
    } catch (error) {
        console.error("Failed to create time entry:", error);
        return { error: "Failed to create time entry" };
    }
}

export async function getTimeEntries(options?: {
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
}) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const where: Record<string, unknown> = {
        userId: session.user.id,
    };

    if (options?.projectId) {
        where.projectId = options.projectId;
    }

    if (options?.startDate && options?.endDate) {
        where.startTime = {
            gte: options.startDate,
            lte: options.endDate,
        };
    }

    try {
        const entries = await db.timeEntry.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        company: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
            orderBy: { startTime: "desc" },
        });

        return entries;
    } catch (error) {
        console.error("Failed to get time entries:", error);
        return [];
    }
}

// Transaction Actions
export type TransactionInput = {
    type: TransactionType;
    amount: number;
    description?: string;
    date: Date;
    category?: string;
    companyId?: string;
};

export async function createTransaction(data: TransactionInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const transaction = await db.transaction.create({
            data: {
                ...data,
                userId: session.user.id,
            },
        });

        revalidatePath("/company");
        return { success: true, transaction };
    } catch (error) {
        console.error("Failed to create transaction:", error);
        return { error: "Failed to create transaction" };
    }
}

export async function getFinancialSummary(companyId?: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { income: 0, expenses: 0, balance: 0 };
    }

    const where: Record<string, unknown> = {
        userId: session.user.id,
    };

    if (companyId) {
        where.companyId = companyId;
    }

    try {
        const transactions = await db.transaction.findMany({
            where,
            select: {
                type: true,
                amount: true,
            },
        });

        const summary = transactions.reduce(
            (acc, t) => {
                const amount = Number(t.amount);
                if (t.type === "INCOME") {
                    acc.income += amount;
                } else {
                    acc.expenses += amount;
                }
                return acc;
            },
            { income: 0, expenses: 0 }
        );

        return {
            ...summary,
            balance: summary.income - summary.expenses,
        };
    } catch (error) {
        console.error("Failed to get financial summary:", error);
        return { income: 0, expenses: 0, balance: 0 };
    }
}
