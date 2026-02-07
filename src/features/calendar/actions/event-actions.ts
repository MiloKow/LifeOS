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
    projectId?: string;
};

export async function createEvent(data: EventInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const event = await db.event.create({
            data: {
                ...data,
                userId: session.user.id,
            },
        });

        revalidatePath("/calendar");
        revalidatePath("/dashboard");
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
            data,
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
}) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const where: Record<string, unknown> = {
        userId: session.user.id,
    };

    if (options?.startDate && options?.endDate) {
        where.startTime = {
            gte: options.startDate,
            lte: options.endDate,
        };
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
            },
            orderBy: { startTime: "asc" },
        });

        return events;
    } catch (error) {
        console.error("Failed to get events:", error);
        return [];
    }
}
