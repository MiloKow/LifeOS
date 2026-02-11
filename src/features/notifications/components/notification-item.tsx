"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Notification, markNotificationAsRead } from "@/features/notifications/actions/notification-actions";
import { useNotificationStore } from "@/stores/notification-store";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Info, AlertTriangle, XCircle, FileText, CheckCircle2, CalendarClock } from "lucide-react";
import Link from "next/link";
import { NotificationType } from "@prisma/client";

interface NotificationItemProps {
    notification: Notification;
}

const getIcon = (type: NotificationType) => {
    switch (type) {
        case "INFO":
            return <Info className="h-4 w-4 text-blue-500" />;
        case "SUCCESS":
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case "WARNING":
            return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        case "ERROR":
            return <XCircle className="h-4 w-4 text-red-500" />;
        case "TASK_ASSIGNED":
        case "TASK_DUE":
            return <FileText className="h-4 w-4 text-orange-500" />;
        case "EVENT_REMINDER":
            return <CalendarClock className="h-4 w-4 text-violet-500" />;
        default:
            return <Bell className="h-4 w-4 text-gray-500" />;
    }
};

export function NotificationItem({ notification }: NotificationItemProps) {
    const { markAsRead, setIsOpen } = useNotificationStore();

    const handleMarkAsRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!notification.read) {
            markAsRead(notification.id);
            await markNotificationAsRead(notification.id);
        }
    };

    const handleClick = () => {
        if (!notification.read) {
            handleMarkAsRead({
                stopPropagation: () => { },
                preventDefault: () => { },
            } as React.MouseEvent);
        }
        setIsOpen(false);
    };

    const Content = (
        <div className={cn(
            "flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group",
            !notification.read && "bg-muted/30"
        )}>
            <div className="mt-1">
                {getIcon(notification.type)}
            </div>
            <div className="flex-1 space-y-1">
                <p className={cn("text-sm font-medium leading-none", !notification.read && "font-semibold")}>
                    {notification.title}
                </p>
                {notification.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message.replace(/\[[\w]+\]\s?/, '')}
                    </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
            </div>
            {!notification.read && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2"
                    onClick={handleMarkAsRead}
                    title="Mark as read"
                >
                    <Check className="h-3 w-3" />
                </Button>
            )}
            {!notification.read && (
                <div className="h-2 w-2 rounded-full bg-primary absolute right-4 top-1/2 -translate-y-1/2 group-hover:opacity-0 transition-opacity" />
            )}
        </div>
    );

    if (notification.link) {
        return (
            <Link href={notification.link} onClick={handleClick} className="block border-b last:border-0 hover:no-underline">
                {Content}
            </Link>
        );
    }

    return (
        <div onClick={handleClick} className="border-b last:border-0">
            {Content}
        </div>
    );
}
