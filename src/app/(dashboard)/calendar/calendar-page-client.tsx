"use client";

import { useState } from "react";
import { CalendarView } from "@/features/calendar/components/calendar-view";
import { EventForm } from "@/features/calendar/components/event-form";
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
    company: { id: string; name: string };
};

interface CalendarPageClientProps {
    events: EventWithRelations[];
    tasks: TaskWithProject[];
    renewals: RenewalWithCompany[];
}

export function CalendarPageClient({ events, tasks, renewals }: CalendarPageClientProps) {
    const [showEventForm, setShowEventForm] = useState(false);

    return (
        <>
            <CalendarView events={events} tasks={tasks} renewals={renewals} onNewEvent={() => setShowEventForm(true)} />
            <EventForm open={showEventForm} onOpenChange={setShowEventForm} />
        </>
    );
}
