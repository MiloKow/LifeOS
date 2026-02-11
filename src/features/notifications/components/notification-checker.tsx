"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useNotificationStore } from "@/stores/notification-store";
import { getNotifications } from "@/features/notifications/actions/notification-actions";

const CHECK_INTERVAL = 5 * 60 * 1000; // Vérifie toutes les 5 minutes

export function NotificationChecker() {
    const { data: session } = useSession();
    const { setNotifications } = useNotificationStore();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const checkNotifications = useCallback(async () => {
        if (!session?.user) return;

        try {
            // 1. Appeler l'API pour générer les nouvelles notifications
            await fetch("/api/notifications/check", { method: "POST" });

            // 2. Rafraîchir la liste des notifications dans le store
            const result = await getNotifications();
            if (result.success && result.data) {
                setNotifications(result.data);
            }
        } catch (error) {
            console.error("Notification check error:", error);
        }
    }, [session?.user, setNotifications]);

    useEffect(() => {
        if (!session?.user) return;

        // Check immédiatement au montage
        checkNotifications();

        // Puis toutes les 5 minutes
        intervalRef.current = setInterval(checkNotifications, CHECK_INTERVAL);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [session?.user, checkNotifications]);

    // Ce composant ne rend rien visuellement
    return null;
}
