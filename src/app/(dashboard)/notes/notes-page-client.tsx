"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FileText, Folder, FolderPlus, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { NoteEditor } from "@/features/notes/components/note-editor";
import { deleteNote } from "@/features/notes/actions/note-actions";
import { createFolder, deleteFolder, renameFolder, moveNoteToFolder } from "@/features/notes/actions/folder-actions";
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
import type { Note, Task, Project, NoteFolder } from "@prisma/client";

type NoteWithRelations = Note & {
    task: Pick<Task, "id" | "title"> | null;
    project: Pick<Project, "id" | "name" | "color"> | null;
};

type FolderWithCount = NoteFolder & {
    _count: { notes: number };
};

interface NotesPageClientProps {
    notes: NoteWithRelations[];
    folders: FolderWithCount[];
}

export function NotesPageClient({ notes, folders }: NotesPageClientProps) {
    const [selectedNote, setSelectedNote] = useState<NoteWithRelations | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

    // Folder dialog state
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<FolderWithCount | null>(null);
    const [folderName, setFolderName] = useState("");

    const filteredNotes = notes.filter((note) => {
        const matchesSearch =
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFolder = selectedFolderId === null || note.folderId === selectedFolderId;
        return matchesSearch && matchesFolder;
    });

    function handleNewNote() {
        setSelectedNote(null);
        setShowEditor(true);
    }

    function handleSelectNote(note: NoteWithRelations) {
        setSelectedNote(note);
        setShowEditor(true);
    }

    async function handleDeleteNote(noteId: string) {
        await deleteNote(noteId);
        if (selectedNote?.id === noteId) {
            setSelectedNote(null);
            setShowEditor(false);
        }
    }

    function openFolderDialog(folder?: FolderWithCount) {
        setEditingFolder(folder || null);
        setFolderName(folder?.name || "");
        setFolderDialogOpen(true);
    }

    async function handleSaveFolder() {
        if (!folderName.trim()) return;

        if (editingFolder) {
            await renameFolder(editingFolder.id, folderName.trim());
        } else {
            await createFolder(folderName.trim());
        }

        setFolderDialogOpen(false);
        setFolderName("");
        setEditingFolder(null);
    }

    async function handleDeleteFolder(folderId: string) {
        if (selectedFolderId === folderId) {
            setSelectedFolderId(null);
        }
        await deleteFolder(folderId);
    }

    async function handleMoveNote(noteId: string, folderId: string | null) {
        await moveNoteToFolder(noteId, folderId);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
                    <p className="text-muted-foreground">
                        Capture ideas and link them to your projects
                    </p>
                </div>
                <Button onClick={handleNewNote}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Note
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[200px_320px_1fr]">
                {/* Folder Sidebar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-muted-foreground">Folders</h2>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openFolderDialog()}>
                            <FolderPlus className="h-4 w-4" />
                        </Button>
                    </div>

                    <button
                        className={cn(
                            "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                            selectedFolderId === null && "bg-muted"
                        )}
                        onClick={() => setSelectedFolderId(null)}
                    >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-left">All Notes</span>
                        <span className="text-xs text-muted-foreground">{notes.length}</span>
                    </button>

                    {folders.map((folder) => (
                        <div
                            key={folder.id}
                            className={cn(
                                "group flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                                selectedFolderId === folder.id && "bg-muted"
                            )}
                        >
                            <button
                                className="flex items-center gap-2 flex-1"
                                onClick={() => setSelectedFolderId(folder.id)}
                            >
                                <Folder className="h-4 w-4 text-muted-foreground" />
                                <span className="flex-1 text-left truncate">{folder.name}</span>
                                <span className="text-xs text-muted-foreground">{folder._count.notes}</span>
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    >
                                        <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
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
                    ))}
                </div>

                {/* Notes List */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="space-y-2">
                        {filteredNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery ? "No notes found" : "No notes yet"}
                                </p>
                            </div>
                        ) : (
                            filteredNotes.map((note) => (
                                <div
                                    key={note.id}
                                    className={cn(
                                        "group relative rounded-lg border border-border/50 p-3 transition-all cursor-pointer hover:bg-muted/50",
                                        selectedNote?.id === note.id && "border-primary bg-muted/50"
                                    )}
                                    onClick={() => handleSelectNote(note)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{note.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {note.content.slice(0, 100)}...
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(note.updatedAt), "MMM d, yyyy")}
                                                </span>
                                                {note.project && (
                                                    <span
                                                        className="text-xs px-1.5 py-0.5 rounded"
                                                        style={{
                                                            backgroundColor: `${note.project.color || '#6366f1'}20`,
                                                            color: note.project.color || '#6366f1',
                                                        }}
                                                    >
                                                        {note.project.name}
                                                    </span>
                                                )}
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
                                                {folders.map((folder) => (
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
                            ))
                        )}
                    </div>
                </div>

                {/* Note Editor */}
                <div className="min-h-[600px] rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
                    {showEditor ? (
                        <NoteEditor
                            note={selectedNote}
                            onClose={() => {
                                setShowEditor(false);
                                setSelectedNote(null);
                            }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Select a note or create a new one</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Folder Dialog */}
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingFolder ? "Rename Folder" : "Create Folder"}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="space-y-2">
                            <Label htmlFor="folderName">Folder Name</Label>
                            <Input
                                id="folderName"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                                placeholder="Enter folder name"
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

