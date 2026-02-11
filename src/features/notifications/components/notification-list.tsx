"use client";

import { useEffect, useState } from "react";
import { useNotificationStore } from "@/stores/notification-store";
import { getNotifications, markAllNotificationsAsRead } from "@/features/notifications/actions/notification-actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { CheckCheck, BellOff, Loader2 } from "lucide-react";
import { NotificationItem } from "./notification-item";

export function NotificationList() {
    const { notifications, setNotifications, markAllAsRead, unreadCount } = useNotificationStore();
    const [isLoading, setIsLoading] = useState(notifications.length === 0);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const result = await getNotifications();
                if (result.success && result.data) {
                    setNotifications(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, [setNotifications]);

    const handleMarkAllAsRead = async () => {
        markAllAsRead();
        await markAllNotificationsAsRead();
    };

    if (isLoading) {
        return (
            <div className="flex h-[300px] w-[350px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="w-[350px] flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-semibold leading-none tracking-tight">Notifications</h4>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 text-xs text-muted-foreground hover:text-primary"
                        onClick={handleMarkAllAsRead}
                    >
                        <CheckCheck className="mr-1 h-3 w-3" />
                        Mark all as read
                    </Button>
                )}
            </div>
            <ScrollArea className="flex-1 max-h-[400px]">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <BellOff className="h-12 w-12 opacity-20 mb-3" />
                        <p className="text-sm">No notifications yet</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {notifications.map((notification) => (
                            <NotificationItem key={notification.id} notification={notification} />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
