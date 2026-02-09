"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, addDays, isSameDay, startOfWeek } from "date-fns";
import { Calendar as CalendarIcon, Building2, FolderKanban } from "lucide-react";
import type { Event, Task, Project, Company } from "@prisma/client";

type EventWithRelations = Event & {
    task: Pick<Task, "id" | "title" | "status"> | null;
    project: Pick<Project, "id" | "name" | "color"> | null;
    company: Pick<Company, "id" | "name"> | null;
};

interface CalendarPreviewProps {
    events: EventWithRelations[];
}

function getEventDotColor(event: EventWithRelations): string {
    if (event.color) return event.color;
    if (event.company) return "#10b981"; // emerald
    if (event.project?.color) return event.project.color;
    if (event.project) return "#8b5cf6"; // violet
    return "#6366f1"; // indigo (personal)
}

export function CalendarPreview({ events }: CalendarPreviewProps) {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const [selectedDay, setSelectedDay] = useState<Date>(today);

    const selectedDayEvents = events.filter((e) => isSameDay(new Date(e.startTime), selectedDay));
    const isSelectedToday = isSameDay(selectedDay, today);

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
                        const isSelected = isSameDay(day, selectedDay);
                        const dayEvents = events.filter((e) => isSameDay(new Date(e.startTime), day));

                        return (
                            <button
                                key={day.toISOString()}
                                type="button"
                                onClick={() => setSelectedDay(day)}
                                className={cn(
                                    "flex flex-col items-center rounded-lg p-2 text-center transition-all cursor-pointer",
                                    isSelected && isToday
                                        ? "bg-primary text-primary-foreground"
                                        : isSelected
                                            ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                            : isToday
                                                ? "bg-muted/80 text-foreground"
                                                : "hover:bg-muted"
                                )}
                            >
                                <span className="text-xs font-medium uppercase">
                                    {format(day, "EEE")}
                                </span>
                                <span className={cn(
                                    "mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                                    isSelected && isToday && "bg-primary-foreground text-primary",
                                    isSelected && !isToday && "bg-primary text-primary-foreground",
                                )}>
                                    {format(day, "d")}
                                </span>
                                {dayEvents.length > 0 && (
                                    <div className="mt-1 flex gap-0.5">
                                        {dayEvents.slice(0, 3).map((event) => (
                                            <span
                                                key={event.id}
                                                className="h-1.5 w-1.5 rounded-full"
                                                style={{ backgroundColor: getEventDotColor(event) }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Day Events */}
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                        {isSelectedToday
                            ? "Aujourd\u2019hui"
                            : format(selectedDay, "EEEE d MMMM")
                        }
                        {selectedDayEvents.length > 0 && (
                            <span className="ml-1 text-xs">({selectedDayEvents.length})</span>
                        )}
                    </p>
                    {selectedDayEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                            <CalendarIcon className="h-6 w-6 text-muted-foreground mb-2" />
                            <p className="text-xs text-muted-foreground">
                                Aucun événement {isSelectedToday ? "aujourd\u2019hui" : "ce jour"}
                            </p>
                        </div>
                    ) : (
                        selectedDayEvents.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-center gap-3 rounded-lg border border-border/50 p-2 transition-colors hover:bg-muted/50"
                            >
                                <div
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: getEventDotColor(event) }}
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium truncate block">{event.title}</span>
                                    {(event.project || event.company) && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            {event.company && (
                                                <>
                                                    <Building2 className="h-3 w-3" />
                                                    {event.company.name}
                                                </>
                                            )}
                                            {event.project && (
                                                <>
                                                    <FolderKanban className="h-3 w-3" />
                                                    {event.project.name}
                                                </>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {event.allDay
                                        ? "Journée"
                                        : format(new Date(event.startTime), "HH:mm")
                                    }
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
