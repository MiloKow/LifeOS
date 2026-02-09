"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
    SelectSeparator,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createProject, updateProject, type ProjectInput } from "@/features/projects/actions/project-actions";
import { ProjectStatus, Context, type Project, type Company } from "@prisma/client";

const projectColors = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ef4444", // Red
    "#14b8a6", // Teal
];

interface ProjectFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project?: Project;
    companies?: Pick<Company, "id" | "name">[];
}

export function ProjectForm({ open, onOpenChange, project, companies = [] }: ProjectFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ProjectInput>({
        name: project?.name || "",
        description: project?.description || "",
        status: project?.status || ProjectStatus.PLANNING,
        context: project?.context || Context.PERSONAL,
        startDate: project?.startDate || undefined,
        endDate: project?.endDate || undefined,
        color: project?.color || projectColors[0],
        companyId: project?.companyId || undefined,
    });

    // Combine context selection - "PERSONAL", "PROFESSIONAL", or "COMPANY:companyId"
    const [contextSelection, setContextSelection] = useState<string>(() => {
        if (project?.companyId) {
            return `COMPANY:${project.companyId}`;
        }
        return project?.context || Context.PERSONAL;
    });

    function handleContextChange(value: string) {
        setContextSelection(value);

        if (value.startsWith("COMPANY:")) {
            const companyId = value.replace("COMPANY:", "");
            setFormData({
                ...formData,
                context: Context.COMPANY,
                companyId,
            });
        } else {
            setFormData({
                ...formData,
                context: value as Context,
                companyId: undefined,
            });
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            if (project) {
                await updateProject(project.id, formData);
            } else {
                await createProject(formData);
            }
            onOpenChange(false);
            setFormData({
                name: "",
                description: "",
                status: ProjectStatus.PLANNING,
                context: Context.PERSONAL,
                startDate: undefined,
                endDate: undefined,
                color: projectColors[0],
                companyId: undefined,
            });
            setContextSelection(Context.PERSONAL);
        } catch (error) {
            console.error("Failed to save project:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{project ? "Edit Project" : "Create New Project"}</DialogTitle>
                    <DialogDescription>
                        {project ? "Update the project details below." : "Start a new project."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter project name..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ""}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What's this project about?"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value as ProjectStatus })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PLANNING">Planning</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Context</Label>
                            <Select
                                value={contextSelection}
                                onValueChange={handleContextChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select context..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Personnel</SelectLabel>
                                        <SelectItem value="PERSONAL">Personnel</SelectItem>
                                        <SelectItem value="PROFESSIONAL">Professionnel (Epitech)</SelectItem>
                                    </SelectGroup>
                                    {companies.length > 0 && (
                                        <>
                                            <SelectSeparator />
                                            <SelectGroup>
                                                <SelectLabel>Entreprises</SelectLabel>
                                                {companies.map((company) => (
                                                    <SelectItem key={company.id} value={`COMPANY:${company.id}`}>
                                                        {company.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !formData.startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.startDate}
                                        onSelect={(date) => setFormData({ ...formData, startDate: date })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !formData.endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.endDate ? format(formData.endDate, "PPP") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.endDate}
                                        onSelect={(date) => setFormData({ ...formData, endDate: date })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                            {projectColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={cn(
                                        "h-8 w-8 rounded-full transition-all",
                                        formData.color === color && "ring-2 ring-offset-2 ring-offset-background"
                                    )}
                                    style={{ backgroundColor: color, outlineColor: color }}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : project ? (
                                "Update Project"
                            ) : (
                                "Create Project"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
