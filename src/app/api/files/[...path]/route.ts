import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile, stat } from "fs/promises";
import path from "path";

// Serve uploaded files
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { path: pathSegments } = await params;
        const filePath = pathSegments.join("/");
        const fullPath = path.join(process.cwd(), "public", "uploads", filePath);

        // Security: ensure the path doesn't escape the uploads directory
        const normalizedPath = path.normalize(fullPath);
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        if (!normalizedPath.startsWith(uploadsDir)) {
            return NextResponse.json({ error: "Invalid path" }, { status: 400 });
        }

        // Check if file exists
        try {
            await stat(fullPath);
        } catch {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Read and serve the file
        const fileBuffer = await readFile(fullPath);

        // Determine content type based on extension
        const ext = path.extname(fullPath).toLowerCase();
        const contentTypes: Record<string, string> = {
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        };
        const contentType = contentTypes[ext] || "application/octet-stream";

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000",
            },
        });
    } catch (error) {
        console.error("File serve error:", error);
        return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
    }
}
