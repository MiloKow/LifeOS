import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNotes } from "@/features/notes/actions/note-actions";
import { getFolders } from "@/features/notes/actions/folder-actions";
import { getNoteFiles } from "@/features/notes/actions/file-actions";
import { NotesPageClient } from "../notes-page-client";

interface NotePageProps {
    params: Promise<{
        noteId: string;
    }>;
}

export default async function NotePage({ params }: NotePageProps) {
    const session = await auth();
    const { noteId } = await params;

    if (!session?.user) {
        redirect("/login");
    }

    const [notes, folders, files] = await Promise.all([
        getNotes(),
        getFolders(),
        getNoteFiles(),
    ]);

    // Verify note exists and belongs to user (getNotes filters by user)
    const noteExists = notes.some(n => n.id === noteId);
    if (!noteExists) {
        redirect("/notes");
    }

    return (
        <NotesPageClient
            notes={notes}
            folders={folders}
            files={files}
            initialNoteId={noteId}
        />
    );
}
