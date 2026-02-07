"use client";

import { useState } from "react";
import { CalendarView } from "@/features/calendar/components/calendar-view";
import { EventForm } from "@/features/calendar/components/event-form";
import type { Event, Task, Project } from "@prisma/client";

type EventWithRelations = Event & {
    task: Pick<Task, "id" | "title" | "status"> | null;
    project: Pick<Project, "id" | "name" | "color"> | null;
};

interface CalendarPageClientProps {
    events: EventWithRelations[];
}

export function CalendarPageClient({ events }: CalendarPageClientProps) {
    const [showEventForm, setShowEventForm] = useState(false);

    return (
        <>
            <CalendarView events={events} onNewEvent={() => setShowEventForm(true)} />
            <EventForm open={showEventForm} onOpenChange={setShowEventForm} />
        </>
    );
}
