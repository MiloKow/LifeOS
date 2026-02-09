import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEvents } from "@/features/calendar/actions/event-actions";
import { getTasksForCalendar } from "@/features/tasks/actions/task-actions";
import { getUpcomingRenewals } from "@/features/company/actions/expense-actions";
import { CalendarPageClient } from "./calendar-page-client";
import { startOfMonth, endOfMonth, addMonths, subMonths, differenceInDays } from "date-fns";

export default async function CalendarPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Get events and tasks for current month plus buffer
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, 1));
    const endDate = endOfMonth(addMonths(now, 2));

    // Get renewals for 90 days to cover the calendar range
    const daysRange = differenceInDays(endDate, now) + 30;

    const [events, tasks, renewals] = await Promise.all([
        getEvents({ startDate, endDate }),
        getTasksForCalendar({ startDate, endDate }),
        getUpcomingRenewals(daysRange),
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                <p className="text-muted-foreground">
                    Plan your time and schedule events
                </p>
            </div>

            <CalendarPageClient events={events} tasks={tasks} renewals={renewals} />
        </div>
    );
}
