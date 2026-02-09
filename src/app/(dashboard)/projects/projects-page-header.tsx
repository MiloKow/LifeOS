"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectForm } from "@/features/projects/components/project-form";
import { getCompanies } from "@/features/company/actions/company-actions";
import type { Company } from "@prisma/client";

export function ProjectsPageHeader() {
    const [showForm, setShowForm] = useState(false);
    const [companies, setCompanies] = useState<Pick<Company, "id" | "name">[]>([]);

    useEffect(() => {
        async function loadCompanies() {
            const data = await getCompanies();
            setCompanies(data.map(c => ({ id: c.id, name: c.name })));
        }
        loadCompanies();
    }, []);

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground">
                        Manage your personal, Epitech, and company projects
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                </Button>
            </div>

            <ProjectForm
                open={showForm}
                onOpenChange={setShowForm}
                companies={companies}
            />
        </>
    );
}
