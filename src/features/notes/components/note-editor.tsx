"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, X } from "lucide-react";
import { createNote, updateNote } from "@/features/notes/actions/note-actions";
import { BubbleToolbar } from "./bubble-toolbar";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { Note } from "@prisma/client";

interface NoteEditorProps {
    note: Note | null;
    onClose: () => void;
    onNoteSaved?: (note: Note) => void;
}

export function NoteEditor({ note, onClose, onNoteSaved }: NoteEditorProps) {
    const [title, setTitle] = useState(note?.title || "Untitled");
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Keep track of the current note ID locally to handle creation without prop update
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(note?.id || null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder: "Commencez à écrire...",
                emptyEditorClass: "is-editor-empty",
            }),
        ],
        content: note?.content || "",
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none min-h-[500px] outline-none focus:outline-none px-4 py-2",
            },
        },
        onUpdate: () => {
            setHasChanges(true);
        },
    });

    // Update editor content when note changes via props
    useEffect(() => {
        if (note) {
            setCurrentNoteId(note.id);
            setTitle(note.title);
            if (editor && note.content !== undefined && editor.getHTML() !== note.content) {
                editor.commands.setContent(note.content || "");
            }
        } else {
            setCurrentNoteId(null);
            setTitle("Untitled");
            if (editor) {
                editor.commands.setContent("");
            }
        }
        setHasChanges(false);
    }, [note, editor]);

    const handleSave = useCallback(async () => {
        if (!editor) return;

        setSaving(true);
        try {
            const content = editor.getHTML();
            let result;

            if (currentNoteId) {
                result = await updateNote(currentNoteId, { title, content });
            } else {
                result = await createNote({ title, content });
            }

            if (result.success && result.note) {
                setCurrentNoteId(result.note.id);
                setHasChanges(false);
                if (onNoteSaved) {
                    onNoteSaved(result.note);
                }
            }
        } catch (error) {
            console.error("Failed to save note:", error);
        } finally {
            setSaving(false);
        }
    }, [editor, currentNoteId, title, onNoteSaved]);

    // Auto-save on blur
    const handleBlur = useCallback(async () => {
        if (hasChanges) {
            await handleSave();
        }
    }, [hasChanges, handleSave]);

    if (!editor) {
        return null;
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

            {/* Editor with Bubble Menu */}
            <div className="flex-1 overflow-auto">
                <BubbleMenu editor={editor}>
                    <BubbleToolbar editor={editor} />
                </BubbleMenu>
                <EditorContent
                    editor={editor}
                    onBlur={handleBlur}
                />
            </div>

            {/* Footer hints */}
            <div className="border-t border-border/50 px-4 py-2 text-xs text-muted-foreground">
                Astuce: Sélectionnez du texte pour afficher la barre d&apos;outils. Auto-save au blur.
            </div>
        </div>
    );
}
