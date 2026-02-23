'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { CreateProjectForm } from '@/components/create-project-form';
import { EditProjectDialog } from '@/components/edit-project-dialog';
import type { AssignedProtocol } from '@/lib/actions/projects';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
  planning: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
  on_hold: { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400' },
  closed: { bg: 'bg-slate-500/15', text: 'text-slate-600 dark:text-slate-400' },
  terminated: { bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400' },
};

function getStatusStyles(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_COLORS[key] ?? { bg: 'bg-primary/10', text: 'text-primary' };
}

function StatusBadge({ status }: { status: string }) {
  const { bg, text } = getStatusStyles(status);
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${bg} ${text}`}
    >
      {status}
    </span>
  );
}

interface ProtectedProjectsProps {
  projects: AssignedProtocol[];
}

export function ProtectedProjects({ projects }: ProtectedProjectsProps) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<AssignedProtocol | null>(null);

  const handleProjectCreated = () => {
    router.refresh();
  };

  const handleEditClick = (project: AssignedProtocol, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToEdit(project);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setProjectToEdit(null);
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-medium tracking-tight">
          Assigned Projects ({projects.length})
        </h1>
        <CreateProjectForm onSuccess={handleProjectCreated} />
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <CardDescription className="text-base">
            No projects assigned yet. Create your first project to get started.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md hover:border-muted-foreground/20"
            >
              <CardHeader className="items-center space-y-3 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 flex-1 font-semibold text-lg leading-tight tracking-tight text-foreground">
                    {project.protocol_name}
                  </h3>
                  <div className="flex shrink-0 items-center gap-2">
                    {project.protocol_status && (
                      <StatusBadge status={project.protocol_status} />
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => handleEditClick(project, e)}
                      className="h-8 w-8 shrink-0 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:text-foreground"
                      title="Edit project"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                  {project.trial_phase && (
                    <span>
                      <span className="font-medium text-muted-foreground/80">Phase</span>{' '}
                      {project.trial_phase}
                    </span>
                  )}
                  {project.protocol_number && project.protocol_number !== '-' && (
                    <span>
                      <span className="font-medium text-muted-foreground/80">Protocol</span>{' '}
                      {project.protocol_number}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 pb-3">
                {project.protocol_description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {project.protocol_description}
                  </p>
                )}
                {(project.planned_sites || project.planned_subjects) && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {project.planned_sites && (
                      <span>
                        <span className="font-medium text-muted-foreground/80">Sites</span>{' '}
                        {project.planned_sites}
                      </span>
                    )}
                    {project.planned_subjects && (
                      <span>
                        <span className="font-medium text-muted-foreground/80">Subjects</span>{' '}
                        {project.planned_subjects}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t bg-muted/30 pt-3">
                <Button
                  variant="secondary"
                  className="w-full gap-2 font-medium"
                  asChild
                >
                  <Link href={`/protected/dashboard?protocolId=${project.id}`}>
                    View Project
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <EditProjectDialog
        project={projectToEdit}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setProjectToEdit(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
