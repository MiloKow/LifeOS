"use client";

import Image from "next/image";
import { FileText, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NoteFile } from "@prisma/client";

interface FileViewerProps {
    file: NoteFile;
    onDelete: () => void;
    onClose: () => void;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileViewer({ file, onDelete, onClose }: FileViewerProps) {
    const isImage = file.mimeType.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-4">
                <div className="flex items-center gap-3">
                    {isImage ? (
                        <div className="h-8 w-8 rounded bg-blue-500/20 flex items-center justify-center">
                            <span className="text-blue-500 text-xs font-medium">IMG</span>
                        </div>
                    ) : (
                        <div className="h-8 w-8 rounded bg-red-500/20 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-red-500" />
                        </div>
                    )}
                    <div>
                        <h2 className="font-semibold">{file.filename}</h2>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.filepath, "_blank")}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Open
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={onDelete}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-muted/30">
                {isImage && (
                    <div className="relative max-w-full max-h-full">
                        <Image
                            src={file.filepath}
                            alt={file.filename}
                            width={800}
                            height={600}
                            className="object-contain max-h-[70vh] w-auto rounded-lg shadow-lg"
                            unoptimized
                        />
                    </div>
                )}
                {isPdf && (
                    <iframe
                        src={file.filepath}
                        className="w-full h-full min-h-[500px] rounded-lg border border-border/50"
                        title={file.filename}
                    />
                )}
                {!isImage && !isPdf && (
                    <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                            Preview not available for this file type
                        </p>
                        <Button onClick={() => window.open(file.filepath, "_blank")}>
                            Download File
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
