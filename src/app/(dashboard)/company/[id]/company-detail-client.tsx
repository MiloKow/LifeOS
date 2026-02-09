"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
    ArrowLeft,
    Building2,
    ChevronDown,
    Clock,
    DollarSign,
    FileText,
    MoreHorizontal,
    Pencil,
    Plus,
    Settings,
    Trash2,
    TrendingUp,
    Users,
    Folder,
    Receipt,
    Send,
    CheckCircle,
    AlertCircle,
    Wallet,
    CalendarClock,
    Calendar,
} from "lucide-react";
import { updateCompany, deleteCompany } from "@/features/company/actions/company-actions";
import { createClient, type ClientInput } from "@/features/company/actions/client-actions";
import { createInvoice, updateInvoice, markInvoiceAsPaid, type InvoiceInput } from "@/features/company/actions/invoice-actions";
import { createExpense, deleteExpense, type ExpenseInput } from "@/features/company/actions/expense-actions";
import type { Company, Project, Transaction, Client, Invoice, Expense, Event, ExpenseType, SubscriptionFrequency } from "@prisma/client";
import { EventForm } from "@/features/calendar/components/event-form";
import { deleteEvent } from "@/features/calendar/actions/event-actions";

// Types
type CompanyWithDetails = Company & {
    projects: (Project & {
        tasks: { id: string; status: string }[];
        timeEntries: { duration: number | null }[];
    })[];
    transactions: Transaction[];
};

type ClientWithCount = Client & {
    _count: { invoices: number };
};

type InvoiceWithClient = Invoice & {
    client: { id: string; name: string; email: string | null };
    _count: { items: number };
};

type EventWithRelations = Event & {
    task: { id: string; title: string; status: string } | null;
    project: { id: string; name: string; color: string | null } | null;
    company: { id: string; name: string } | null;
};

interface CompanyDetailClientProps {
    company: CompanyWithDetails;
    clients: ClientWithCount[];
    invoices: InvoiceWithClient[];
    subscriptionMetrics: {
        mrr: number;
        arr: number;
        activeSubscriptions: number;
        totalClients: number;
    };
    invoiceSummary: {
        draft: number;
        sent: number;
        paid: number;
        overdue: number;
        totalPending: number;
        totalPaid: number;
    };
    expenses: Expense[];
    expenseSummary: {
        totalOneTime: number;
        monthlySubscriptions: number;
        yearlySubscriptions: number;
    };
    events: EventWithRelations[];
}

