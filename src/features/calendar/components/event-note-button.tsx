"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StickyNote, Loader2 } from "lucide-react";
import { getOrCreateEventNote } from "../actions/event-note-actions";
import { toast } from "sonner";

interface EventNoteButtonProps {
    eventId: string;
    eventTitle: string;
    projectId?: string | null;
    projectName?: string | null;
    companyId?: string | null;
    companyName?: string | null;
    size?: "sm" | "default";
}

export function EventNoteButton({
    eventId,
    eventTitle,
    projectId,
    projectName,
    companyId,
    companyName,
    size = "default",
}: EventNoteButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLoading(true);
        try {
            const result = await getOrCreateEventNote({
                eventId,
                eventTitle,
                projectId,
                projectName,
                companyId,
                companyName,
            });

            if (result.success && result.noteId) {
                router.push(`/notes/${result.noteId}`);
            } else {
                toast.error("Impossible d'ouvrir la note");
            }
        } catch (error) {
            console.error(error);
            toast.error("Une erreur est survenue");
        } finally {
            setIsLoading(false);
        }
    };

    if (size === "sm") {
        return (
            <button
                onClick={handleClick}
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded p-0.5 text-inherit opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                title="Ouvrir la note"
            >
                {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <StickyNote className="h-3 w-3" />
                )}
            </button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={handleClick}
            disabled={isLoading}
            title="Ouvrir la note"
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <StickyNote className="h-4 w-4" />
            )}
            <span className="sr-only">Ouvrir la note</span>
        </Button>
    );
}
