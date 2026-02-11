"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Circle, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import confetti from "canvas-confetti";
import { toggleTaskStatus } from "@/features/tasks/actions/task-actions";
import type { Task, Project, Priority } from "@prisma/client";

type TaskWithProject = Task & {
    project: Pick<Project, "id" | "name" | "color"> | null;
};

interface TodayTasksProps {
    tasks: TaskWithProject[];
}

const priorityColors: Record<Priority, string> = {
    LOW: "bg-slate-500/10 text-slate-500",
    MEDIUM: "bg-blue-500/10 text-blue-500",
    HIGH: "bg-orange-500/10 text-orange-500",
    URGENT: "bg-red-500/10 text-red-500",
};

export function TodayTasks({ tasks }: TodayTasksProps) {
    const remainingTasks = tasks.filter(t => t.status !== "DONE").length;

    async function handleToggle(taskId: string) {
        const task = tasks.find((t) => t.id === taskId);
        if (task && task.status !== "DONE") {
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
            const particleCount = 50;
            confetti({
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                ...defaults,
                particleCount,
            });
            confetti({
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                ...defaults,
                particleCount,
            });
        }
        await toggleTaskStatus(taskId);
    }

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold">Today&apos;s Tasks</CardTitle>
                <Badge variant="secondary" className="font-normal">
                    {remainingTasks} remaining
                </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No tasks due today</p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className={cn(
                                "flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-muted/50",
                                task.status === "DONE" && "opacity-50"
                            )}
                        >
                            <Checkbox
                                checked={task.status === "DONE"}
                                onCheckedChange={() => handleToggle(task.id)}
                                className="h-5 w-5 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "font-medium truncate",
                                    task.status === "DONE" && "line-through text-muted-foreground"
                                )}>
                                    {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {task.project && (
                                        <span className="text-xs text-muted-foreground">{task.project.name}</span>
                                    )}
                                    {task.dueDate && (() => {
                                        const dueDate = new Date(task.dueDate);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const isOverdue = dueDate < today && task.status !== "DONE";
                                        const isToday = dueDate.toDateString() === new Date().toDateString();

                                        return (
                                            <>
                                                {task.project && <Circle className="h-1 w-1 fill-muted-foreground text-muted-foreground" />}
                                                {isOverdue ? (
                                                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                                        Overdue • {format(dueDate, "MMM d")}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {isToday ? format(dueDate, "h:mm a") : format(dueDate, "MMM d")}
                                                    </span>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                            <Badge className={cn("text-xs", priorityColors[task.priority])}>
                                {task.priority}
                            </Badge>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

