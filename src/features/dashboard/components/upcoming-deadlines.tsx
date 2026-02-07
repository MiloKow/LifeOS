"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCircle, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { Context } from "@prisma/client";

interface Deadline {
    id: string;
    title: string;
    dueDate: Date;
    type: "Task" | "Project" | "Event" | "Milestone";
    context: Context;
}

interface UpcomingDeadlinesProps {
    deadlines: Deadline[];
}

const contextColors: Record<Context, string> = {
    PERSONAL: "bg-emerald-500/10 text-emerald-500",
    PROFESSIONAL: "bg-violet-500/10 text-violet-500",
    COMPANY: "bg-amber-500/10 text-amber-500",
};

function getUrgencyClass(daysUntil: number): string {
    if (daysUntil <= 1) return "text-red-500";
    if (daysUntil <= 3) return "text-orange-500";
    if (daysUntil <= 7) return "text-yellow-500";
    return "text-muted-foreground";
}

export function UpcomingDeadlines({ deadlines }: UpcomingDeadlinesProps) {
    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold">Upcoming Deadlines</CardTitle>
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
                {deadlines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                    </div>
                ) : (
                    deadlines.slice(0, 4).map((deadline) => {
                        const daysUntil = differenceInDays(new Date(deadline.dueDate), new Date());
                        return (
                            <div
                                key={deadline.id}
                                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-muted/50"
                            >
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-lg",
                                    daysUntil <= 1 ? "bg-red-500/10" : "bg-muted"
                                )}>
                                    <Calendar className={cn("h-5 w-5", getUrgencyClass(daysUntil))} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{deadline.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={cn("text-xs font-medium", getUrgencyClass(daysUntil))}>
                                            {daysUntil === 0
                                                ? "Today"
                                                : daysUntil === 1
                                                    ? "Tomorrow"
                                                    : `${daysUntil} days left`}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(deadline.dueDate), "MMM d")}
                                        </span>
                                    </div>
                                </div>
                                <Badge className={cn("text-xs", contextColors[deadline.context])}>
                                    {deadline.context}
                                </Badge>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}

