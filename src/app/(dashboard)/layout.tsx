import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { NotificationChecker } from "@/features/notifications/components/notification-checker";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <NotificationChecker />
                <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
}
