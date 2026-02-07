import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEvents } from "@/features/calendar/actions/event-actions";
import { CalendarPageClient } from "./calendar-page-client";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export default async function CalendarPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Get events for current month plus buffer
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, 1));
    const endDate = endOfMonth(addMonths(now, 2));

    const events = await getEvents({ startDate, endDate });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                <p className="text-muted-foreground">
                    Plan your time and schedule events
                </p>
            </div>

            <CalendarPageClient events={events} />
        </div>
    );
}
