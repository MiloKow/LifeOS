import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar, FolderKanban, MoreHorizontal, CheckCircle2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteProject } from "@/features/projects/actions/project-actions";
import type { Project, Tag } from "@prisma/client";

type ProjectWithMeta = Project & {
    progress: number;
    totalTasks: number;
    completedTasks: number;
    tags: Tag[];
};

interface ProjectCardProps {
    project: ProjectWithMeta;
}

const statusColors = {
    PLANNING: "bg-slate-500/10 text-slate-500",
    ACTIVE: "bg-emerald-500/10 text-emerald-500",
    ON_HOLD: "bg-amber-500/10 text-amber-500",
    COMPLETED: "bg-blue-500/10 text-blue-500",
    ARCHIVED: "bg-zinc-500/10 text-zinc-500",
};

const contextLabels = {
    PERSONAL: "Personal",
    PROFESSIONAL: "Epitech",
    COMPANY: "Company",
};

export function ProjectCard({ project }: ProjectCardProps) {
    async function handleDelete() {
        await deleteProject(project.id);
    }

    return (
        <div className="group rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${project.color || '#6366f1'}20` }}
                    >
                        <FolderKanban
                            className="h-6 w-6"
                            style={{ color: project.color || '#6366f1' }}
                        />
                    </div>
                    <div>
                        <Link
                            href={`/projects/${project.id}`}
                            className="font-semibold hover:underline"
                        >
                            {project.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={cn("text-xs", statusColors[project.status])}>
                                {project.status.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {contextLabels[project.context]}
                            </span>
                        </div>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/projects/${project.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/projects/${project.id}/edit`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={handleDelete}
                        >
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {project.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                </p>
            )}

            <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {project.completedTasks} / {project.totalTasks} tasks
                    </span>
                    {project.endDate && (
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(project.endDate), "MMM d, yyyy")}
                        </span>
                    )}
                </div>
            </div>

            {project.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                    {project.tags.map((tag) => (
                        <span
                            key={tag.id}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                            {tag.name}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
