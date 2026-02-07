import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNotes } from "@/features/notes/actions/note-actions";
import { getFolders } from "@/features/notes/actions/folder-actions";
import { NotesPageClient } from "./notes-page-client";

export default async function NotesPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const [notes, folders] = await Promise.all([
        getNotes(),
        getFolders(),
    ]);

    return <NotesPageClient notes={notes} folders={folders} />;
}

