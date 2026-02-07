"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";
import { createNote, updateNote } from "@/features/notes/actions/note-actions";
import type { Note } from "@prisma/client";

interface NoteEditorProps {
    note: Note | null;
    onClose: () => void;
}

export function NoteEditor({ note, onClose }: NoteEditorProps) {
    const [title, setTitle] = useState(note?.title || "Untitled");
    const [content, setContent] = useState(note?.content || "");
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setTitle(note?.title || "Untitled");
        setContent(note?.content || "");
        setHasChanges(false);
    }, [note]);

    async function handleSave() {
        setSaving(true);
        try {
            if (note) {
                await updateNote(note.id, { title, content });
            } else {
                await createNote({ title, content });
            }
            setHasChanges(false);
        } catch (error) {
            console.error("Failed to save note:", error);
        } finally {
            setSaving(false);
        }
    }

    // Auto-save on blur
    async function handleBlur() {
        if (hasChanges) {
            await handleSave();
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-4">
                <Input
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        setHasChanges(true);
                    }}
                    onBlur={handleBlur}
                    className="border-0 text-xl font-semibold bg-transparent focus-visible:ring-0 px-0"
                    placeholder="Note title..."
                />
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <span className="text-xs text-muted-foreground">Unsaved changes</span>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 p-4">
                <Textarea
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        setHasChanges(true);
                    }}
                    onBlur={handleBlur}
                    className="min-h-[500px] h-full resize-none border-0 bg-transparent focus-visible:ring-0 text-base leading-relaxed"
                    placeholder="Start writing... (Markdown supported)"
                />
            </div>

            {/* Footer hints */}
            <div className="border-t border-border/50 px-4 py-2 text-xs text-muted-foreground">
                Tip: Use Markdown syntax for formatting. Auto-saves on blur.
            </div>
        </div>
    );
}
