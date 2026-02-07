"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Circle,
    Clock,
    Edit,
    FolderKanban,
    ListTodo,
    MoreHorizontal,
    Plus,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTask } from "@/features/tasks/actions/task-actions";
import { updateProject, deleteProject } from "@/features/projects/actions/project-actions";
import type { Project, Task, Milestone, Tag, Note, TimeEntry, TaskStatus, Priority, ProjectStatus } from "@prisma/client";

type ProjectWithDetails = Project & {
    tasks: Task[];
    milestones: Milestone[];
    tags: Tag[];
    notes: Note[];
    timeEntries: TimeEntry[];
    progress: number;
    totalTasks: number;
    completedTasks: number;
};

interface ProjectDetailClientProps {
    project: ProjectWithDetails;
}

const statusColors: Record<string, string> = {
    PLANNING: "bg-blue-500/20 text-blue-500",
    ACTIVE: "bg-green-500/20 text-green-500",
    ON_HOLD: "bg-yellow-500/20 text-yellow-500",
    COMPLETED: "bg-purple-500/20 text-purple-500",
    ARCHIVED: "bg-gray-500/20 text-gray-500",
};

const priorityColors: Record<Priority, string> = {
    LOW: "text-gray-500",
    MEDIUM: "text-blue-500",
    HIGH: "text-orange-500",
    URGENT: "text-red-500",
};

const taskStatusIcons: Record<TaskStatus, React.ReactNode> = {
    TODO: <Circle className="h-4 w-4 text-muted-foreground" />,
    IN_PROGRESS: <Clock className="h-4 w-4 text-blue-500" />,
    DONE: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    BLOCKED: <Circle className="h-4 w-4 text-red-500" />,
};

export function ProjectDetailClient({ project }: ProjectDetailClientProps) {
    const router = useRouter();
    const totalMinutes = project.timeEntries.reduce((acc, e) => acc + (e.duration || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    // Add Task dialog state
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [taskPriority, setTaskPriority] = useState<Priority>("MEDIUM");
    const [taskDueDate, setTaskDueDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Project dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const [projectDescription, setProjectDescription] = useState(project.description || "");
    const [projectStatus, setProjectStatus] = useState<ProjectStatus>(project.status);

    async function handleAddTask() {
        if (!taskTitle.trim()) return;
        setIsSubmitting(true);

        await createTask({
            title: taskTitle.trim(),
            description: taskDescription.trim() || undefined,
            priority: taskPriority,
            projectId: project.id,
            dueDate: taskDueDate ? new Date(taskDueDate) : undefined,
        });

        setTaskTitle("");
        setTaskDescription("");
        setTaskPriority("MEDIUM");
        setTaskDueDate("");
        setTaskDialogOpen(false);
        setIsSubmitting(false);
        router.refresh();
    }

    async function handleUpdateProject() {
        if (!projectName.trim()) return;
        setIsSubmitting(true);

        await updateProject(project.id, {
            name: projectName.trim(),
            description: projectDescription.trim() || undefined,
            status: projectStatus,
        });

        setEditDialogOpen(false);
        setIsSubmitting(false);
        router.refresh();
    }

    async function handleDeleteProject() {
        if (!confirm("Are you sure you want to delete this project?")) return;

        await deleteProject(project.id);
        router.push("/projects");
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Link href="/projects">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <div
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: `${project.color || '#6366f1'}20` }}
                            >
                                <FolderKanban
                                    className="h-5 w-5"
                                    style={{ color: project.color || '#6366f1' }}
                                />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{project.name}</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge className={cn("text-xs", statusColors[project.status])}>
                                        {project.status.replace("_", " ")}
                                    </Badge>
                                    {project.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {project.description && (
                            <p className="text-muted-foreground mt-3 ml-12">{project.description}</p>
                        )}
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={handleDeleteProject}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Project
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <ListTodo className="h-4 w-4" />
                        Progress
                    </div>
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium">{project.progress}%</span>
                            <span className="text-muted-foreground">
                                {project.completedTasks}/{project.totalTasks} tasks
                            </span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                    </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Clock className="h-4 w-4" />
                        Time Tracked
                    </div>
                    <p className="mt-2 text-2xl font-bold">{totalHours}h</p>
                </div>

                <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4" />
                        Start Date
                    </div>
                    <p className="mt-2 text-lg font-medium">
                        {project.startDate
                            ? format(new Date(project.startDate), "MMM d, yyyy")
                            : "Not set"}
                    </p>
                </div>

                <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4" />
                        Due Date
                    </div>
                    <p className="mt-2 text-lg font-medium">
                        {project.endDate
                            ? format(new Date(project.endDate), "MMM d, yyyy")
                            : "Not set"}
                    </p>
                </div>
            </div>

            {/* Tasks */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Tasks</h2>
                    <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Task
                    </Button>
                </div>

                {project.tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No tasks yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {project.tasks.map((task) => (
                            <Link
                                key={task.id}
                                href={`/tasks?taskId=${task.id}`}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                            >
                                {taskStatusIcons[task.status]}
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "font-medium truncate",
                                        task.status === "DONE" && "line-through text-muted-foreground"
                                    )}>
                                        {task.title}
                                    </p>
                                    {task.dueDate && (
                                        <p className="text-xs text-muted-foreground">
                                            Due {format(new Date(task.dueDate), "MMM d")}
                                        </p>
                                    )}
                                </div>
                                <span className={cn("text-xs", priorityColors[task.priority])}>
                                    {task.priority}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Milestones */}
            {project.milestones.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                    <h2 className="text-lg font-semibold mb-4">Milestones</h2>
                    <div className="space-y-3">
                        {project.milestones.map((milestone) => (
                            <div
                                key={milestone.id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border/50"
                            >
                                {milestone.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div className="flex-1">
                                    <p className={cn(
                                        "font-medium",
                                        milestone.completed && "line-through text-muted-foreground"
                                    )}>
                                        {milestone.title}
                                    </p>
                                    {milestone.dueDate && (
                                        <p className="text-xs text-muted-foreground">
                                            Due {format(new Date(milestone.dueDate), "MMM d, yyyy")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Notes */}
            {project.notes.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                    <h2 className="text-lg font-semibold mb-4">Recent Notes</h2>
                    <div className="space-y-3">
                        {project.notes.slice(0, 5).map((note) => (
                            <Link
                                key={note.id}
                                href={`/notes?noteId=${note.id}`}
                                className="block p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                            >
                                <p className="font-medium">{note.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                    {note.content.slice(0, 150)}...
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {format(new Date(note.updatedAt), "MMM d, yyyy")}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Task Dialog */}
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Task to {project.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="taskTitle">Title</Label>
                            <Input
                                id="taskTitle"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                placeholder="Task title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taskDescription">Description (optional)</Label>
                            <Textarea
                                id="taskDescription"
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                placeholder="Task description"
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as Priority)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taskDueDate">Due Date (optional)</Label>
                            <Input
                                id="taskDueDate"
                                type="date"
                                value={taskDueDate}
                                onChange={(e) => setTaskDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddTask} disabled={!taskTitle.trim() || isSubmitting}>
                            {isSubmitting ? "Adding..." : "Add Task"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Project Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="projectName">Name</Label>
                            <Input
                                id="projectName"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="Project name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="projectDesc">Description</Label>
                            <Textarea
                                id="projectDesc"
                                value={projectDescription}
                                onChange={(e) => setProjectDescription(e.target.value)}
                                placeholder="Project description"
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={projectStatus} onValueChange={(v) => setProjectStatus(v as ProjectStatus)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PLANNING">Planning</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateProject} disabled={!projectName.trim() || isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
