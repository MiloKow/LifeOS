import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTasks } from "@/features/tasks/actions/task-actions";
import { TaskList } from "@/features/tasks/components/task-list";
import { TaskPageHeader } from "./task-page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default async function TasksPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const allTasks = await getTasks();
    const todoTasks = allTasks.filter((t) => t.status !== "DONE");
    const doneTasks = allTasks.filter((t) => t.status === "DONE");

    return (
        <div className="space-y-6">
            <TaskPageHeader />

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="active">
                        Active ({todoTasks.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        Completed ({doneTasks.length})
                    </TabsTrigger>
                    <TabsTrigger value="all">
                        All ({allTasks.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-6">
                    <TaskList tasks={todoTasks} />
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                    <TaskList tasks={doneTasks} />
                </TabsContent>

                <TabsContent value="all" className="mt-6">
                    <TaskList tasks={allTasks} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
