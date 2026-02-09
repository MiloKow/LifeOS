"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FolderKanban, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Project, Tag, ProjectStatus } from "@prisma/client";

type ProjectWithMeta = Project & {
    progress: number;
    totalTasks: number;
    completedTasks: number;
    tags: Tag[];
};

interface ActiveProjectsProps {
    projects: ProjectWithMeta[];
}

const statusColors: Record<ProjectStatus, string> = {
    PLANNING: "bg-slate-500/10 text-slate-500",
    ACTIVE: "bg-emerald-500/10 text-emerald-500",
    ON_HOLD: "bg-amber-500/10 text-amber-500",
    COMPLETED: "bg-blue-500/10 text-blue-500",
    ARCHIVED: "bg-zinc-500/10 text-zinc-500",
};

export function ActiveProjects({ projects }: ActiveProjectsProps) {
    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold">Active Projects</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/projects">View all</Link>
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FolderKanban className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No active projects</p>
                    </div>
                ) : (
                    projects.slice(0, 3).map((project) => (
                        <div
                            key={project.id}
                            className="rounded-lg border border-border/50 p-4 transition-all hover:bg-muted/50"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                                        style={{ backgroundColor: `${project.color || '#6366f1'}20` }}
                                    >
                                        <FolderKanban
                                            className="h-5 w-5"
                                            style={{ color: project.color || '#6366f1' }}
                                        />
                                    </div>
                                    <div>
                                        <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                                            {project.name}
                                        </Link>
                                        <div className="flex items-center gap-2 mt-1">
                                            {project.tags.slice(0, 2).map((tag) => (
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
                                <div className="flex items-center gap-2">
                                    <Badge className={cn("text-xs", statusColors[project.status])}>
                                        {project.status.replace("_", " ")}
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="font-medium">{project.progress}%</span>
                                </div>
                                <Progress value={project.progress} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                    {project.completedTasks} of {project.totalTasks} tasks completed
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

