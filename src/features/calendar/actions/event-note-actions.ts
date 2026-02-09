"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface GetOrCreateEventNoteParams {
    eventId: string;
    eventTitle: string;
    projectId?: string | null;
    projectName?: string | null;
    companyId?: string | null;
    companyName?: string | null;
}

export async function getOrCreateEventNote({
    eventId,
    eventTitle,
    projectId,
    projectName,
    companyId,
    companyName,
}: GetOrCreateEventNoteParams) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        // 1. Check if a note linked to this event already exists
        const existingNote = await db.note.findFirst({
            where: {
                eventId,
                userId: session.user.id,
                deletedAt: null,
            },
            select: { id: true },
        });

        if (existingNote) {
            return { success: true, noteId: existingNote.id };
        }

        // 2. Determine the folder name (project name or company name)
        const folderName = projectName || companyName;

        let folderId: string | undefined;

        if (folderName) {
            // 3. Check if a folder with this name exists for the user
            let folder = await db.noteFolder.findFirst({
                where: {
                    name: folderName,
                    userId: session.user.id,
                },
                select: { id: true },
            });

            // 4. If folder doesn't exist, create it
            if (!folder) {
                folder = await db.noteFolder.create({
                    data: {
                        name: folderName,
                        userId: session.user.id,
                    },
                    select: { id: true },
                });
            }

            folderId = folder.id;
        }

        // 5. Create a new note linked to the event
        const newNote = await db.note.create({
            data: {
                title: eventTitle,
                content: "",
                eventId,
                projectId: projectId || undefined,
                folderId,
                userId: session.user.id,
            },
            select: { id: true },
        });

        revalidatePath("/notes");
        return { success: true, noteId: newNote.id };
    } catch (error) {
        console.error("Failed to get or create event note:", error);
        return { error: "Failed to create note" };
    }
}
