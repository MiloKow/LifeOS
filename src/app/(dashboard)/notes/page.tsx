import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNotes } from "@/features/notes/actions/note-actions";
import { getFolders } from "@/features/notes/actions/folder-actions";
import { getNoteFiles } from "@/features/notes/actions/file-actions";
import { NotesPageClient } from "./notes-page-client";

export default async function NotesPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const [notes, folders, files] = await Promise.all([
        getNotes(),
        getFolders(),
        getNoteFiles(),
    ]);

    return <NotesPageClient notes={notes} folders={folders} files={files} />;
}
