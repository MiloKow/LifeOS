"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ExpenseType, SubscriptionFrequency } from "@prisma/client";

export type ExpenseInput = {
    name: string;
    description?: string;
    amount: number;
    type: ExpenseType;
    date?: Date;
    frequency?: SubscriptionFrequency;
    renewalDate?: Date;
};

export async function createExpense(companyId: string, data: ExpenseInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    // Verify company ownership
    const company = await db.company.findFirst({
        where: { id: companyId, userId: session.user.id },
    });

    if (!company) {
        return { error: "Company not found" };
    }

    try {
        const expense = await db.expense.create({
            data: {
                name: data.name,
                description: data.description,
                amount: data.amount,
                type: data.type,
                date: data.date || new Date(),
                frequency: data.type === "SUBSCRIPTION" ? data.frequency : null,
                renewalDate: data.type === "SUBSCRIPTION" ? data.renewalDate : null,
                companyId,
            },
        });

        revalidatePath(`/company/${companyId}`);
        revalidatePath("/company");
        return { success: true, expense };
    } catch (error) {
        console.error("Failed to create expense:", error);
        return { error: "Failed to create expense" };
    }
}

export async function updateExpense(expenseId: string, data: Partial<ExpenseInput>) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    // Verify expense ownership
    const existingExpense = await db.expense.findFirst({
        where: { id: expenseId },
        include: { company: true },
    });

    if (!existingExpense || existingExpense.company.userId !== session.user.id) {
        return { error: "Expense not found" };
    }

    try {
        const expense = await db.expense.update({
            where: { id: expenseId },
            data,
        });

        revalidatePath(`/company/${existingExpense.companyId}`);
        revalidatePath("/company");
        return { success: true, expense };
    } catch (error) {
        console.error("Failed to update expense:", error);
        return { error: "Failed to update expense" };
    }
}

export async function deleteExpense(expenseId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    // Verify expense ownership
    const existingExpense = await db.expense.findFirst({
        where: { id: expenseId },
        include: { company: true },
    });

    if (!existingExpense || existingExpense.company.userId !== session.user.id) {
        return { error: "Expense not found" };
    }

    try {
        await db.expense.delete({
            where: { id: expenseId },
        });

        revalidatePath(`/company/${existingExpense.companyId}`);
        revalidatePath("/company");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete expense:", error);
        return { error: "Failed to delete expense" };
    }
}

export async function getExpenses(companyId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    // Verify company ownership
    const company = await db.company.findFirst({
        where: { id: companyId, userId: session.user.id },
    });

    if (!company) {
        return [];
    }

    try {
        const expenses = await db.expense.findMany({
            where: { companyId },
            orderBy: [{ type: "asc" }, { renewalDate: "asc" }, { createdAt: "desc" }],
        });

        return expenses;
    } catch (error) {
        console.error("Failed to get expenses:", error);
        return [];
    }
}

export async function getUpcomingRenewals(days: number = 30) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    try {
        const renewals = await db.expense.findMany({
            where: {
                company: { userId: session.user.id },
                type: "SUBSCRIPTION",
                renewalDate: {
                    gte: now,
                    lte: futureDate,
                },
            },
            include: {
                company: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { renewalDate: "asc" },
        });

        return renewals;
    } catch (error) {
        console.error("Failed to get upcoming renewals:", error);
        return [];
    }
}

// Generate all recurring renewal dates until end of year for calendar
export async function getAllRenewalsForCalendar() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const subscriptions = await db.expense.findMany({
            where: {
                company: { userId: session.user.id },
                type: "SUBSCRIPTION",
                renewalDate: { not: null },
            },
            include: {
                company: {
                    select: { id: true, name: true },
                },
            },
        });

        const now = new Date();
        const endOfYear = new Date(now.getFullYear(), 11, 31); // December 31st

        type RenewalEvent = {
            id: string;
            name: string;
            amount: typeof subscriptions[0]["amount"];
            renewalDate: Date;
            frequency: typeof subscriptions[0]["frequency"];
            company: { id: string; name: string };
        };

        const allRenewals: RenewalEvent[] = [];

        for (const sub of subscriptions) {
            if (!sub.renewalDate || !sub.frequency) continue;

            let currentDate = new Date(sub.renewalDate);

            // If the renewal date is in the past, calculate the next occurrence
            while (currentDate < now) {
                if (sub.frequency === "MONTHLY") {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                } else {
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                }
            }

            // Generate all future occurrences until end of year
            while (currentDate <= endOfYear) {
                allRenewals.push({
                    id: `${sub.id}-${currentDate.toISOString()}`,
                    name: sub.name,
                    amount: sub.amount,
                    renewalDate: new Date(currentDate),
                    frequency: sub.frequency,
                    company: sub.company,
                });

                if (sub.frequency === "MONTHLY") {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                } else {
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                }
            }
        }

        return allRenewals.sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime());
    } catch (error) {
        console.error("Failed to get all renewals for calendar:", error);
        return [];
    }
}


export async function getExpenseSummary(companyId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { totalOneTime: 0, monthlySubscriptions: 0, yearlySubscriptions: 0 };
    }

    try {
        const expenses = await db.expense.findMany({
            where: {
                companyId,
                company: { userId: session.user.id },
            },
        });

        let totalOneTime = 0;
        let monthlySubscriptions = 0;
        let yearlySubscriptions = 0;

        expenses.forEach((expense) => {
            const amount = Number(expense.amount);
            if (expense.type === "ONE_TIME") {
                totalOneTime += amount;
            } else if (expense.frequency === "MONTHLY") {
                monthlySubscriptions += amount;
            } else if (expense.frequency === "YEARLY") {
                yearlySubscriptions += amount;
            }
        });

        return { totalOneTime, monthlySubscriptions, yearlySubscriptions };
    } catch (error) {
        console.error("Failed to get expense summary:", error);
        return { totalOneTime: 0, monthlySubscriptions: 0, yearlySubscriptions: 0 };
    }
}
