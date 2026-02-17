"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type EventInput = {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    allDay?: boolean;
    isTimeBlock?: boolean;
    color?: string;
    taskId?: string;
    projectId?: string | null;
    companyId?: string | null;
};

export async function createEvent(data: EventInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const event = await db.event.create({
            data: {
                title: data.title,
                description: data.description,
                startTime: data.startTime,
                endTime: data.endTime,
                allDay: data.allDay,
                isTimeBlock: data.isTimeBlock,
                color: data.color,
                taskId: data.taskId,
                projectId: data.projectId || null,
                companyId: data.companyId || null,
                userId: session.user.id,
            },
        });

        revalidatePath("/calendar");
        revalidatePath("/dashboard");
        if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
        if (data.companyId) revalidatePath(`/company/${data.companyId}`);
        return { success: true, event };
    } catch (error) {
        console.error("Failed to create event:", error);
        return { error: "Failed to create event" };
    }
}

export async function updateEvent(eventId: string, data: Partial<EventInput>) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const event = await db.event.update({
            where: { id: eventId, userId: session.user.id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.startTime !== undefined && { startTime: data.startTime }),
                ...(data.endTime !== undefined && { endTime: data.endTime }),
                ...(data.allDay !== undefined && { allDay: data.allDay }),
                ...(data.isTimeBlock !== undefined && { isTimeBlock: data.isTimeBlock }),
                ...(data.color !== undefined && { color: data.color }),
                ...(data.taskId !== undefined && { taskId: data.taskId }),
                ...(data.projectId !== undefined && { projectId: data.projectId || null }),
                ...(data.companyId !== undefined && { companyId: data.companyId || null }),
            },
        });

        revalidatePath("/calendar");
        revalidatePath("/dashboard");
        return { success: true, event };
    } catch (error) {
        console.error("Failed to update event:", error);
        return { error: "Failed to update event" };
    }
}

export async function deleteEvent(eventId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        await db.event.delete({
            where: { id: eventId, userId: session.user.id },
        });

        revalidatePath("/calendar");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete event:", error);
        return { error: "Failed to delete event" };
    }
}

export async function getEvents(options?: {
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    companyId?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const where: Record<string, unknown> = {
        userId: session.user.id,
    };

    if (options?.startDate && options?.endDate) {
        // Include events that overlap with the date range
        // An event overlaps if it starts before the range ends AND ends after the range starts
        where.AND = [
            { startTime: { lte: options.endDate } },
            { endTime: { gte: options.startDate } },
        ];
    }

    if (options?.projectId) {
        where.projectId = options.projectId;
    }

    if (options?.companyId) {
        where.companyId = options.companyId;
    }

    try {
        const events = await db.event.findMany({
            where,
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { startTime: "asc" },
        });

        return events;
    } catch (error) {
        console.error("Failed to get events:", error);
        return [];
    }
}

// Helper to get available projects and companies for the event form
export async function getEventLinkOptions() {
    const session = await auth();
    if (!session?.user?.id) {
        return { projects: [], companies: [] };
    }

    try {
        const [projects, companies] = await Promise.all([
            db.project.findMany({
                where: { userId: session.user.id, deletedAt: null },
                select: { id: true, name: true, color: true },
                orderBy: { name: "asc" },
            }),
            db.company.findMany({
                where: { userId: session.user.id },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
        ]);

        return { projects, companies };
    } catch (error) {
        console.error("Failed to get event link options:", error);
        return { projects: [], companies: [] };
    }
}
