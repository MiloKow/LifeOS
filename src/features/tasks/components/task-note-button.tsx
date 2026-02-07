"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StickyNote, Loader2 } from "lucide-react";
import { getOrCreateTaskNote } from "../actions/task-note-actions";
import { toast } from "sonner";

interface TaskNoteButtonProps {
    taskId: string;
    projectId: string;
    taskTitle: string;
    projectName: string;
}

export function TaskNoteButton({
    taskId,
    projectId,
    taskTitle,
    projectName,
}: TaskNoteButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleClick = async () => {
        setIsLoading(true);
        try {
            const result = await getOrCreateTaskNote({
                taskId,
                projectId,
                taskTitle,
                projectName,
            });

            if (result.success && result.noteId) {
                router.push(`/notes/${result.noteId}`);
            } else {
                toast.error("Failed to open note");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={handleClick}
            disabled={isLoading}
            title="Open project note"
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <StickyNote className="h-4 w-4" />
            )}
            <span className="sr-only">Open project note</span>
        </Button>
    );
}
