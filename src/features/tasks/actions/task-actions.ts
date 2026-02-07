"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Priority, TaskStatus, Context, RecurrenceType } from "@prisma/client";

export type TaskInput = {
    title: string;
    description?: string;
    priority?: Priority;
    status?: TaskStatus;
    context?: Context;
    dueDate?: Date;
    projectId?: string;
    isRecurring?: boolean;
    recurrenceType?: RecurrenceType;
    recurrenceEnd?: Date;
};

export async function createTask(data: TaskInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const task = await db.task.create({
            data: {
                ...data,
                userId: session.user.id,
            },
        });

        revalidatePath("/tasks");
        revalidatePath("/dashboard");
        return { success: true, task };
    } catch (error) {
        console.error("Failed to create task:", error);
        return { error: "Failed to create task" };
    }
}

export async function updateTask(
    taskId: string,
    data: Partial<TaskInput> & { completedAt?: Date | null }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const task = await db.task.update({
            where: { id: taskId, userId: session.user.id },
            data,
        });

        revalidatePath("/tasks");
        revalidatePath("/dashboard");
        return { success: true, task };
    } catch (error) {
        console.error("Failed to update task:", error);
        return { error: "Failed to update task" };
    }
}

export async function deleteTask(taskId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        await db.task.update({
            where: { id: taskId, userId: session.user.id },
            data: { deletedAt: new Date() },
        });

        revalidatePath("/tasks");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete task:", error);
        return { error: "Failed to delete task" };
    }
}

export async function toggleTaskStatus(taskId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const task = await db.task.findUnique({
            where: { id: taskId, userId: session.user.id },
        });

        if (!task) {
            return { error: "Task not found" };
        }

        const newStatus = task.status === "DONE" ? "TODO" : "DONE";
        const completedAt = newStatus === "DONE" ? new Date() : null;

        const updatedTask = await db.task.update({
            where: { id: taskId },
            data: {
                status: newStatus,
                completedAt,
            },
        });

        revalidatePath("/tasks");
        revalidatePath("/dashboard");
        return { success: true, task: updatedTask };
    } catch (error) {
        console.error("Failed to toggle task:", error);
        return { error: "Failed to toggle task" };
    }
}

export async function getTasks(options?: {
    status?: TaskStatus;
    context?: Context;
    projectId?: string;
    today?: boolean;
    thisWeek?: boolean;
}) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const where: Record<string, unknown> = {
        userId: session.user.id,
        deletedAt: null,
    };

    if (options?.status) {
        where.status = options.status;
    }

    if (options?.context) {
        where.context = options.context;
    }

    if (options?.projectId) {
        where.projectId = options.projectId;
    }

    if (options?.today) {
        const tomorrow = new Date();
        tomorrow.setHours(23, 59, 59, 999);
        // Include tasks due today or overdue (past due date), exclude completed tasks
        where.dueDate = {
            lte: tomorrow,
        };
        where.status = {
            not: "DONE",
        };
    }

    if (options?.thisWeek) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        where.dueDate = {
            gte: today,
            lte: endOfWeek,
        };
    }

    try {
        const tasks = await db.task.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
            orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
        });

        return tasks;
    } catch (error) {
        console.error("Failed to get tasks:", error);
        return [];
    }
}

export async function getTasksForCalendar(options: {
    startDate: Date;
    endDate: Date;
}) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const tasks = await db.task.findMany({
            where: {
                userId: session.user.id,
                deletedAt: null,
                dueDate: {
                    gte: options.startDate,
                    lte: options.endDate,
                },
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
            orderBy: { dueDate: "asc" },
        });

        return tasks;
    } catch (error) {
        console.error("Failed to get tasks for calendar:", error);
        return [];
    }
}

