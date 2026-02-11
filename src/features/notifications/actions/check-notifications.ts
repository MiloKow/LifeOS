'use server';

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, subHours, addHours, addDays, format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Vérifie et crée les notifications automatiques pour :
 * - Events : le jour même + 1h avant
 * - Tasks avec deadline : 1 jour avant + le jour même
 */
export async function checkAndCreateNotifications(): Promise<{ created: number }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { created: 0 };
    }

    const userId = session.user.id;
    const now = new Date();
    let created = 0;

    try {
        // ========================================
        // 1. EVENTS - Notification le jour même
        // ========================================
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);

        const todayEvents = await db.event.findMany({
            where: {
                userId,
                startTime: {
                    gte: todayStart,
                    lte: todayEnd,
                },
                isTimeBlock: false, // Ne pas notifier les time blocks
            },
            select: {
                id: true,
                title: true,
                startTime: true,
                allDay: true,
            },
        });

        for (const event of todayEvents) {
            const dayOfKey = `event-day-${event.id}-${format(todayStart, 'yyyy-MM-dd')}`;

            // Notification "jour même"
            const existingDayOf = await db.notification.findFirst({
                where: {
                    userId,
                    type: "EVENT_REMINDER",
                    link: `/calendar`,
                    title: {
                        startsWith: `📅 Aujourd'hui :`,
                    },
                    message: {
                        contains: event.id,
                    },
                    createdAt: {
                        gte: todayStart,
                    },
                },
            });

            if (!existingDayOf) {
                const timeStr = event.allDay
                    ? "toute la journée"
                    : `à ${format(event.startTime, 'HH:mm', { locale: fr })}`;

                await db.notification.create({
                    data: {
                        type: "EVENT_REMINDER",
                        title: `📅 Aujourd'hui : ${event.title}`,
                        message: `[${event.id}] Événement prévu ${timeStr}`,
                        link: `/calendar`,
                        userId,
                    },
                });
                created++;
            }
        }

        // ========================================
        // 2. EVENTS - Notification 1h avant
        // ========================================
        const oneHourFromNow = addHours(now, 1);

        const soonEvents = await db.event.findMany({
            where: {
                userId,
                allDay: false,
                isTimeBlock: false,
                startTime: {
                    gte: now,
                    lte: oneHourFromNow,
                },
            },
            select: {
                id: true,
                title: true,
                startTime: true,
            },
        });

        for (const event of soonEvents) {
            const existingHourBefore = await db.notification.findFirst({
                where: {
                    userId,
                    type: "EVENT_REMINDER",
                    title: {
                        startsWith: `⏰ Dans ~1h :`,
                    },
                    message: {
                        contains: event.id,
                    },
                    createdAt: {
                        gte: subHours(now, 2), // Évite les doublons si on check souvent
                    },
                },
            });

            if (!existingHourBefore) {
                await db.notification.create({
                    data: {
                        type: "EVENT_REMINDER",
                        title: `⏰ Dans ~1h : ${event.title}`,
                        message: `[${event.id}] Commence à ${format(event.startTime, 'HH:mm', { locale: fr })}`,
                        link: `/calendar`,
                        userId,
                    },
                });
                created++;
            }
        }

        // ========================================
        // 3. TASKS - Notification 1 jour avant la deadline
        // ========================================
        const tomorrowStart = startOfDay(addDays(now, 1));
        const tomorrowEnd = endOfDay(addDays(now, 1));

        const tomorrowTasks = await db.task.findMany({
            where: {
                userId,
                dueDate: {
                    gte: tomorrowStart,
                    lte: tomorrowEnd,
                },
                status: {
                    not: "DONE",
                },
                deletedAt: null,
            },
            select: {
                id: true,
                title: true,
                dueDate: true,
                priority: true,
            },
        });

        for (const task of tomorrowTasks) {
            const existingDayBefore = await db.notification.findFirst({
                where: {
                    userId,
                    type: "TASK_DUE",
                    title: {
                        startsWith: `⚠️ Deadline demain :`,
                    },
                    message: {
                        contains: task.id,
                    },
                    createdAt: {
                        gte: todayStart,
                    },
                },
            });

            if (!existingDayBefore) {
                await db.notification.create({
                    data: {
                        type: "TASK_DUE",
                        title: `⚠️ Deadline demain : ${task.title}`,
                        message: `[${task.id}] Échéance le ${format(task.dueDate!, 'dd/MM/yyyy', { locale: fr })} — Priorité : ${task.priority}`,
                        link: `/tasks`,
                        userId,
                    },
                });
                created++;
            }
        }

        // ========================================
        // 4. TASKS - Notification le jour même de la deadline
        // ========================================
        const todayTasks = await db.task.findMany({
            where: {
                userId,
                dueDate: {
                    gte: todayStart,
                    lte: todayEnd,
                },
                status: {
                    not: "DONE",
                },
                deletedAt: null,
            },
            select: {
                id: true,
                title: true,
                dueDate: true,
                priority: true,
            },
        });

        for (const task of todayTasks) {
            const existingDueToday = await db.notification.findFirst({
                where: {
                    userId,
                    type: "TASK_DUE",
                    title: {
                        startsWith: `🔴 Deadline aujourd'hui :`,
                    },
                    message: {
                        contains: task.id,
                    },
                    createdAt: {
                        gte: todayStart,
                    },
                },
            });

            if (!existingDueToday) {
                await db.notification.create({
                    data: {
                        type: "TASK_DUE",
                        title: `🔴 Deadline aujourd'hui : ${task.title}`,
                        message: `[${task.id}] Cette tâche doit être terminée aujourd'hui ! Priorité : ${task.priority}`,
                        link: `/tasks`,
                        userId,
                    },
                });
                created++;
            }
        }

        return { created };
    } catch (error) {
        console.error("Failed to check and create notifications:", error);
        return { created: 0 };
    }
}
