"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    createPersonalSubscription,
    createExpense,
    type ExpenseInput,
} from "@/features/company/actions/expense-actions";
import { getEventLinkOptions } from "@/features/calendar/actions/event-actions";

type LinkType = "personal" | "company";

interface SubscriptionFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SubscriptionForm({ open, onOpenChange }: SubscriptionFormProps) {
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [linkType, setLinkType] = useState<LinkType>("personal");
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [frequency, setFrequency] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
    const [renewalDate, setRenewalDate] = useState<Date | undefined>(undefined);

    // Load companies when dialog opens
    useEffect(() => {
        if (open) {
            setLoadingOptions(true);
            getEventLinkOptions().then(({ companies }) => {
                setCompanies(companies);
                setLoadingOptions(false);
            });
        }
    }, [open]);

    function resetForm() {
        setName("");
        setDescription("");
        setAmount("");
        setFrequency("MONTHLY");
        setRenewalDate(undefined);
        setLinkType("personal");
        setSelectedCompanyId("");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !amount || !renewalDate) return;

        setLoading(true);

        try {
            const data: ExpenseInput = {
                name: name.trim(),
                description: description.trim() || undefined,
                amount: parseFloat(amount),
                type: "SUBSCRIPTION",
                frequency,
                renewalDate,
            };

            let result;
            if (linkType === "company" && selectedCompanyId) {
                result = await createExpense(selectedCompanyId, data);
            } else {
                result = await createPersonalSubscription(data);
            }

            if (result.success) {
                resetForm();
                onOpenChange(false);
            }
        } catch (error) {
            console.error("Failed to create subscription:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Nouvel abonnement</DialogTitle>
                    <DialogDescription>
                        Ajoutez un abonnement pour suivre vos dépenses récurrentes dans le calendrier.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sub-name">Nom *</Label>
                        <Input
                            id="sub-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Netflix, Spotify, Hébergement..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sub-description">Description</Label>
                        <Textarea
                            id="sub-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Détails optionnels..."
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sub-amount">Montant (€) *</Label>
                            <Input
                                id="sub-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="9.99"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fréquence *</Label>
                            <Select value={frequency} onValueChange={(v) => setFrequency(v as "MONTHLY" | "YEARLY")}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MONTHLY">Mensuel</SelectItem>
                                    <SelectItem value="YEARLY">Annuel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Prochain prélèvement *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start",
                                        !renewalDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {renewalDate
                                        ? format(renewalDate, "PPP")
                                        : "Sélectionner une date"
                                    }
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={renewalDate}
                                    onSelect={setRenewalDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Link type selector */}
                    <div className="space-y-2">
                        <Label>Lier à</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => { setLinkType("personal"); setSelectedCompanyId(""); }}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-all",
                                    linkType === "personal"
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <User className="h-4 w-4" />
                                Personnel
                            </button>
                            <button
                                type="button"
                                onClick={() => setLinkType("company")}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-all",
                                    linkType === "company"
                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                                        : "border-border hover:border-emerald-500/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Building2 className="h-4 w-4" />
                                Entreprise
                            </button>
                        </div>
                    </div>

                    {/* Company selector */}
                    {linkType === "company" && (
                        <div className="space-y-2">
                            <Label>Entreprise</Label>
                            {loadingOptions ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Chargement...
                                </div>
                            ) : companies.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Aucune entreprise disponible</p>
                            ) : (
                                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une entreprise" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map((company) => (
                                            <SelectItem key={company.id} value={company.id}>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-3 w-3 text-emerald-500" />
                                                    {company.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}

                    {/* Résumé */}
                    {name && amount && (
                        <div className="rounded-lg bg-muted/50 border border-border/50 p-3">
                            <p className="text-sm text-muted-foreground">Résumé</p>
                            <p className="text-sm font-medium mt-1">
                                <span className="text-amber-500 font-bold">€{parseFloat(amount || "0").toLocaleString()}</span>
                                <span className="text-muted-foreground">
                                    /{frequency === "MONTHLY" ? "mois" : "an"}
                                </span>
                                <span className="text-muted-foreground"> — </span>
                                {name}
                            </p>
                            {frequency === "YEARLY" && amount && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    ≈ €{(parseFloat(amount) / 12).toFixed(2)}/mois
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !name.trim() || !amount || !renewalDate}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                "Ajouter l'abonnement"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
