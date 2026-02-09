'use server';

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type Notification = {
    id: string;
    type: NotificationType;
    title: string;
    message: string | null;
    read: boolean;
    link: string | null;
    createdAt: Date;
};

export async function getNotifications(): Promise<{ success: boolean; data?: Notification[]; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const notifications = await db.notification.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 20, // Limit to 20 recent notifications
        });

        return { success: true, data: notifications };
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return { success: false, error: "Failed to fetch notifications" };
    }
}

export async function markNotificationAsRead(id: string): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await db.notification.update({
            where: {
                id,
                userId: session.user.id, // Ensure user owns the notification
            },
            data: {
                read: true,
            },
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
        return { success: false, error: "Failed to mark notification as read" };
    }
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await db.notification.updateMany({
            where: {
                userId: session.user.id,
                read: false,
            },
            data: {
                read: true,
            },
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        return { success: false, error: "Failed to mark all notifications as read" };
    }
}
