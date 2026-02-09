"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, RefreshCw } from "lucide-react";

interface Renewal {
    id: string;
    name: string;
    amount: any;
    renewalDate: Date | null;
    company: { id: string; name: string };
    frequency?: string | null;
}

interface UpcomingRenewalsProps {
    renewals: Renewal[];
}

export function UpcomingRenewals({ renewals }: UpcomingRenewalsProps) {
    if (renewals.length === 0) {
        return (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-muted-foreground" />
                        Upcoming Renewals
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <RefreshCw className="h-8 w-8 text-muted-foreground mb-3 opacity-20" />
                        <p className="text-muted-foreground">No upcoming renewals in the next 30 days</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-amber-500" />
                    Upcoming Renewals
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {renewals.slice(0, 5).map((renewal) => {
                        const daysUntil = Math.ceil(
                            (new Date(renewal.renewalDate!).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        );

                        return (
                            <Link
                                key={renewal.id}
                                href={`/company/${renewal.company.id}`}
                                className="flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                                        <RefreshCw className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                                            {renewal.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {renewal.company.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">€{Number(renewal.amount).toLocaleString()}</p>
                                    <Badge
                                        variant={daysUntil <= 7 ? "destructive" : "secondary"}
                                        className="text-[10px] px-1.5 h-5"
                                    >
                                        {daysUntil <= 0 ? "Today" : `${daysUntil} days`}
                                    </Badge>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
