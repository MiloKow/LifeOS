import {
    LayoutDashboard,
    CheckSquare,
    FolderKanban,
    Calendar,
    FileText,
    Building2,
} from "lucide-react";

export const navItems = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
    },
    {
        title: "Projects",
        href: "/projects",
        icon: FolderKanban,
    },
    {
        title: "Calendar",
        href: "/calendar",
        icon: Calendar,
    },
    {
        title: "Notes",
        href: "/notes",
        icon: FileText,
    },
    {
        title: "Company",
        href: "/company",
        icon: Building2,
    },
];
