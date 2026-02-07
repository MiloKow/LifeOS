"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Building2, Clock, DollarSign, Plus, TrendingDown, TrendingUp } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCompany } from "@/features/company/actions/company-actions";
import type { Company, TimeEntry, Project } from "@prisma/client";

type CompanyWithCount = Company & {
    _count: {
        projects: number;
        transactions: number;
    };
};

type TimeEntryWithProject = TimeEntry & {
    project: {
        id: string;
        name: string;
        color: string | null;
        company: { id: string; name: string } | null;
    };
};

interface CompanyPageClientProps {
    companies: CompanyWithCount[];
    timeEntries: TimeEntryWithProject[];
    totalHours: number;
    financialSummary: {
        income: number;
        expenses: number;
        balance: number;
    };
}

export function CompanyPageClient({
    companies,
    timeEntries,
    totalHours,
    financialSummary,
}: CompanyPageClientProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [companyName, setCompanyName] = useState("");
    const [companyDescription, setCompanyDescription] = useState("");

    async function handleCreateCompany() {
        if (!companyName.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await createCompany({
                name: companyName.trim(),
                description: companyDescription.trim() || undefined,
            });

            if (result.success) {
                setCompanyName("");
                setCompanyDescription("");
                setIsDialogOpen(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Company</h1>
                    <p className="text-muted-foreground">
                        Manage your business, track time, and monitor finances
                    </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Company
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Companies</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companies.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {companies.reduce((acc, c) => acc + c._count.projects, 0)} total projects
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalHours}h</div>
                        <p className="text-xs text-muted-foreground">
                            {timeEntries.length} time entries
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">
                            €{financialSummary.income.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-2xl font-bold",
                            financialSummary.balance >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                            €{financialSummary.balance.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            €{financialSummary.expenses.toLocaleString()} expenses
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Companies List */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Your Companies</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {companies.length === 0 ? (
                            <div className="text-center py-8">
                                <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">No companies yet</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add your first company
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {companies.map((company) => (
                                    <div
                                        key={company.id}
                                        className="flex items-center justify-between rounded-lg border border-border/50 p-4 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                <Building2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{company.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {company._count.projects} projects
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm">
                                            View
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Time Entries */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Recent Time Entries</CardTitle>
                        <Button variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Log Time
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {timeEntries.length === 0 ? (
                            <div className="text-center py-8">
                                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">No time entries this week</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {timeEntries.slice(0, 5).map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: entry.project.color || "#6366f1" }}
                                            />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {entry.description || entry.project.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {entry.project.name}
                                                    {entry.project.company && ` • ${entry.project.company.name}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">
                                                {entry.duration ? `${Math.round(entry.duration / 60 * 10) / 10}h` : "-"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(entry.startTime), "MMM d")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Create Company Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Company</DialogTitle>
                        <DialogDescription>
                            Add a new company to organize your projects and track time.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="Company name"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description of the company"
                                value={companyDescription}
                                onChange={(e) => setCompanyDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCompany} disabled={isSubmitting || !companyName.trim()}>
                            {isSubmitting ? "Creating..." : "Create Company"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

