"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createFolder(name: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const folder = await db.noteFolder.create({
            data: {
                name,
                userId: session.user.id,
            },
        });

        revalidatePath("/notes");
        return { success: true, folder };
    } catch (error) {
        console.error("Failed to create folder:", error);
        return { error: "Failed to create folder" };
    }
}

export async function renameFolder(folderId: string, name: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const folder = await db.noteFolder.update({
            where: { id: folderId, userId: session.user.id },
            data: { name },
        });

        revalidatePath("/notes");
        return { success: true, folder };
    } catch (error) {
        console.error("Failed to rename folder:", error);
        return { error: "Failed to rename folder" };
    }
}

export async function deleteFolder(folderId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        // First, unlink all notes from this folder
        await db.note.updateMany({
            where: { folderId, userId: session.user.id },
            data: { folderId: null },
        });

        // Then delete the folder
        await db.noteFolder.delete({
            where: { id: folderId, userId: session.user.id },
        });

        revalidatePath("/notes");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete folder:", error);
        return { error: "Failed to delete folder" };
    }
}

export async function getFolders() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        // Fetch folders with file counts (files are hard deleted, so count is accurate)
        const foldersPromise = db.noteFolder.findMany({
            where: { userId: session.user.id },
            include: {
                _count: {
                    select: {
                        files: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        // Fetch active note counts grouped by folder (excluding soft-deleted notes)
        const activeNotesCountPromise = db.note.groupBy({
            by: ['folderId'],
            where: {
                userId: session.user.id,
                deletedAt: null,
                folderId: { not: null }
            },
            _count: {
                _all: true
            }
        });

        const [folders, noteCounts] = await Promise.all([foldersPromise, activeNotesCountPromise]);

        // Merge the counts
        return folders.map(folder => {
            const noteCount = noteCounts.find(c => c.folderId === folder.id)?._count._all || 0;
            return {
                ...folder,
                _count: {
                    files: folder._count.files,
                    notes: noteCount
                }
            };
        });
    } catch (error) {
        console.error("Failed to get folders:", error);
        return [];
    }
}

export async function moveNoteToFolder(noteId: string, folderId: string | null) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const note = await db.note.update({
            where: { id: noteId, userId: session.user.id },
            data: { folderId },
        });

        revalidatePath("/notes");
        return { success: true, note };
    } catch (error) {
        console.error("Failed to move note:", error);
        return { error: "Failed to move note" };
    }
}
