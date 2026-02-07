"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, addDays, isSameDay, startOfWeek } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { Event, Task, Project } from "@prisma/client";

type EventWithRelations = Event & {
    task: Pick<Task, "id" | "title" | "status"> | null;
    project: Pick<Project, "id" | "name" | "color"> | null;
};

interface CalendarPreviewProps {
    events: EventWithRelations[];
}

export function CalendarPreview({ events }: CalendarPreviewProps) {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const todayEvents = events.filter((e) => isSameDay(new Date(e.startTime), today));

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold">This Week</CardTitle>
                <Badge variant="secondary" className="font-normal">
                    {format(today, "MMMM yyyy")}
                </Badge>
            </CardHeader>
            <CardContent>
                {/* Week Days */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                    {weekDays.map((day) => {
                        const isToday = isSameDay(day, today);
                        const dayEvents = events.filter((e) => isSameDay(new Date(e.startTime), day));

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "flex flex-col items-center rounded-lg p-2 text-center transition-all",
                                    isToday
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                )}
                            >
                                <span className="text-xs font-medium uppercase">
                                    {format(day, "EEE")}
                                </span>
                                <span className={cn(
                                    "mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                                    isToday && "bg-primary-foreground text-primary"
                                )}>
                                    {format(day, "d")}
                                </span>
                                {dayEvents.length > 0 && (
                                    <div className="mt-1 flex gap-0.5">
                                        {dayEvents.slice(0, 3).map((event) => (
                                            <span
                                                key={event.id}
                                                className="h-1.5 w-1.5 rounded-full"
                                                style={{ backgroundColor: event.color || event.project?.color || "#6366f1" }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Today's Events */}
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                        Today&apos;s Events
                    </p>
                    {todayEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                            <CalendarIcon className="h-6 w-6 text-muted-foreground mb-2" />
                            <p className="text-xs text-muted-foreground">No events today</p>
                        </div>
                    ) : (
                        todayEvents.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-center gap-3 rounded-lg border border-border/50 p-2"
                            >
                                <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: event.color || event.project?.color || "#6366f1" }}
                                />
                                <span className="flex-1 text-sm font-medium">{event.title}</span>
                                <span className="text-xs text-muted-foreground">
                                    {format(new Date(event.startTime), "h:mm a")}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

