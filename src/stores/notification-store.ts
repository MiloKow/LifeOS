import { create } from 'zustand';
import { Notification } from '@/features/notifications/actions/notification-actions';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;
    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void; // Optimistic update
    markAllAsRead: () => void; // Optimistic update
    setIsOpen: (isOpen: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    isOpen: false,
    setNotifications: (notifications) => set({
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
    }),
    addNotification: (notification) => set((state) => {
        const newNotifications = [notification, ...state.notifications];
        return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.read).length
        };
    }),
    markAsRead: (id) => set((state) => {
        const newNotifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        );
        return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.read).length
        };
    }),
    markAllAsRead: () => set((state) => {
        const newNotifications = state.notifications.map(n => ({ ...n, read: true }));
        return {
            notifications: newNotifications,
            unreadCount: 0
        };
    }),
    setIsOpen: (isOpen) => set({ isOpen }),
}));
