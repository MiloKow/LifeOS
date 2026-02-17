"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, eachHourOfInterval, startOfDay, endOfDay, differenceInMinutes, isBefore, isAfter, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, RefreshCw, Building2, FolderKanban, User, CalendarDays, CalendarRange, Pencil } from "lucide-react";
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

type ViewMode = "month" | "week";

interface CalendarViewProps {
    events: EventWithRelations[];
    tasks?: TaskWithProject[];
    renewals?: RenewalWithCompany[];
    onNewEvent?: () => void;
    onNewSubscription?: () => void;
    onEditEvent?: (event: EventWithRelations) => void;
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

function getEventColor(event: EventWithRelations): string {
    const style = getEventStyle(event);
    return style.color;
}

// Hours to show in week view (7:00 - 23:00)
const WEEK_VIEW_START_HOUR = 7;
const WEEK_VIEW_END_HOUR = 23;
const HOUR_HEIGHT = 60; // px per hour

export function CalendarView({ events, tasks = [], renewals = [], onNewEvent, onNewSubscription, onEditEvent }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("month");

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Week view dates
    const weekViewStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekViewStart, i));

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

    function navigatePrev() {
        if (viewMode === "month") {
            setCurrentDate(subMonths(currentDate, 1));
        } else {
            setCurrentDate(subWeeks(currentDate, 1));
        }
    }

    function navigateNext() {
        if (viewMode === "month") {
            setCurrentDate(addMonths(currentDate, 1));
        } else {
            setCurrentDate(addWeeks(currentDate, 1));
        }
    }

    function goToToday() {
        setCurrentDate(new Date());
    }

    function getHeaderTitle() {
        if (viewMode === "month") {
            return format(currentDate, "MMMM yyyy", { locale: fr });
        }
        const weekEnd = addDays(weekViewStart, 6);
        if (weekViewStart.getMonth() === weekEnd.getMonth()) {
            return `${format(weekViewStart, "d")} - ${format(weekEnd, "d MMMM yyyy", { locale: fr })}`;
        }
        return `${format(weekViewStart, "d MMM", { locale: fr })} - ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
    }

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold capitalize">
                        {getHeaderTitle()}
                    </h2>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={navigatePrev}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToToday}
                        >
                            Aujourd&apos;hui
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={navigateNext}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    {/* View Mode Toggle */}
                    <div className="flex items-center rounded-lg border border-border/50 p-0.5">
                        <Button
                            variant={viewMode === "month" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => setViewMode("month")}
                        >
                            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                            Mois
                        </Button>
                        <Button
                            variant={viewMode === "week" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => setViewMode("week")}
                        >
                            <CalendarRange className="mr-1.5 h-3.5 w-3.5" />
                            Semaine
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Legend */}
                    <div className="hidden xl:flex items-center gap-3 text-xs text-muted-foreground">
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

            {viewMode === "month" ? (
                <MonthView
                    days={days}
                    currentDate={currentDate}
                    events={events}
                    tasks={tasks}
                    renewals={renewals}
                    getEventsForDay={getEventsForDay}
                    getTasksForDay={getTasksForDay}
                    getRenewalsForDay={getRenewalsForDay}
                    onEditEvent={onEditEvent}
                />
            ) : (
                <WeekView
                    weekDays={weekDays}
                    events={events}
                    tasks={tasks}
                    renewals={renewals}
                    getEventsForDay={getEventsForDay}
                    getTasksForDay={getTasksForDay}
                    getRenewalsForDay={getRenewalsForDay}
                    onEditEvent={onEditEvent}
                />
            )}
        </div>
    );
}

// ============ MONTH VIEW ============

interface MonthViewProps {
    days: Date[];
    currentDate: Date;
    events: EventWithRelations[];
    tasks: TaskWithProject[];
    renewals: RenewalWithCompany[];
    getEventsForDay: (day: Date) => EventWithRelations[];
    getTasksForDay: (day: Date) => TaskWithProject[];
    getRenewalsForDay: (day: Date) => RenewalWithCompany[];
    onEditEvent?: (event: EventWithRelations) => void;
}

function MonthView({ days, currentDate, getEventsForDay, getTasksForDay, getRenewalsForDay, onEditEvent }: MonthViewProps) {
    return (
        <>
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
                                                    "group truncate rounded px-1.5 py-0.5 text-xs font-medium flex items-center gap-1 cursor-pointer hover:ring-1 hover:ring-white/30 transition-all",
                                                    !hasCustomColor && style.bg,
                                                    !hasCustomColor && style.text
                                                )}
                                                style={
                                                    hasCustomColor
                                                        ? { backgroundColor: `${style.color}20`, color: style.color }
                                                        : undefined
                                                }
                                                title={label ? `${event.title} (${label})` : event.title}
                                                onClick={() => onEditEvent?.(event)}
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
        </>
    );
}

// ============ WEEK VIEW ============

interface WeekViewProps {
    weekDays: Date[];
    events: EventWithRelations[];
    tasks: TaskWithProject[];
    renewals: RenewalWithCompany[];
    getEventsForDay: (day: Date) => EventWithRelations[];
    getTasksForDay: (day: Date) => TaskWithProject[];
    getRenewalsForDay: (day: Date) => RenewalWithCompany[];
    onEditEvent?: (event: EventWithRelations) => void;
}

function WeekView({ weekDays, getEventsForDay, getTasksForDay, getRenewalsForDay, onEditEvent }: WeekViewProps) {
    const hours = Array.from(
        { length: WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR },
        (_, i) => WEEK_VIEW_START_HOUR + i
    );
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Check if "now" falls within this week view
    const isCurrentWeek = weekDays.some(d => isSameDay(d, now));

    return (
        <div className="flex flex-col">
            {/* All-day events row */}
            <div className="flex border-b border-border/50">
                <div className="w-16 shrink-0 border-r border-border/30 p-2">
                    <span className="text-[10px] text-muted-foreground">Journée</span>
                </div>
                <div className="grid grid-cols-7 flex-1">
                    {weekDays.map((day) => {
                        const dayEvents = getEventsForDay(day).filter(e => e.allDay);
                        const dayTasks = getTasksForDay(day);
                        const dayRenewals = getRenewalsForDay(day);
                        return (
                            <div key={day.toISOString()} className="border-r border-border/30 last:border-r-0 p-1 min-h-[32px]">
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer hover:ring-1 hover:ring-white/30 transition-all mb-0.5"
                                        style={{
                                            backgroundColor: `${getEventColor(event)}25`,
                                            color: getEventColor(event),
                                        }}
                                        onClick={() => onEditEvent?.(event)}
                                        title={event.title}
                                    >
                                        {event.title}
                                    </div>
                                ))}
                                {dayTasks.map(task => {
                                    const isDone = task.status === "DONE";
                                    return (
                                        <div
                                            key={`task-${task.id}`}
                                            className={cn(
                                                "truncate rounded px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-0.5 mb-0.5",
                                                isDone ? "bg-green-500/20 text-green-500 line-through" : "bg-orange-500/20 text-orange-500"
                                            )}
                                        >
                                            {isDone ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> : <Circle className="h-2.5 w-2.5 shrink-0" />}
                                            <span className="truncate">{task.title}</span>
                                        </div>
                                    );
                                })}
                                {dayRenewals.map(renewal => (
                                    <div
                                        key={`renewal-${renewal.id}`}
                                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-0.5 bg-amber-500/20 text-amber-500 mb-0.5"
                                    >
                                        <RefreshCw className="h-2.5 w-2.5 shrink-0" />
                                        <span className="truncate">€{Number(renewal.amount)} {renewal.name}</span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Day Headers */}
            <div className="flex border-b border-border/50 sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                <div className="w-16 shrink-0 border-r border-border/30" />
                <div className="grid grid-cols-7 flex-1">
                    {weekDays.map((day) => {
                        const isToday = isSameDay(day, now);
                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "border-r border-border/30 last:border-r-0 p-2 text-center",
                                    isToday && "bg-primary/5"
                                )}
                            >
                                <div className="text-xs font-medium text-muted-foreground uppercase">
                                    {format(day, "EEE", { locale: fr })}
                                </div>
                                <div className={cn(
                                    "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold mx-auto",
                                    isToday && "bg-primary text-primary-foreground"
                                )}>
                                    {format(day, "d")}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Time Grid */}
            <div className="flex overflow-y-auto max-h-[600px] relative">
                {/* Hour labels */}
                <div className="w-16 shrink-0 border-r border-border/30">
                    {hours.map((hour) => (
                        <div
                            key={hour}
                            className="relative"
                            style={{ height: `${HOUR_HEIGHT}px` }}
                        >
                            <span className="absolute -top-2.5 right-2 text-[10px] text-muted-foreground font-medium">
                                {String(hour).padStart(2, "0")}:00
                            </span>
                        </div>
                    ))}
                </div>

                {/* Day columns */}
                <div className="grid grid-cols-7 flex-1 relative">
                    {weekDays.map((day) => {
                        const dayEvents = getEventsForDay(day).filter(e => !e.allDay);
                        const isToday = isSameDay(day, now);

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "relative border-r border-border/30 last:border-r-0",
                                    isToday && "bg-primary/[0.02]"
                                )}
                            >
                                {/* Hour grid lines */}
                                {hours.map((hour) => (
                                    <div
                                        key={hour}
                                        className="border-b border-border/20"
                                        style={{ height: `${HOUR_HEIGHT}px` }}
                                    >
                                        {/* Half-hour line */}
                                        <div
                                            className="border-b border-border/10"
                                            style={{ height: `${HOUR_HEIGHT / 2}px` }}
                                        />
                                    </div>
                                ))}

                                {/* Current time indicator */}
                                {isToday && isCurrentWeek && currentHour >= WEEK_VIEW_START_HOUR && currentHour < WEEK_VIEW_END_HOUR && (
                                    <div
                                        className="absolute left-0 right-0 z-20 pointer-events-none"
                                        style={{
                                            top: `${(currentHour - WEEK_VIEW_START_HOUR) * HOUR_HEIGHT + (currentMinute / 60) * HOUR_HEIGHT}px`,
                                        }}
                                    >
                                        <div className="flex items-center">
                                            <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
                                            <div className="flex-1 h-[2px] bg-red-500" />
                                        </div>
                                    </div>
                                )}

                                {/* Events */}
                                {dayEvents.map((event) => {
                                    const eventStart = new Date(event.startTime);
                                    const eventEnd = new Date(event.endTime);

                                    const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
                                    const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;

                                    const clampedStart = Math.max(startHour, WEEK_VIEW_START_HOUR);
                                    const clampedEnd = Math.min(endHour, WEEK_VIEW_END_HOUR);

                                    if (clampedEnd <= clampedStart) return null;

                                    const top = (clampedStart - WEEK_VIEW_START_HOUR) * HOUR_HEIGHT;
                                    const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 20);
                                    const color = getEventColor(event);
                                    const label = getEventLabel(event);

                                    return (
                                        <div
                                            key={event.id}
                                            className="absolute left-0.5 right-0.5 z-10 rounded-md overflow-hidden cursor-pointer group/event transition-all hover:ring-2 hover:ring-white/20 hover:shadow-lg"
                                            style={{
                                                top: `${top}px`,
                                                height: `${height}px`,
                                                backgroundColor: `${color}20`,
                                                borderLeft: `3px solid ${color}`,
                                            }}
                                            onClick={() => onEditEvent?.(event)}
                                            title={`${event.title}${label ? ` (${label})` : ''}\n${format(eventStart, "HH:mm")} - ${format(eventEnd, "HH:mm")}`}
                                        >
                                            <div className="p-1 h-full flex flex-col overflow-hidden">
                                                <div className="flex items-start justify-between gap-0.5">
                                                    <span
                                                        className="text-[11px] font-semibold truncate leading-tight"
                                                        style={{ color }}
                                                    >
                                                        {event.title}
                                                    </span>
                                                    <Pencil
                                                        className="h-3 w-3 shrink-0 opacity-0 group-hover/event:opacity-70 transition-opacity mt-0.5"
                                                        style={{ color }}
                                                    />
                                                </div>
                                                <span
                                                    className="text-[10px] opacity-75 leading-tight"
                                                    style={{ color }}
                                                >
                                                    {format(eventStart, "HH:mm")} - {format(eventEnd, "HH:mm")}
                                                </span>
                                                {label && height > 40 && (
                                                    <span
                                                        className="text-[9px] opacity-60 truncate mt-0.5"
                                                        style={{ color }}
                                                    >
                                                        {label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
