"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, RefreshCw, Building2, FolderKanban, User } from "lucide-react";
import { EventNoteButton } from "./event-note-button";
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

interface CalendarViewProps {
    events: EventWithRelations[];
    tasks?: TaskWithProject[];
    renewals?: RenewalWithCompany[];
    onNewEvent?: () => void;
    onNewSubscription?: () => void;
}

// Couleurs par type de lien
const EVENT_COLORS = {
    personal: { bg: "bg-primary/20", text: "text-primary", color: "#6366f1" },
    project: { bg: "bg-violet-500/20", text: "text-violet-400", color: "#8b5cf6" },
    company: { bg: "bg-emerald-500/20", text: "text-emerald-400", color: "#10b981" },
    timeBlock: { bg: "bg-violet-500/20", text: "text-violet-400", color: "#8b5cf6" },
};

function getEventStyle(event: EventWithRelations) {
    if (event.isTimeBlock) {
        return EVENT_COLORS.timeBlock;
    }
    if (event.color) {
        return { bg: "", text: "", color: event.color };
    }
    if (event.project?.color) {
        return { bg: "", text: "", color: event.project.color };
    }
    if (event.company) {
        return EVENT_COLORS.company;
    }
    if (event.project) {
        return EVENT_COLORS.project;
    }
    return EVENT_COLORS.personal;
}

function getEventLabel(event: EventWithRelations): string | null {
    if (event.company) return event.company.name;
    if (event.project) return event.project.name;
    return null;
}

export function CalendarView({ events, tasks = [], renewals = [], onNewEvent, onNewSubscription }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    function getEventsForDay(day: Date) {
        return events.filter((event) =>
            isSameDay(new Date(event.startTime), day)
        );
    }

    function getTasksForDay(day: Date) {
        return tasks.filter((task) =>
            task.dueDate && isSameDay(new Date(task.dueDate), day)
        );
    }

    function getRenewalsForDay(day: Date) {
        return renewals.filter((renewal) =>
            renewal.renewalDate && isSameDay(new Date(renewal.renewalDate), day)
        );
    }

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">
                        {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentDate(new Date())}
                        >
                            Aujourd&apos;hui
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Legend */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="w-2 h-2 rounded bg-primary"></span>
                            Personnel
                        </span>
                        <span className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            <span className="w-2 h-2 rounded bg-violet-500"></span>
                            Projet
                        </span>
                        <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span className="w-2 h-2 rounded bg-emerald-500"></span>
                            Entreprise
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded bg-orange-500"></span>
                            Tâches
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded bg-amber-500"></span>
                            Renouvellements
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {onNewSubscription && (
                            <Button onClick={onNewSubscription} size="sm" variant="outline" className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Abonnement
                            </Button>
                        )}
                        {onNewEvent && (
                            <Button onClick={onNewEvent} size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Événement
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border/50">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                    <div
                        key={day}
                        className="p-3 text-center text-sm font-medium text-muted-foreground"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {days.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    const dayTasks = getTasksForDay(day);
                    const dayRenewals = getRenewalsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const allItems = [
                        ...dayEvents.map(e => ({ type: 'event' as const, item: e })),
                        ...dayTasks.map(t => ({ type: 'task' as const, item: t })),
                        ...dayRenewals.map(r => ({ type: 'renewal' as const, item: r })),
                    ];

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "min-h-[120px] border-b border-r border-border/30 p-2 transition-colors",
                                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                                index % 7 === 6 && "border-r-0"
                            )}
                        >
                            <div
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                                    isToday && "bg-primary text-primary-foreground font-semibold"
                                )}
                            >
                                {format(day, "d")}
                            </div>

                            <div className="mt-1 space-y-1">
                                {allItems.slice(0, 3).map((entry, idx) => {
                                    if (entry.type === 'event') {
                                        const event = entry.item as EventWithRelations;
                                        const style = getEventStyle(event);
                                        const label = getEventLabel(event);
                                        const hasCustomColor = !!style.color && !style.bg;

                                        return (
                                            <div
                                                key={`event-${event.id}`}
                                                className={cn(
                                                    "group truncate rounded px-1.5 py-0.5 text-xs font-medium flex items-center gap-1",
                                                    !hasCustomColor && style.bg,
                                                    !hasCustomColor && style.text
                                                )}
                                                style={
                                                    hasCustomColor
                                                        ? { backgroundColor: `${style.color}20`, color: style.color }
                                                        : undefined
                                                }
                                                title={label ? `${event.title} (${label})` : event.title}
                                            >
                                                <span className="truncate flex-1">
                                                    {!event.allDay && (
                                                        <span className="mr-1">
                                                            {format(new Date(event.startTime), "HH:mm")}
                                                        </span>
                                                    )}
                                                    {event.title}
                                                </span>
                                                <EventNoteButton
                                                    eventId={event.id}
                                                    eventTitle={event.title}
                                                    projectId={event.project?.id}
                                                    projectName={event.project?.name}
                                                    companyId={event.company?.id}
                                                    companyName={event.company?.name}
                                                    size="sm"
                                                />
                                            </div>
                                        );
                                    } else if (entry.type === 'task') {
                                        const task = entry.item as TaskWithProject;
                                        const isDone = task.status === "DONE";
                                        return (
                                            <div
                                                key={`task-${task.id}`}
                                                className={cn(
                                                    "truncate rounded px-1.5 py-0.5 text-xs font-medium flex items-center gap-1",
                                                    isDone
                                                        ? "bg-green-500/20 text-green-500 line-through"
                                                        : "bg-orange-500/20 text-orange-500"
                                                )}
                                                style={
                                                    task.project?.color
                                                        ? { backgroundColor: `${task.project.color}20`, color: task.project.color }
                                                        : undefined
                                                }
                                            >
                                                {isDone ? (
                                                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                                                ) : (
                                                    <Circle className="h-3 w-3 shrink-0" />
                                                )}
                                                <span className="truncate">{task.title}</span>
                                            </div>
                                        );
                                    } else {
                                        const renewal = entry.item as RenewalWithCompany;
                                        return (
                                            <div
                                                key={`renewal-${renewal.id}`}
                                                className="truncate rounded px-1.5 py-0.5 text-xs font-medium flex items-center gap-1 bg-amber-500/20 text-amber-500"
                                            >
                                                <RefreshCw className="h-3 w-3 shrink-0" />
                                                <span className="truncate">€{Number(renewal.amount)} {renewal.name}</span>
                                            </div>
                                        );
                                    }
                                })}
                                {allItems.length > 3 && (
                                    <div className="text-xs text-muted-foreground px-1.5">
                                        +{allItems.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
