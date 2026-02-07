"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface GetOrCreateTaskNoteParams {
    taskId: string;
    projectId: string;
    taskTitle: string;
    projectName: string;
}

export async function getOrCreateTaskNote({
    taskId,
    projectId,
    taskTitle,
    projectName,
}: GetOrCreateTaskNoteParams) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        // 1. Check if a note linked to this task already exists
        const existingNote = await db.note.findFirst({
            where: {
                taskId,
                userId: session.user.id,
                deletedAt: null,
            },
            select: { id: true },
        });

        if (existingNote) {
            return { success: true, noteId: existingNote.id };
        }

        // 2. Check if a folder linked to the user with name === projectName exists
        let folder = await db.noteFolder.findFirst({
            where: {
                name: projectName,
                userId: session.user.id,
            },
            select: { id: true },
        });

        // 3. If folder doesn't exist, create it
        if (!folder) {
            folder = await db.noteFolder.create({
                data: {
                    name: projectName,
                    userId: session.user.id,
                },
                select: { id: true },
            });
        }

        // 4. Create a new note
        const newNote = await db.note.create({
            data: {
                title: taskTitle,
                content: "", // Empty content initially
                taskId,
                projectId,
                folderId: folder.id,
                userId: session.user.id,
            },
            select: { id: true },
        });

        revalidatePath("/notes");
        return { success: true, noteId: newNote.id };
    } catch (error) {
        console.error("Failed to get or create task note:", error);
        return { error: "Failed to create note" };
    }
}
