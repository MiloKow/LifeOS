import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjects } from "@/features/projects/actions/project-actions";
import { ProjectCard } from "@/features/projects/components/project-card";
import { ProjectsPageHeader } from "./projects-page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default async function ProjectsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const allProjects = await getProjects();
    const activeProjects = allProjects.filter((p) =>
        ["PLANNING", "ACTIVE"].includes(p.status)
    );
    const completedProjects = allProjects.filter((p) =>
        ["COMPLETED", "ARCHIVED"].includes(p.status)
    );

    return (
        <div className="space-y-6">
            <ProjectsPageHeader />

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="active">
                        Active ({activeProjects.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        Completed ({completedProjects.length})
                    </TabsTrigger>
                    <TabsTrigger value="all">
                        All ({allProjects.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-6">
                    <ProjectGrid projects={activeProjects} />
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                    <ProjectGrid projects={completedProjects} />
                </TabsContent>

                <TabsContent value="all" className="mt-6">
                    <ProjectGrid projects={allProjects} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ProjectGrid({ projects }: { projects: Awaited<ReturnType<typeof getProjects>> }) {
    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                    <svg
                        className="h-8 w-8 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                    </svg>
                </div>
                <h3 className="text-lg font-medium">No projects yet</h3>
                <p className="text-muted-foreground mt-1">
                    Create your first project to get started
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
            ))}
        </div>
    );
}
