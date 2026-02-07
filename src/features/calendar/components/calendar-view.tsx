"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Event, Task, Project } from "@prisma/client";

type EventWithRelations = Event & {
    task: Pick<Task, "id" | "title" | "status"> | null;
    project: Pick<Project, "id" | "name" | "color"> | null;
};

interface CalendarViewProps {
    events: EventWithRelations[];
    onNewEvent?: () => void;
}

export function CalendarView({ events, onNewEvent }: CalendarViewProps) {
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
                            Today
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
                {onNewEvent && (
                    <Button onClick={onNewEvent} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Event
                    </Button>
                )}
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border/50">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
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
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);

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
                                {dayEvents.slice(0, 3).map((event) => (
                                    <div
                                        key={event.id}
                                        className={cn(
                                            "truncate rounded px-1.5 py-0.5 text-xs font-medium",
                                            event.isTimeBlock
                                                ? "bg-violet-500/20 text-violet-400"
                                                : "bg-primary/20 text-primary"
                                        )}
                                        style={
                                            event.color
                                                ? { backgroundColor: `${event.color}20`, color: event.color }
                                                : event.project?.color
                                                    ? { backgroundColor: `${event.project.color}20`, color: event.project.color }
                                                    : undefined
                                        }
                                    >
                                        {!event.allDay && (
                                            <span className="mr-1">
                                                {format(new Date(event.startTime), "HH:mm")}
                                            </span>
                                        )}
                                        {event.title}
                                    </div>
                                ))}
                                {dayEvents.length > 3 && (
                                    <div className="text-xs text-muted-foreground px-1.5">
                                        +{dayEvents.length - 3} more
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
