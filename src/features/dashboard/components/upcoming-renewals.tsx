"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, RefreshCw, User } from "lucide-react";

interface Renewal {
    id: string;
    name: string;
    amount: any;
    renewalDate: Date | null;
    company: { id: string; name: string } | null;
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

                        const isPersonal = !renewal.company;

                        const content = (
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                                        <RefreshCw className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                                            {renewal.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            {isPersonal ? (
                                                <>
                                                    <User className="h-3 w-3" />
                                                    Personnel
                                                </>
                                            ) : (
                                                renewal.company!.name
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">€{Number(renewal.amount).toLocaleString()}</p>
                                    <Badge
                                        variant={daysUntil <= 7 ? "destructive" : "secondary"}
                                        className="text-[10px] px-1.5 h-5"
                                    >
                                        {daysUntil <= 0 ? "Aujourd'hui" : `${daysUntil}j`}
                                    </Badge>
                                </div>
                            </div>
                        );

                        if (isPersonal) {
                            return (
                                <Link
                                    key={renewal.id}
                                    href="/calendar"
                                >
                                    {content}
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={renewal.id}
                                href={`/company/${renewal.company!.id}`}
                            >
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
