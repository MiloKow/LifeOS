"use client";

import { useState } from "react";
import { CalendarView } from "@/features/calendar/components/calendar-view";
import { EventForm } from "@/features/calendar/components/event-form";
import { SubscriptionForm } from "@/features/calendar/components/subscription-form";
import type { Event, Task, Project, Company } from "@prisma/client";

type EventWithRelations = Event & {
    task: Pick<Task, "id" | "title" | "status"> | null;
    project: Pick<Project, "id" | "name" | "color"> | null;
    company: Pick<Company, "id" | "name"> | null;
};

type TaskWithProject = Task & {
    project: Pick<Project, "id" | "name" | "color"> | null;
};

type RenewalWithCompany = {
    id: string;
    name: string;
    amount: any;
    renewalDate: Date | null;
    company: { id: string; name: string } | null;
};

interface CalendarPageClientProps {
    events: EventWithRelations[];
    tasks: TaskWithProject[];
    renewals: RenewalWithCompany[];
}

export function CalendarPageClient({ events, tasks, renewals }: CalendarPageClientProps) {
    const [showEventForm, setShowEventForm] = useState(false);
    const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventWithRelations | null>(null);

    function handleNewEvent() {
        setEditingEvent(null);
        setShowEventForm(true);
    }

    function handleEditEvent(event: EventWithRelations) {
        setEditingEvent(event);
        setShowEventForm(true);
    }

    function handleEventFormChange(open: boolean) {
        setShowEventForm(open);
        if (!open) {
            setEditingEvent(null);
        }
    }

    return (
        <>
            <CalendarView
                events={events}
                tasks={tasks}
                renewals={renewals}
                onNewEvent={handleNewEvent}
                onNewSubscription={() => setShowSubscriptionForm(true)}
                onEditEvent={handleEditEvent}
            />
            <EventForm
                key={editingEvent?.id || "new"}
                open={showEventForm}
                onOpenChange={handleEventFormChange}
                event={editingEvent || undefined}
            />
            <SubscriptionForm open={showSubscriptionForm} onOpenChange={setShowSubscriptionForm} />
        </>
    );
}
