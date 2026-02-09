import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getProject } from "@/features/projects/actions/project-actions";
import { getEvents } from "@/features/calendar/actions/event-actions";
import { ProjectDetailClient } from "./project-detail-client";

interface ProjectPageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const { id } = await params;
    const [project, events] = await Promise.all([
        getProject(id),
        getEvents({ projectId: id }),
    ]);

    if (!project) {
        notFound();
    }

    return <ProjectDetailClient project={project} events={events} />;
}
