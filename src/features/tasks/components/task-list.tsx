"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar, Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toggleTaskStatus, deleteTask } from "@/features/tasks/actions/task-actions";
import { TaskForm } from "./task-form";
import { TaskNoteButton } from "./task-note-button";
import type { Task, Project } from "@prisma/client";

type TaskWithProject = Task & {
    project: Pick<Project, "id" | "name" | "color"> | null;
};

interface TaskListProps {
    tasks: TaskWithProject[];
}

const priorityColors = {
    LOW: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    MEDIUM: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    URGENT: "bg-red-500/10 text-red-500 border-red-500/20",
};

const statusColors = {
    TODO: "bg-slate-500/10 text-slate-500",
    IN_PROGRESS: "bg-blue-500/10 text-blue-500",
    DONE: "bg-emerald-500/10 text-emerald-500",
    BLOCKED: "bg-red-500/10 text-red-500",
};

const contextColors = {
    PERSONAL: "bg-emerald-500/10 text-emerald-500",
    PROFESSIONAL: "bg-violet-500/10 text-violet-500",
    COMPANY: "bg-amber-500/10 text-amber-500",
};

export function TaskList({ tasks }: TaskListProps) {
    const [editTask, setEditTask] = useState<Task | null>(null);

    async function handleToggle(taskId: string) {
        await toggleTaskStatus(taskId);
    }

    async function handleDelete(taskId: string) {
        await deleteTask(taskId);
    }

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No tasks yet</h3>
                <p className="text-muted-foreground mt-1">
                    Create your first task to get started
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-2">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className={cn(
                            "flex items-start gap-4 rounded-lg border border-border/50 bg-card/50 p-4 transition-all hover:bg-muted/50",
                            task.status === "DONE" && "opacity-60"
                        )}
                    >
                        <Checkbox
                            checked={task.status === "DONE"}
                            onCheckedChange={() => handleToggle(task.id)}
                            className="h-5 w-5 rounded-full mt-1 sm:mt-0"
                        />

                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p
                                        className={cn(
                                            "font-medium truncate",
                                            task.status === "DONE" && "line-through text-muted-foreground"
                                        )}
                                    >
                                        {task.title}
                                    </p>
                                    {task.project && (
                                        <span
                                            className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                                            style={{
                                                backgroundColor: `${task.project.color || '#6366f1'}20`,
                                                color: task.project.color || '#6366f1',
                                            }}
                                        >
                                            {task.project.name}
                                        </span>
                                    )}
                                </div>

                                {task.description && (
                                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                                        {task.description}
                                    </p>
                                )}

                                {task.dueDate && (
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(task.dueDate), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto min-w-0">
                                <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1 sm:flex-initial">
                                    <Badge
                                        variant="outline"
                                        className={cn("text-xs whitespace-nowrap", priorityColors[task.priority])}
                                    >
                                        {task.priority}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className={cn("text-xs whitespace-nowrap", contextColors[task.context])}
                                    >
                                        {task.context}
                                    </Badge>
                                    <Badge className={cn("text-xs whitespace-nowrap", statusColors[task.status])}>
                                        {task.status.replace("_", " ")}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {task.project && (
                                        <TaskNoteButton
                                            taskId={task.id}
                                            projectId={task.project.id}
                                            taskTitle={task.title}
                                            projectName={task.project.name}
                                        />
                                    )}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setEditTask(task)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => handleDelete(task.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editTask && (
                <TaskForm
                    open={!!editTask}
                    onOpenChange={(open) => !open && setEditTask(null)}
                    task={editTask}
                />
            )}
        </>
    );
}
