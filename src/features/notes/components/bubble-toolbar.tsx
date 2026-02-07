"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
    Bold,
    Italic,
    Strikethrough,
    Code,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BubbleToolbarProps {
    editor: Editor;
}

export function BubbleToolbar({ editor }: BubbleToolbarProps) {
    return (
        <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-background/95 backdrop-blur-lg shadow-lg p-1">
            {/* Text formatting */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                tooltip="Gras"
            >
                <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                tooltip="Italique"
            >
                <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive("strike")}
                tooltip="Barré"
            >
                <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive("code")}
                tooltip="Code"
            >
                <Code className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border/50 mx-1" />

            {/* Lists */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive("bulletList")}
                tooltip="Liste à puces"
            >
                <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive("orderedList")}
                tooltip="Liste numérotée"
            >
                <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive("blockquote")}
                tooltip="Citation"
            >
                <Quote className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border/50 mx-1" />

            {/* Headings */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive("heading", { level: 1 })}
                tooltip="Titre 1"
            >
                <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive("heading", { level: 2 })}
                tooltip="Titre 2"
            >
                <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive("heading", { level: 3 })}
                tooltip="Titre 3"
            >
                <Heading3 className="h-4 w-4" />
            </ToolbarButton>
        </div>
    );
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    tooltip: string;
    children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, tooltip, children }: ToolbarButtonProps) {
    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "h-7 w-7 rounded-md transition-all",
                isActive && "bg-primary/20 text-primary hover:bg-primary/30"
            )}
            onClick={onClick}
            title={tooltip}
        >
            {children}
        </Button>
    );
}
