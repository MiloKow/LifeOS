"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type NoteInput = {
    title: string;
    content: string;
    taskId?: string;
    projectId?: string;
};

export async function createNote(data: NoteInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const note = await db.note.create({
            data: {
                ...data,
                userId: session.user.id,
            },
        });

        revalidatePath("/notes");
        return { success: true, note };
    } catch (error) {
        console.error("Failed to create note:", error);
        return { error: "Failed to create note" };
    }
}

export async function updateNote(noteId: string, data: Partial<NoteInput>) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const note = await db.note.update({
            where: { id: noteId, userId: session.user.id },
            data,
        });

        revalidatePath("/notes");
        revalidatePath(`/notes/${noteId}`);
        return { success: true, note };
    } catch (error) {
        console.error("Failed to update note:", error);
        return { error: "Failed to update note" };
    }
}

export async function deleteNote(noteId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        await db.note.update({
            where: { id: noteId, userId: session.user.id },
            data: { deletedAt: new Date() },
        });

        revalidatePath("/notes");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete note:", error);
        return { error: "Failed to delete note" };
    }
}

export async function getNotes(options?: {
    search?: string;
    taskId?: string;
    projectId?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const where: Record<string, unknown> = {
        userId: session.user.id,
        deletedAt: null,
    };

    if (options?.taskId) {
        where.taskId = options.taskId;
    }

    if (options?.projectId) {
        where.projectId = options.projectId;
    }

    if (options?.search) {
        where.OR = [
            { title: { contains: options.search, mode: "insensitive" } },
            { content: { contains: options.search, mode: "insensitive" } },
        ];
    }

    try {
        const notes = await db.note.findMany({
            where,
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return notes;
    } catch (error) {
        console.error("Failed to get notes:", error);
        return [];
    }
}

export async function getNote(noteId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const note = await db.note.findUnique({
            where: { id: noteId, userId: session.user.id, deletedAt: null },
            include: {
                task: true,
                project: true,
            },
        });

        return note;
    } catch (error) {
        console.error("Failed to get note:", error);
        return null;
    }
}
