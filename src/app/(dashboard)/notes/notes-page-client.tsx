"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FileText, Folder, FolderPlus, MoreHorizontal, Plus, Search, Trash2, ImageIcon, File, Upload, ChevronRight, ChevronDown } from "lucide-react";
import { NoteEditor } from "@/features/notes/components/note-editor";
import { FileViewer } from "@/features/notes/components/file-viewer";
import { deleteNote } from "@/features/notes/actions/note-actions";
import { createFolder, deleteFolder, renameFolder, moveNoteToFolder, moveFolderToFolder } from "@/features/notes/actions/folder-actions";
import { createNoteFile, deleteNoteFile, moveFileToFolder } from "@/features/notes/actions/file-actions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Note, Task, Project, NoteFolder, NoteFile } from "@prisma/client";

type NoteWithRelations = Note & {
    task: Pick<Task, "id" | "title"> | null;
    project: Pick<Project, "id" | "name" | "color"> | null;
};

type FolderWithCount = NoteFolder & {
    parentId: string | null;
    _count: {
        notes: number;
        files: number;
        children: number;
    };
};

// Union type for items in the list
type ListItem =
    | { type: "note"; data: NoteWithRelations }
    | { type: "file"; data: NoteFile };

interface NotesPageClientProps {
    notes: NoteWithRelations[];
    folders: FolderWithCount[];
    files: NoteFile[];
    initialNoteId?: string;
}

// Utility to strip HTML tags for preview
function stripHtml(html: string) {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, '');
}

// Recursive folder tree type
type FolderTreeNode = FolderWithCount & { childFolders: FolderTreeNode[]; totalItems: number };

// Compute recursive total items for a tree node (own items + all descendants' items)
function computeTotalItems(node: FolderTreeNode): number {
    const ownItems = node._count.notes + (node._count.files || 0);
    const childItems = node.childFolders.reduce((sum, child) => sum + computeTotalItems(child), 0);
    return ownItems + childItems;
}

// Build tree structure from flat folder list
function buildFolderTree(folders: FolderWithCount[]): FolderTreeNode[] {
    const map = new Map<string | null, FolderWithCount[]>();

    folders.forEach((folder) => {
        const parentId = folder.parentId || null;
        if (!map.has(parentId)) {
            map.set(parentId, []);
        }
        map.get(parentId)!.push(folder);
    });

    function getChildren(parentId: string | null): FolderTreeNode[] {
        const children = map.get(parentId) || [];
        return children.map((folder) => {
            const node: FolderTreeNode = {
                ...folder,
                childFolders: getChildren(folder.id),
                totalItems: 0,
            };
            node.totalItems = computeTotalItems(node);
            return node;
        });
    }

    return getChildren(null);
}

