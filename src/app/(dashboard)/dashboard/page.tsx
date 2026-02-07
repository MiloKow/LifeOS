import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TodayTasks } from "@/features/dashboard/components/today-tasks";
import { UpcomingDeadlines } from "@/features/dashboard/components/upcoming-deadlines";
import { ActiveProjects } from "@/features/dashboard/components/active-projects";
import { CalendarPreview } from "@/features/dashboard/components/calendar-preview";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from "date-fns";
import { getTasks } from "@/features/tasks/actions/task-actions";
import { getProjects } from "@/features/projects/actions/project-actions";
import { getEvents } from "@/features/calendar/actions/event-actions";
import { getTimeEntries } from "@/features/company/actions/company-actions";

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const firstName = session.user.name?.split(" ")[0] || "there";

    // Fetch real data
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const nextWeekEnd = addDays(weekEnd, 7);

    const [todayTasks, allProjects, weekEvents, timeEntries] = await Promise.all([
        getTasks({ today: true }),
        getProjects(),
        getEvents({ startDate: weekStart, endDate: weekEnd }),
        getTimeEntries({ startDate: weekStart, endDate: weekEnd }),
    ]);

    // Calculate stats
    const completedTodayTasks = todayTasks.filter(t => t.status === "DONE").length;
    const activeProjects = allProjects.filter(p => ["PLANNING", "ACTIVE"].includes(p.status));
    const totalMinutes = timeEntries.reduce((acc, e) => acc + (e.duration || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    // Get upcoming deadlines (tasks with due dates in next 7 days)
    const upcomingTasks = await getTasks({ thisWeek: true });
    const upcomingDeadlines = upcomingTasks
        .filter(t => t.dueDate && t.status !== "DONE")
        .map(t => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate!,
            type: "Task" as const,
            context: t.context,
        }));

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Good {getGreeting()}, {firstName}
                </h1>
                <p className="text-muted-foreground">
                    {format(new Date(), "EEEE, MMMM d, yyyy")}
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Today's Tasks"
                    value={String(todayTasks.length)}
                    description={`${completedTodayTasks} completed`}
                />
                <StatCard
                    title="Active Projects"
                    value={String(activeProjects.length)}
                    description={`${allProjects.length} total`}
                />
                <StatCard
                    title="Upcoming Events"
                    value={String(weekEvents.length)}
                    description="This week"
                />
                <StatCard
                    title="Hours Tracked"
                    value={String(totalHours)}
                    description="This week"
                />
            </div>

            {/* Main Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                <TodayTasks tasks={todayTasks} />
                <UpcomingDeadlines deadlines={upcomingDeadlines} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <ActiveProjects projects={activeProjects} />
                <CalendarPreview events={weekEvents} />
            </div>
        </div>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
}

function StatCard({
    title,
    value,
    description,
    trend,
}: {
    title: string;
    value: string;
    description: string;
    trend?: string;
}) {
    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            {trend && (
                <p className="mt-2 text-xs text-emerald-500">{trend}</p>
            )}
        </div>
    );
}

