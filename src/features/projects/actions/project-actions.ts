"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ProjectStatus, Context } from "@prisma/client";

export type ProjectInput = {
    name: string;
    description?: string;
    status?: ProjectStatus;
    context?: Context;
    startDate?: Date;
    endDate?: Date;
    color?: string;
    companyId?: string;
};

export async function createProject(data: ProjectInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const project = await db.project.create({
            data: {
                ...data,
                userId: session.user.id,
            },
        });

        revalidatePath("/projects");
        revalidatePath("/dashboard");
        return { success: true, project };
    } catch (error) {
        console.error("Failed to create project:", error);
        return { error: "Failed to create project" };
    }
}

export async function updateProject(projectId: string, data: Partial<ProjectInput>) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const project = await db.project.update({
            where: { id: projectId, userId: session.user.id },
            data,
        });

        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        revalidatePath("/dashboard");
        return { success: true, project };
    } catch (error) {
        console.error("Failed to update project:", error);
        return { error: "Failed to update project" };
    }
}

export async function deleteProject(projectId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        await db.project.update({
            where: { id: projectId, userId: session.user.id },
            data: { deletedAt: new Date() },
        });

        revalidatePath("/projects");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete project:", error);
        return { error: "Failed to delete project" };
    }
}

export async function getProjects(options?: {
    status?: ProjectStatus;
    context?: Context;
    companyId?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const where: Record<string, unknown> = {
        userId: session.user.id,
        deletedAt: null,
    };

    if (options?.status) {
        where.status = options.status;
    }

    if (options?.context) {
        where.context = options.context;
    }

    if (options?.companyId) {
        where.companyId = options.companyId;
    }

    try {
        const projects = await db.project.findMany({
            where,
            include: {
                _count: {
                    select: {
                        tasks: {
                            where: { deletedAt: null },
                        },
                    },
                },
                tasks: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        status: true,
                    },
                },
                tags: true,
            },
            orderBy: [{ status: "asc" }, { endDate: "asc" }, { createdAt: "desc" }],
        });

        // Calculate progress for each project
        return projects.map((project) => {
            const totalTasks = project.tasks.length;
            const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return {
                ...project,
                progress,
                totalTasks,
                completedTasks,
            };
        });
    } catch (error) {
        console.error("Failed to get projects:", error);
        return [];
    }
}

export async function getProject(projectId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const project = await db.project.findUnique({
            where: { id: projectId, userId: session.user.id, deletedAt: null },
            include: {
                tasks: {
                    where: { deletedAt: null },
                    orderBy: [{ status: "asc" }, { priority: "desc" }],
                },
                milestones: {
                    orderBy: { dueDate: "asc" },
                },
                tags: true,
                notes: {
                    where: { deletedAt: null },
                    orderBy: { updatedAt: "desc" },
                },
                timeEntries: {
                    orderBy: { startTime: "desc" },
                    take: 10,
                },
            },
        });

        if (!project) return null;

        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            ...project,
            progress,
            totalTasks,
            completedTasks,
        };
    } catch (error) {
        console.error("Failed to get project:", error);
        return null;
    }
}