export function NotesPageClient({ notes, folders, files, initialNoteId }: NotesPageClientProps) {
    const router = useRouter();
    const [selectedNote, setSelectedNote] = useState<NoteWithRelations | null>(
        initialNoteId ? notes.find(n => n.id === initialNoteId) || null : null
    );
    const [selectedFile, setSelectedFile] = useState<NoteFile | null>(null);
    const [showEditor, setShowEditor] = useState(!!initialNoteId);
    const [searchQuery, setSearchQuery] = useState("");

    // Initialize selectedFolderId based on the note's folder if initialNoteId is provided
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => {
        if (initialNoteId) {
            const note = notes.find(n => n.id === initialNoteId);
            return note?.folderId || null;
        }
        return null;
    });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Folder dialog state
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<FolderWithCount | null>(null);
    const [folderName, setFolderName] = useState("");
    const [folderParentId, setFolderParentId] = useState<string | null>(null);

    // Expanded folders state
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
        // Auto-expand folders that contain the initially selected note's folder
        if (initialNoteId) {
            const note = notes.find(n => n.id === initialNoteId);
            if (note?.folderId) {
                const expanded = new Set<string>();
                let currentId: string | null = note.folderId;
                while (currentId) {
                    const folder = folders.find(f => f.id === currentId);
                    if (folder?.parentId) {
                        expanded.add(folder.parentId);
                    }
                    currentId = folder?.parentId || null;
                }
                return expanded;
            }
        }
        return new Set();
    });

    // Drag and Drop state
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    // Filter notes based on search and folder
    const filteredNotes = notes.filter((note) => {
        const matchesSearch =
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase());

        // Show only uncategorized notes when no folder is selected (Root/"Notes")
        const matchesFolder = selectedFolderId === null
            ? note.folderId === null
            : note.folderId === selectedFolderId;

        return matchesSearch && matchesFolder;
    });

    // Filter files based on search and folder
    const filteredFiles = files.filter((file) => {
        const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase());

        // Show only uncategorized files when no folder is selected (Root/"Notes")
        const matchesFolder = selectedFolderId === null
            ? file.folderId === null
            : file.folderId === selectedFolderId;

        return matchesSearch && matchesFolder;
    });

    // Combine notes and files into a single list, sorted by date
    const combinedItems: ListItem[] = [
        ...filteredNotes.map((note) => ({ type: "note" as const, data: note })),
        ...filteredFiles.map((file) => ({ type: "file" as const, data: file })),
    ].sort((a, b) => {
        const dateA = new Date(a.data.updatedAt);
        const dateB = new Date(b.data.updatedAt);
        return dateB.getTime() - dateA.getTime();
    });

    function toggleFolder(folderId: string) {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    }

    function handleNewNote() {
        setSelectedNote(null);
        setSelectedFile(null);
        setShowEditor(true);
    }

    function handleSelectNote(note: NoteWithRelations) {
        setSelectedNote(note);
        setSelectedFile(null);
        setShowEditor(true);
    }

    function handleSelectFile(file: NoteFile) {
        setSelectedFile(file);
        setSelectedNote(null);
        setShowEditor(false);
    }

    async function handleDeleteNote(noteId: string) {
        await deleteNote(noteId);
        router.refresh();
        if (selectedNote?.id === noteId) {
            setSelectedNote(null);
            setShowEditor(false);
        }
    }

    async function handleDeleteFile(fileId: string) {
        await deleteNoteFile(fileId);
        router.refresh();
        if (selectedFile?.id === fileId) {
            setSelectedFile(null);
        }
    }

    function openFolderDialog(folder?: FolderWithCount, parentId?: string | null) {
        setEditingFolder(folder || null);
        setFolderName(folder?.name || "");
        setFolderParentId(folder ? (folder.parentId || null) : (parentId ?? null));
        setFolderDialogOpen(true);
    }

    async function handleSaveFolder() {
        if (!folderName.trim()) return;

        if (editingFolder) {
            await renameFolder(editingFolder.id, folderName.trim());
        } else {
            await createFolder(folderName.trim(), folderParentId);
        }

        router.refresh();
        setFolderDialogOpen(false);
        setFolderName("");
        setEditingFolder(null);
        setFolderParentId(null);
    }

    async function handleDeleteFolder(folderId: string) {
        if (selectedFolderId === folderId) {
            setSelectedFolderId(null);
        }
        await deleteFolder(folderId);
        router.refresh();
    }

    async function handleMoveNote(noteId: string, folderId: string | null) {
        await moveNoteToFolder(noteId, folderId);
        router.refresh();
    }

    async function handleMoveFile(fileId: string, folderId: string | null) {
        await moveFileToFolder(fileId, folderId);
        router.refresh();
    }

    async function handleMoveFolder(folderId: string, parentId: string | null) {
        await moveFolderToFolder(folderId, parentId);
        router.refresh();
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("noteId", "standalone");

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                await createNoteFile({
                    filename: result.filename,
                    filepath: result.filepath,
                    mimeType: result.mimeType,
                    size: result.size,
                    folderId: selectedFolderId,
                });
                router.refresh();
            } else {
                alert(result.error || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload failed. Please try again.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    function handleNoteSaved(note: Note) {
        setSelectedNote(note as NoteWithRelations);
        router.refresh();
    }

    // Drag and Drop Handlers
    function handleDragStart(e: React.DragEvent, type: 'note' | 'file' | 'folder', id: string) {
        e.dataTransfer.setData("application/json", JSON.stringify({ type, id }));
        e.dataTransfer.effectAllowed = "move";
        e.stopPropagation();
    }

    function handleDragOver(e: React.DragEvent, folderId: string | null) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverFolderId(folderId);
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        setDragOverFolderId(null);
    }

    async function handleDrop(e: React.DragEvent, targetFolderId: string | null) {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolderId(null);

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data.type === 'note') {
                await handleMoveNote(data.id, targetFolderId);
            } else if (data.type === 'file') {
                await handleMoveFile(data.id, targetFolderId);
            } else if (data.type === 'folder') {
                // Don't drop a folder into itself
                if (data.id !== targetFolderId) {
                    await handleMoveFolder(data.id, targetFolderId);
                }
            }
        } catch (error) {
            console.error("Drop failed:", error);
        }
    }

    // Count uncategorized items for "Notes" badge
    const uncategorizedCount = notes.filter(n => !n.folderId).length + files.filter(f => !f.folderId).length;

    // Build tree
    const folderTree = buildFolderTree(folders);

    // Get all available folders for the "Move to" menus (flatten the list of all folders)
    const allFolders = folders;

    // Recursive folder renderer
    function renderFolderItem(folder: FolderTreeNode, depth: number = 0) {
        const isExpanded = expandedFolders.has(folder.id);
        const hasChildren = folder.childFolders.length > 0;
        const itemCount = folder.totalItems;

        return (
            <div key={folder.id}>
                <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                    className={cn(
                        "group flex items-center gap-1 w-full rounded-lg px-2 py-2 text-sm transition-colors",
                        selectedFolderId === folder.id ? "bg-muted" : "hover:bg-muted/50",
                        dragOverFolderId === folder.id && "bg-muted/80 ring-2 ring-primary/20"
                    )}
                    style={{ paddingLeft: `${8 + depth * 16}px` }}
                    onDragOver={(e) => handleDragOver(e, folder.id)}
                    onDrop={(e) => handleDrop(e, folder.id)}
                    onDragEnter={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
                >
                    {/* Expand/collapse toggle */}
                    <button
                        className="h-5 w-5 flex items-center justify-center flex-shrink-0 rounded hover:bg-muted"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hasChildren) {
                                toggleFolder(folder.id);
                            }
                        }}
                    >
                        {hasChildren ? (
                            isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )
                        ) : (
                            <span className="w-3.5" />
                        )}
                    </button>

                    <button
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={() => {
                            setSelectedFolderId(folder.id);
                            // Auto-expand when clicking on a folder that has children
                            if (hasChildren && !isExpanded) {
                                toggleFolder(folder.id);
                            }
                        }}
                    >
                        <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {itemCount}
                        </span>
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openFolderDialog(undefined, folder.id)}>
                                <FolderPlus className="h-4 w-4 mr-2" />
                                New subfolder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openFolderDialog(folder)}>
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteFolder(folder.id)}
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Render children if expanded */}
                {isExpanded && hasChildren && (
                    <div>
                        {folder.childFolders.map((child) =>
                            renderFolderItem(child, depth + 1)
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
                    <p className="text-muted-foreground">
                        Capture ideas, documents, and files
                    </p>
                </div>
                <div className="flex gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload File"}
                    </Button>
                    <Button onClick={handleNewNote}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Note
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[220px_320px_1fr]">
                {/* Folder Sidebar */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-muted-foreground">Folders</h2>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openFolderDialog()}>
                            <FolderPlus className="h-4 w-4" />
                        </Button>
                    </div>

                    <div
                        className={cn(
                            "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
                            selectedFolderId === null ? "bg-muted" : "hover:bg-muted/50",
                            dragOverFolderId === "root" && "bg-muted/80 ring-2 ring-primary/20"
                        )}
                        onClick={() => setSelectedFolderId(null)}
                        onDragOver={(e) => handleDragOver(e, "root")}
                        onDrop={(e) => handleDrop(e, null)}
                        onDragEnter={(e) => { e.preventDefault(); setDragOverFolderId("root"); }}
                    >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-left">Notes</span>
                        <span className="text-xs text-muted-foreground">{uncategorizedCount}</span>
                    </div>

                    {folderTree.map((folder) => renderFolderItem(folder))}
                </div>

                {/* Notes & Files List */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search notes and files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="space-y-2">
                        {combinedItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery ? "No items found" : "No items yet"}
                                </p>
                            </div>
                        ) : (
                            combinedItems.map((item) => {
                                if (item.type === "note") {
                                    const note = item.data;
                                    return (
                                        <div
                                            key={`note-${note.id}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, 'note', note.id)}
                                            className={cn(
                                                "group relative rounded-lg border border-border/50 p-3 transition-all cursor-pointer hover:bg-muted/50",
                                                selectedNote?.id === note.id && "border-primary bg-muted/50"
                                            )}
                                            onClick={() => handleSelectNote(note)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                        <p className="font-medium truncate">{note.title}</p>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-6">
                                                        {stripHtml(note.content).slice(0, 100)}...
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2 ml-6">
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(note.updatedAt), "MMM d, yyyy")}
                                                        </span>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuItem onClick={() => handleMoveNote(note.id, null)}>
                                                            Remove from folder
                                                        </DropdownMenuItem>
                                                        {allFolders.map((folder) => (
                                                            <DropdownMenuItem
                                                                key={folder.id}
                                                                onClick={() => handleMoveNote(note.id, folder.id)}
                                                            >
                                                                Move to {folder.name}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleDeleteNote(note.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    const file = item.data;
                                    const isImage = file.mimeType.startsWith("image/");
                                    return (
                                        <div
                                            key={`file-${file.id}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, 'file', file.id)}
                                            className={cn(
                                                "group relative rounded-lg border border-border/50 p-3 transition-all cursor-pointer hover:bg-muted/50",
                                                selectedFile?.id === file.id && "border-primary bg-muted/50"
                                            )}
                                            onClick={() => handleSelectFile(file)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        {isImage ? (
                                                            <ImageIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <File className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                        )}
                                                        <p className="font-medium truncate">{file.filename}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 ml-6">
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(file.createdAt), "MMM d, yyyy")}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {(file.size / 1024).toFixed(1)} KB
                                                        </span>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuItem onClick={() => handleMoveFile(file.id, null)}>
                                                            Remove from folder
                                                        </DropdownMenuItem>
                                                        {allFolders.map((folder) => (
                                                            <DropdownMenuItem
                                                                key={folder.id}
                                                                onClick={() => handleMoveFile(file.id, folder.id)}
                                                            >
                                                                Move to {folder.name}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleDeleteFile(file.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    );
                                }
                            })
                        )}
                    </div>
                </div>

                {/* Content Viewer */}
                <div className="min-h-[600px] rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
                    {showEditor ? (
                        <NoteEditor
                            note={selectedNote}
                            onClose={() => {
                                setShowEditor(false);
                                setSelectedNote(null);
                                window.history.pushState({}, "", "/notes");
                            }}
                            onNoteSaved={handleNoteSaved}
                            defaultFolderId={selectedFolderId}
                        />
                    ) : selectedFile ? (
                        <FileViewer
                            file={selectedFile}
                            onDelete={() => handleDeleteFile(selectedFile.id)}
                            onClose={() => setSelectedFile(null)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Select an item or create a new one</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Folder Dialog */}
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingFolder
                                ? "Rename Folder"
                                : folderParentId
                                    ? `Create Subfolder in "${folders.find(f => f.id === folderParentId)?.name || ""}"`
                                    : "Create Folder"
                            }
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="space-y-2">
                            <Label htmlFor="folderName">Folder Name</Label>
                            <Input
                                id="folderName"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                                placeholder="Enter folder name"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && folderName.trim()) {
                                        handleSaveFolder();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>
                            {editingFolder ? "Rename" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
