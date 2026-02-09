import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCompanies, getTimeEntries, getFinancialSummary } from "@/features/company/actions/company-actions";
import { getUpcomingRenewals } from "@/features/company/actions/expense-actions";
import { CompanyPageClient } from "./company-page-client";
import { startOfWeek, endOfWeek } from "date-fns";

export default async function CompanyPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const companies = await getCompanies();

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const [timeEntries, financialSummary, upcomingRenewals] = await Promise.all([
        getTimeEntries({ startDate: weekStart, endDate: weekEnd }),
        getFinancialSummary(),
        getUpcomingRenewals(30), // Get renewals in next 30 days
    ]);

    // Calculate total hours this week
    const totalMinutes = timeEntries.reduce((acc, e) => acc + (e.duration || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    return (
        <CompanyPageClient
            companies={companies}
            timeEntries={timeEntries}
            totalHours={totalHours}
            financialSummary={financialSummary}
            upcomingRenewals={upcomingRenewals}
        />
    );
}
