"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface Project {
  id: string;
  protocol_number: string;
  protocol_name: string;
  protocol_status: string;
  trial_phase: string | null;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onProjectChange: (projectId: string) => void;
  className?: string;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onProjectChange,
  className,
}: ProjectSelectorProps) {
  return (
    <div className={className}>
      <Label htmlFor="project-select" className="text-sm font-medium mb-2 block">
        Select Project
      </Label>
      <Select value={selectedProjectId || undefined} onValueChange={(value) => value && onProjectChange(value)}>
        <SelectTrigger id="project-select" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {projects.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No projects assigned. Please contact your administrator.
            </div>
          ) : (
            projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {project.protocol_number} - {project.protocol_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {project.trial_phase && `${project.trial_phase} • `}
                    {project.protocol_status}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