export function CompanyDetailClient({
    company,
    clients,
    invoices,
    subscriptionMetrics,
    invoiceSummary,
    expenses,
    expenseSummary,
    events,
}: CompanyDetailClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("overview");

    // Settings state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [companyName, setCompanyName] = useState(company.name);
    const [companyDescription, setCompanyDescription] = useState(company.description || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Client state
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [subscriptionType, setSubscriptionType] = useState<string>("");
    const [subscriptionAmount, setSubscriptionAmount] = useState("");

    // Invoice state
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState("");
    const [invoiceDueDate, setInvoiceDueDate] = useState("");
    const [invoiceItems, setInvoiceItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);

    // Event state
    const [isEventFormOpen, setIsEventFormOpen] = useState(false);

    // Expense state
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [expenseName, setExpenseName] = useState("");
    const [expenseDescription, setExpenseDescription] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseType, setExpenseType] = useState<string>("ONE_TIME");
    const [expenseFrequency, setExpenseFrequency] = useState<string>("MONTHLY");
    const [expenseRenewalDate, setExpenseRenewalDate] = useState("");

    // Calculate metrics
    const totalHours = company.projects.reduce((acc, p) =>
        acc + p.timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0), 0
    ) / 60;
    const totalTasks = company.projects.reduce((acc, p) => acc + p.tasks.length, 0);
    const completedTasks = company.projects.reduce(
        (acc, p) => acc + p.tasks.filter(t => t.status === "DONE").length, 0
    );

    // Handlers
    async function handleUpdateCompany() {
        if (!companyName.trim()) return;
        setIsSubmitting(true);
        try {
            const result = await updateCompany(company.id, {
                name: companyName.trim(),
                description: companyDescription.trim() || undefined,
            });
            if (result.success) {
                setIsEditDialogOpen(false);
                router.refresh();
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteCompany() {
        setIsSubmitting(true);
        try {
            const result = await deleteCompany(company.id);
            if (result.success) {
                router.push("/company");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleCreateClient() {
        if (!clientName.trim()) return;
        setIsSubmitting(true);
        try {
            const data: ClientInput = {
                name: clientName.trim(),
                email: clientEmail.trim() || undefined,
                phone: clientPhone.trim() || undefined,
                subscriptionType: subscriptionType || undefined,
                subscriptionAmount: subscriptionAmount ? parseFloat(subscriptionAmount) : undefined,
            };
            const result = await createClient(company.id, data);
            if (result.success) {
                setClientName("");
                setClientEmail("");
                setClientPhone("");
                setSubscriptionType("");
                setSubscriptionAmount("");
                setIsClientDialogOpen(false);
                router.refresh();
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleCreateInvoice() {
        if (!selectedClientId || !invoiceDueDate || invoiceItems.length === 0) return;
        setIsSubmitting(true);
        try {
            const data: InvoiceInput = {
                clientId: selectedClientId,
                dueDate: new Date(invoiceDueDate),
                items: invoiceItems.filter(i => i.description.trim() && i.unitPrice > 0),
            };
            const result = await createInvoice(company.id, data);
            if (result.success) {
                setSelectedClientId("");
                setInvoiceDueDate("");
                setInvoiceItems([{ description: "", quantity: 1, unitPrice: 0 }]);
                setIsInvoiceDialogOpen(false);
                router.refresh();
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleMarkAsPaid(invoiceId: string) {
        const result = await markInvoiceAsPaid(invoiceId);
        if (result.success) {
            router.refresh();
        }
    }

    async function handleMarkAsSent(invoiceId: string) {
        const result = await updateInvoice(invoiceId, { status: "SENT" });
        if (result.success) {
            router.refresh();
        }
    }

    function addInvoiceItem() {
        setInvoiceItems([...invoiceItems, { description: "", quantity: 1, unitPrice: 0 }]);
    }

    function updateInvoiceItem(index: number, field: string, value: string | number) {
        const newItems = [...invoiceItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setInvoiceItems(newItems);
    }

    function removeInvoiceItem(index: number) {
        if (invoiceItems.length > 1) {
            setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
        }
    }

    const invoiceTotal = invoiceItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

    async function handleCreateExpense() {
        if (!expenseName.trim() || !expenseAmount) return;
        setIsSubmitting(true);
        try {
            const data: ExpenseInput = {
                name: expenseName.trim(),
                description: expenseDescription.trim() || undefined,
                amount: parseFloat(expenseAmount),
                type: expenseType as "ONE_TIME" | "SUBSCRIPTION",
                frequency: expenseType === "SUBSCRIPTION" ? expenseFrequency as "MONTHLY" | "YEARLY" : undefined,
                renewalDate: expenseType === "SUBSCRIPTION" && expenseRenewalDate
                    ? new Date(expenseRenewalDate)
                    : undefined,
            };
            const result = await createExpense(company.id, data);
            if (result.success) {
                setExpenseName("");
                setExpenseDescription("");
                setExpenseAmount("");
                setExpenseType("ONE_TIME");
                setExpenseFrequency("MONTHLY");
                setExpenseRenewalDate("");
                setIsExpenseDialogOpen(false);
                router.refresh();
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteEvent(eventId: string) {
        const result = await deleteEvent(eventId);
        if (result.success) {
            router.refresh();
        }
    }

    async function handleDeleteExpense(expenseId: string) {
        const result = await deleteExpense(expenseId);
        if (result.success) {
            router.refresh();
        }
    }

    const monthlyExpensesCost = expenseSummary.monthlySubscriptions + (expenseSummary.yearlySubscriptions / 12);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "DRAFT":
                return <Badge variant="secondary">Brouillon</Badge>;
            case "SENT":
                return <Badge variant="default" className="bg-blue-500">Envoyée</Badge>;
            case "PAID":
                return <Badge variant="default" className="bg-emerald-500">Payée</Badge>;
            case "OVERDUE":
                return <Badge variant="destructive">En retard</Badge>;
            case "CANCELLED":
                return <Badge variant="secondary">Annulée</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/company">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                        {company.description && (
                            <p className="text-muted-foreground">{company.description}</p>
                        )}
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            Actions <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="w-full justify-start overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Vue d&apos;ensemble
                    </TabsTrigger>
                    <TabsTrigger value="clients" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Clients ({clients.length})
                    </TabsTrigger>
                    <TabsTrigger value="invoices" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Factures ({invoices.length})
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Dépenses ({expenses.length})
                    </TabsTrigger>
                    <TabsTrigger value="events" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Événements ({events.length})
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        Projets ({company.projects.length})
                    </TabsTrigger>
                </TabsList>


                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">MRR</CardTitle>
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-500">
                                    €{subscriptionMetrics.mrr.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {subscriptionMetrics.activeSubscriptions} abonnements actifs
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">ARR</CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-500">
                                    €{subscriptionMetrics.arr.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Revenu annuel récurrent
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Clients</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{subscriptionMetrics.totalClients}</div>
                                <p className="text-xs text-muted-foreground">
                                    {subscriptionMetrics.activeSubscriptions} avec abonnement
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
                                <Receipt className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-500">
                                    €{invoiceSummary.totalPending.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {invoiceSummary.sent + invoiceSummary.overdue} factures
                                    {invoiceSummary.overdue > 0 && (
                                        <span className="text-destructive"> ({invoiceSummary.overdue} en retard)</span>
                                    )}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Projects & Time */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Projets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total</span>
                                        <span className="font-medium">{company.projects.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tâches complétées</span>
                                        <span className="font-medium">{completedTasks}/{totalTasks}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Heures trackées</span>
                                        <span className="font-medium">{totalHours.toFixed(1)}h</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Facturation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total encaissé</span>
                                        <span className="font-medium text-emerald-500">
                                            €{invoiceSummary.totalPaid.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Brouillons</span>
                                        <span className="font-medium">{invoiceSummary.draft}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Payées</span>
                                        <span className="font-medium">{invoiceSummary.paid}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Clients Tab */}
                <TabsContent value="clients" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Clients</h2>
                        <Button onClick={() => setIsClientDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter un client
                        </Button>
                    </div>

                    {clients.length === 0 ? (
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardContent className="text-center py-8">
                                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">Aucun client pour le moment</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setIsClientDialogOpen(true)}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Ajouter votre premier client
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {clients.map((client) => (
                                <Card key={client.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-base">{client.name}</CardTitle>
                                                {client.email && (
                                                    <CardDescription>{client.email}</CardDescription>
                                                )}
                                            </div>
                                            {client.isActive && client.subscriptionAmount && (
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                    Actif
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            {client.subscriptionAmount && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Abonnement</span>
                                                    <span className="font-medium">
                                                        €{Number(client.subscriptionAmount).toLocaleString()}/
                                                        {client.subscriptionType === "monthly" ? "mois" : "an"}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Factures</span>
                                                <span className="font-medium">{client._count.invoices}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Invoices Tab */}
                <TabsContent value="invoices" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Factures</h2>
                        <Button
                            onClick={() => setIsInvoiceDialogOpen(true)}
                            disabled={clients.length === 0}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Créer une facture
                        </Button>
                    </div>

                    {clients.length === 0 ? (
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardContent className="text-center py-8">
                                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">Ajoutez d&apos;abord un client pour créer des factures</p>
                            </CardContent>
                        </Card>
                    ) : invoices.length === 0 ? (
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardContent className="text-center py-8">
                                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">Aucune facture pour le moment</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setIsInvoiceDialogOpen(true)}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Créer votre première facture
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {invoices.map((invoice) => (
                                <Card key={invoice.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{invoice.invoiceNumber}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {invoice.client.name} • {format(new Date(invoice.issueDate), "dd/MM/yyyy")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-medium">€{Number(invoice.total).toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Échéance: {format(new Date(invoice.dueDate), "dd/MM/yyyy")}
                                                    </p>
                                                </div>
                                                {getStatusBadge(invoice.status)}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {invoice.status === "DRAFT" && (
                                                            <DropdownMenuItem onClick={() => handleMarkAsSent(invoice.id)}>
                                                                <Send className="mr-2 h-4 w-4" />
                                                                Marquer comme envoyée
                                                            </DropdownMenuItem>
                                                        )}
                                                        {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                                                            <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                Marquer comme payée
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Dépenses</h2>
                        <Button onClick={() => setIsExpenseDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter une dépense
                        </Button>
                    </div>

                    {/* Expense Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Dépenses ponctuelles</CardTitle>
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    €{expenseSummary.totalOneTime.toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Abonnements mensuels</CardTitle>
                                <CalendarClock className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-500">
                                    €{expenseSummary.monthlySubscriptions.toLocaleString()}/mois
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Abonnements annuels</CardTitle>
                                <CalendarClock className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-500">
                                    €{expenseSummary.yearlySubscriptions.toLocaleString()}/an
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    ~€{(expenseSummary.yearlySubscriptions / 12).toFixed(0)}/mois
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Expense List */}
                    {expenses.length === 0 ? (
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardContent className="flex flex-col items-center justify-center py-10">
                                <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">Aucune dépense</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Commencez par ajouter vos dépenses et abonnements
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {/* Subscriptions Section */}
                            {expenses.filter(e => e.type === "SUBSCRIPTION").length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-medium text-muted-foreground">Abonnements</h3>
                                    {expenses.filter(e => e.type === "SUBSCRIPTION").map((expense) => (
                                        <Card key={expense.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                                            <CardContent className="flex items-center justify-between py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-2 h-10 rounded-full",
                                                        expense.frequency === "MONTHLY" ? "bg-blue-500" : "bg-purple-500"
                                                    )} />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{expense.name}</span>
                                                            <Badge variant="secondary">
                                                                {expense.frequency === "MONTHLY" ? "Mensuel" : "Annuel"}
                                                            </Badge>
                                                        </div>
                                                        {expense.description && (
                                                            <p className="text-sm text-muted-foreground">{expense.description}</p>
                                                        )}
                                                        {expense.renewalDate && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Prochain renouvellement: {format(new Date(expense.renewalDate), "dd/MM/yyyy")}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className={cn(
                                                            "font-bold",
                                                            expense.frequency === "MONTHLY" ? "text-blue-500" : "text-purple-500"
                                                        )}>
                                                            €{Number(expense.amount).toLocaleString()}
                                                            <span className="text-sm font-normal">
                                                                /{expense.frequency === "MONTHLY" ? "mois" : "an"}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDeleteExpense(expense.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* One-time Expenses Section */}
                            {expenses.filter(e => e.type === "ONE_TIME").length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-medium text-muted-foreground">Dépenses ponctuelles</h3>
                                    {expenses.filter(e => e.type === "ONE_TIME").map((expense) => (
                                        <Card key={expense.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                                            <CardContent className="flex items-center justify-between py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-2 h-10 rounded-full bg-orange-500" />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{expense.name}</span>
                                                            <Badge variant="outline">Ponctuel</Badge>
                                                        </div>
                                                        {expense.description && (
                                                            <p className="text-sm text-muted-foreground">{expense.description}</p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {format(new Date(expense.date), "dd/MM/yyyy")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className="font-bold text-orange-500">
                                                        €{Number(expense.amount).toLocaleString()}
                                                    </p>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDeleteExpense(expense.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Événements</h2>
                        <Button onClick={() => setIsEventFormOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter un événement
                        </Button>
                    </div>

                    {events.length === 0 ? (
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardContent className="flex flex-col items-center justify-center py-10">
                                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">Aucun événement</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Ajoutez des événements liés à cette entreprise
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setIsEventFormOpen(true)}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Ajouter votre premier événement
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {events.map((event) => {
                                const isPast = new Date(event.endTime) < new Date();
                                return (
                                    <Card key={event.id} className={cn(
                                        "border-border/50 bg-card/50 backdrop-blur-sm",
                                        isPast && "opacity-60"
                                    )}>
                                        <CardContent className="flex items-center justify-between py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-2 h-10 rounded-full bg-emerald-500" />
                                                <div>
                                                    <p className="font-medium">{event.title}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {event.allDay
                                                            ? format(new Date(event.startTime), "dd/MM/yyyy")
                                                            : `${format(new Date(event.startTime), "dd/MM/yyyy HH:mm")} - ${format(new Date(event.endTime), "HH:mm")}`
                                                        }
                                                    </p>
                                                    {event.description && (
                                                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {event.allDay && (
                                                    <Badge variant="secondary">Journée entière</Badge>
                                                )}
                                                {event.isTimeBlock && (
                                                    <Badge variant="secondary">Bloc de temps</Badge>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Projects Tab */}
                <TabsContent value="projects" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Projets liés</h2>
                        <Button asChild>
                            <Link href="/projects">
                                <Plus className="mr-2 h-4 w-4" />
                                Gérer les projets
                            </Link>
                        </Button>
                    </div>

                    {company.projects.length === 0 ? (
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardContent className="text-center py-8">
                                <Folder className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">Aucun projet lié à cette entreprise</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Associez des projets à cette entreprise depuis la page Projets
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {company.projects.map((project) => {
                                const completedCount = project.tasks.filter(t => t.status === "DONE").length;
                                const progress = project.tasks.length > 0
                                    ? Math.round((completedCount / project.tasks.length) * 100)
                                    : 0;
                                const hours = project.timeEntries.reduce((acc, e) => acc + (e.duration || 0), 0) / 60;

                                return (
                                    <Link key={project.id} href={`/projects/${project.id}`}>
                                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base">{project.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Progression</span>
                                                        <span className="font-medium">{progress}%</span>
                                                    </div>
                                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">
                                                            {completedCount}/{project.tasks.length} tâches
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {hours.toFixed(1)}h
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Edit Company Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier l&apos;entreprise</DialogTitle>
                        <DialogDescription>
                            Modifiez les informations de votre entreprise.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nom</Label>
                            <Input
                                id="edit-name"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={companyDescription}
                                onChange={(e) => setCompanyDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleUpdateCompany} disabled={isSubmitting || !companyName.trim()}>
                            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Company Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer l&apos;entreprise ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Tous les clients, factures et données associées seront supprimés.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCompany}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isSubmitting ? "Suppression..." : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create Client Dialog */}
            <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter un client</DialogTitle>
                        <DialogDescription>
                            Ajoutez un nouveau client à votre entreprise.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="client-name">Nom *</Label>
                            <Input
                                id="client-name"
                                placeholder="Nom du client"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="client-email">Email</Label>
                                <Input
                                    id="client-email"
                                    type="email"
                                    placeholder="email@exemple.com"
                                    value={clientEmail}
                                    onChange={(e) => setClientEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="client-phone">Téléphone</Label>
                                <Input
                                    id="client-phone"
                                    placeholder="+33 6 12 34 56 78"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="border-t pt-4">
                            <p className="text-sm font-medium mb-3">Abonnement (optionnel)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="subscription-type">Type</Label>
                                    <Select value={subscriptionType} onValueChange={setSubscriptionType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Mensuel</SelectItem>
                                            <SelectItem value="yearly">Annuel</SelectItem>
                                            <SelectItem value="one-time">Paiement unique</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subscription-amount">Montant (€)</Label>
                                    <Input
                                        id="subscription-amount"
                                        type="number"
                                        placeholder="99"
                                        value={subscriptionAmount}
                                        onChange={(e) => setSubscriptionAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsClientDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreateClient} disabled={isSubmitting || !clientName.trim()}>
                            {isSubmitting ? "Création..." : "Créer le client"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Invoice Dialog */}
            <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Créer une facture</DialogTitle>
                        <DialogDescription>
                            Créez une nouvelle facture pour un client.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="invoice-client">Client *</Label>
                                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice-due-date">Date d&apos;échéance *</Label>
                                <Input
                                    id="invoice-due-date"
                                    type="date"
                                    value={invoiceDueDate}
                                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Articles</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Ajouter
                                </Button>
                            </div>

                            {invoiceItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-6">
                                        <Input
                                            placeholder="Description"
                                            value={item.description}
                                            onChange={(e) => updateInvoiceItem(index, "description", e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            placeholder="Qté"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => updateInvoiceItem(index, "quantity", parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            placeholder="Prix €"
                                            min={0}
                                            step={0.01}
                                            value={item.unitPrice || ""}
                                            onChange={(e) => updateInvoiceItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="col-span-1"
                                        onClick={() => removeInvoiceItem(index)}
                                        disabled={invoiceItems.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-4 flex justify-between">
                            <span className="font-medium">Total</span>
                            <span className="text-xl font-bold">€{invoiceTotal.toLocaleString()}</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleCreateInvoice}
                            disabled={isSubmitting || !selectedClientId || !invoiceDueDate || invoiceTotal === 0}
                        >
                            {isSubmitting ? "Création..." : "Créer la facture"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Event Form Dialog */}
            <EventForm
                open={isEventFormOpen}
                onOpenChange={setIsEventFormOpen}
                defaultLinkType="company"
                defaultCompanyId={company.id}
            />

            {/* Expense Dialog */}
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Ajouter une dépense</DialogTitle>
                        <DialogDescription>
                            Ajoutez une dépense ponctuelle ou un abonnement récurrent.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expenseName" className="text-right">Nom *</Label>
                            <Input
                                id="expenseName"
                                value={expenseName}
                                onChange={(e) => setExpenseName(e.target.value)}
                                className="col-span-3"
                                placeholder="Ex: Hébergement, Licence logiciel..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expenseDescription" className="text-right">Description</Label>
                            <Textarea
                                id="expenseDescription"
                                value={expenseDescription}
                                onChange={(e) => setExpenseDescription(e.target.value)}
                                className="col-span-3"
                                placeholder="Description optionnelle..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expenseAmount" className="text-right">Montant (€) *</Label>
                            <Input
                                id="expenseAmount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                className="col-span-3"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expenseType" className="text-right">Type *</Label>
                            <Select value={expenseType} onValueChange={setExpenseType}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ONE_TIME">Dépense ponctuelle</SelectItem>
                                    <SelectItem value="SUBSCRIPTION">Abonnement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {expenseType === "SUBSCRIPTION" && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="expenseFrequency" className="text-right">Fréquence *</Label>
                                    <Select value={expenseFrequency} onValueChange={setExpenseFrequency}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MONTHLY">Mensuel</SelectItem>
                                            <SelectItem value="YEARLY">Annuel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="expenseRenewalDate" className="text-right">Prochain renouvellement</Label>
                                    <Input
                                        id="expenseRenewalDate"
                                        type="date"
                                        value={expenseRenewalDate}
                                        onChange={(e) => setExpenseRenewalDate(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleCreateExpense}
                            disabled={isSubmitting || !expenseName.trim() || !expenseAmount}
                        >
                            {isSubmitting ? "Ajout..." : "Ajouter"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
