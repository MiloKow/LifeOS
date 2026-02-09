import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCompany } from "@/features/company/actions/company-actions";
import { getClients, getSubscriptionMetrics } from "@/features/company/actions/client-actions";
import { getInvoices, getInvoiceSummary } from "@/features/company/actions/invoice-actions";
import { getExpenses, getExpenseSummary } from "@/features/company/actions/expense-actions";
import { CompanyDetailClient } from "./company-detail-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const { id } = await params;
    const company = await getCompany(id);

    if (!company) {
        notFound();
    }

    const [clients, invoices, subscriptionMetrics, invoiceSummary, expenses, expenseSummary] = await Promise.all([
        getClients(id),
        getInvoices(id),
        getSubscriptionMetrics(id),
        getInvoiceSummary(id),
        getExpenses(id),
        getExpenseSummary(id),
    ]);

    return (
        <CompanyDetailClient
            company={company}
            clients={clients}
            invoices={invoices}
            subscriptionMetrics={subscriptionMetrics}
            invoiceSummary={invoiceSummary}
            expenses={expenses}
            expenseSummary={expenseSummary}
        />
    );
}
