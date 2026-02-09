"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CalendarIcon, Clock, Loader2, User, FolderKanban, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createEvent, updateEvent, getEventLinkOptions, type EventInput } from "@/features/calendar/actions/event-actions";
import type { Event } from "@prisma/client";

type LinkType = "personal" | "project" | "company";

interface EventFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event?: Event;
    defaultDate?: Date;
    defaultLinkType?: LinkType;
    defaultProjectId?: string;
    defaultCompanyId?: string;
}

export function EventForm({ open, onOpenChange, event, defaultDate, defaultLinkType, defaultProjectId, defaultCompanyId }: EventFormProps) {
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<{ id: string; name: string; color: string | null }[]>([]);
    const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    // Determine initial link type
    const getInitialLinkType = (): LinkType => {
        if (defaultLinkType) return defaultLinkType;
        if (event?.companyId) return "company";
        if (event?.projectId) return "project";
        return "personal";
    };

    const [linkType, setLinkType] = useState<LinkType>(getInitialLinkType());
    const [selectedProjectId, setSelectedProjectId] = useState<string>(
        defaultProjectId || event?.projectId || ""
    );
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
        defaultCompanyId || event?.companyId || ""
    );

    const [formData, setFormData] = useState<EventInput>({
        title: event?.title || "",
        description: event?.description || "",
        startTime: event?.startTime || defaultDate || new Date(),
        endTime: event?.endTime || defaultDate || new Date(),
        allDay: event?.allDay || false,
        isTimeBlock: event?.isTimeBlock || false,
        color: event?.color || undefined,
    });

    const [startTimeStr, setStartTimeStr] = useState(
        format(formData.startTime, "HH:mm")
    );
    const [endTimeStr, setEndTimeStr] = useState(
        format(formData.endTime, "HH:mm")
    );

    // Load projects and companies when dialog opens
    useEffect(() => {
        if (open) {
            setLoadingOptions(true);
            getEventLinkOptions().then(({ projects, companies }) => {
                setProjects(projects);
                setCompanies(companies);
                setLoadingOptions(false);
            });
        }
    }, [open]);

    function handleLinkTypeChange(type: LinkType) {
        setLinkType(type);
        if (type === "personal") {
            setSelectedProjectId("");
            setSelectedCompanyId("");
        } else if (type === "project") {
            setSelectedCompanyId("");
        } else if (type === "company") {
            setSelectedProjectId("");
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const startDate = new Date(formData.startTime);
            const endDate = new Date(formData.endTime);

            if (!formData.allDay) {
                const [startHours, startMins] = startTimeStr.split(":").map(Number);
                const [endHours, endMins] = endTimeStr.split(":").map(Number);
                startDate.setHours(startHours, startMins, 0, 0);
                endDate.setHours(endHours, endMins, 0, 0);
            }

            const data: EventInput = {
                ...formData,
                startTime: startDate,
                endTime: endDate,
                projectId: linkType === "project" ? selectedProjectId || null : null,
                companyId: linkType === "company" ? selectedCompanyId || null : null,
            };

            if (event) {
                await updateEvent(event.id, data);
            } else {
                await createEvent(data);
            }
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save event:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{event ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
                    <DialogDescription>
                        {event ? "Mettre à jour les détails de l'événement." : "Ajouter un nouvel événement à votre calendrier."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Titre</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Réunion, deadline, bloc de temps..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ""}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ajouter des détails..."
                            rows={2}
                        />
                    </div>

                    {/* Link type selector */}
                    <div className="space-y-2">
                        <Label>Lier à</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => handleLinkTypeChange("personal")}
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
                                onClick={() => handleLinkTypeChange("project")}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-all",
                                    linkType === "project"
                                        ? "border-violet-500 bg-violet-500/10 text-violet-500"
                                        : "border-border hover:border-violet-500/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <FolderKanban className="h-4 w-4" />
                                Projet
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLinkTypeChange("company")}
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

                    {/* Project selector */}
                    {linkType === "project" && (
                        <div className="space-y-2">
                            <Label>Projet</Label>
                            {loadingOptions ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Chargement...
                                </div>
                            ) : projects.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Aucun projet disponible</p>
                            ) : (
                                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un projet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((project) => (
                                            <SelectItem key={project.id} value={project.id}>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: project.color || "#6366f1" }}
                                                    />
                                                    {project.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}

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

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="allDay"
                                checked={formData.allDay}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, allDay: checked as boolean })
                                }
                            />
                            <Label htmlFor="allDay" className="text-sm">Toute la journée</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="timeBlock"
                                checked={formData.isTimeBlock}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isTimeBlock: checked as boolean })
                                }
                            />
                            <Label htmlFor="timeBlock" className="text-sm">Bloc de temps</Label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date de début</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(formData.startTime, "PPP")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.startTime}
                                        onSelect={(date) =>
                                            date && setFormData({ ...formData, startTime: date, endTime: date })
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {!formData.allDay && (
                            <div className="space-y-2">
                                <Label>Heure de début</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="time"
                                        value={startTimeStr}
                                        onChange={(e) => setStartTimeStr(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date de fin</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(formData.endTime, "PPP")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.endTime}
                                        onSelect={(date) =>
                                            date && setFormData({ ...formData, endTime: date })
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {!formData.allDay && (
                            <div className="space-y-2">
                                <Label>Heure de fin</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="time"
                                        value={endTimeStr}
                                        onChange={(e) => setEndTimeStr(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : event ? (
                                "Modifier"
                            ) : (
                                "Créer"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
