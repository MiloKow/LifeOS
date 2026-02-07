import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getProject } from "@/features/projects/actions/project-actions";
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
    const project = await getProject(id);

    if (!project) {
        notFound();
    }

    return <ProjectDetailClient project={project} />;
}
