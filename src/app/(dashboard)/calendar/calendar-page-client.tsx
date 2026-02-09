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

    return (
        <>
            <CalendarView
                events={events}
                tasks={tasks}
                renewals={renewals}
                onNewEvent={() => setShowEventForm(true)}
                onNewSubscription={() => setShowSubscriptionForm(true)}
            />
            <EventForm open={showEventForm} onOpenChange={setShowEventForm} />
            <SubscriptionForm open={showSubscriptionForm} onOpenChange={setShowSubscriptionForm} />
        </>
    );
}
