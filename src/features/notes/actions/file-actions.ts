"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";

export type FileInput = {
    filename: string;
    filepath: string;
    mimeType: string;
    size: number;
    folderId?: string | null;
};

export async function createNoteFile(data: FileInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const file = await db.noteFile.create({
            data: {
                filename: data.filename,
                filepath: data.filepath,
                mimeType: data.mimeType,
                size: data.size,
                folderId: data.folderId || null,
                userId: session.user.id,
            },
        });

        revalidatePath("/notes");
        return { success: true, file };
    } catch (error) {
        console.error("Failed to create file:", error);
        return { error: "Failed to create file" };
    }
}

export async function deleteNoteFile(fileId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        const file = await db.noteFile.findUnique({
            where: { id: fileId, userId: session.user.id },
        });

        if (!file) {
            return { error: "File not found" };
        }

        // Delete the file from disk
        try {
            const filepath = path.join(process.cwd(), "public", file.filepath);
            await unlink(filepath);
        } catch (fileError) {
            console.error("Failed to delete file from disk:", fileError);
        }

        // Delete from database
        await db.noteFile.delete({
            where: { id: fileId },
        });

        revalidatePath("/notes");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete file:", error);
        return { error: "Failed to delete file" };
    }
}

export async function getNoteFiles(folderId?: string | null) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const where: Record<string, unknown> = {
            userId: session.user.id,
        };

        // Filter by folder if specified, otherwise get files without folder (null)
        if (folderId !== undefined) {
            where.folderId = folderId;
        }

        const files = await db.noteFile.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        return files;
    } catch (error) {
        console.error("Failed to get files:", error);
        return [];
    }
}

export async function getNoteFile(fileId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const file = await db.noteFile.findUnique({
            where: { id: fileId, userId: session.user.id },
        });

        return file;
    } catch (error) {
        console.error("Failed to get file:", error);
        return null;
    }
}

export async function moveFileToFolder(fileId: string, folderId: string | null) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    try {
        await db.noteFile.update({
            where: { id: fileId, userId: session.user.id },
            data: { folderId },
        });

        revalidatePath("/notes");
        return { success: true };
    } catch (error) {
        console.error("Failed to move file:", error);
        return { error: "Failed to move file" };
    }
}
