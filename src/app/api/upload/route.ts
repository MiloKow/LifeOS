import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Allowed MIME types
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
];

// Max file size: 10MB
const MAX_SIZE = 10 * 1024 * 1024;

// Check if we should use Vercel Blob (production on Vercel)
const USE_VERCEL_BLOB = process.env.BLOB_READ_WRITE_TOKEN !== undefined;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const noteId = formData.get("noteId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!noteId) {
            return NextResponse.json({ error: "No noteId provided" }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `File type not allowed: ${file.type}. Allowed types: images (jpg, png, gif, webp) and PDF` },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split(".").pop() || "bin";
        const safeFilename = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

        let fileUrl: string;

        if (USE_VERCEL_BLOB) {
            // Use Vercel Blob in production
            const { put } = await import("@vercel/blob");
            const blob = await put(`notes/${noteId}/${safeFilename}`, file, {
                access: "public",
            });
            fileUrl = blob.url;
        } else {
            // Use local filesystem in development/Docker
            const uploadDir = path.join(process.cwd(), "public", "uploads", "notes", noteId);
            await mkdir(uploadDir, { recursive: true });

            const filepath = path.join(uploadDir, safeFilename);
            const bytes = await file.arrayBuffer();
            await writeFile(filepath, Buffer.from(bytes));

            // Use API route for serving local files
            fileUrl = `/api/files/notes/${noteId}/${safeFilename}`;
        }

        return NextResponse.json({
            success: true,
            filepath: fileUrl,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
        });
    } catch (error) {
        console.error("Upload failed:", error);
        return NextResponse.json(
            { error: "Upload failed" },
            { status: 500 }
        );
    }
}
