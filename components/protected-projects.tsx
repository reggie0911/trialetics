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
  CardTitle,
} from '@/components/ui/card';
import { CreateProjectForm } from '@/components/create-project-form';
import { EditProjectDialog } from '@/components/edit-project-dialog';
import type { AssignedProtocol } from '@/lib/actions/projects';

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
        <div className="grid grid-cols-4 gap-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden transition-colors duration-300 hover:bg-[#e9e9e9]"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl">
                      {project.protocol_number}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {project.protocol_name}
                      {project.trial_phase && ` | ${project.trial_phase}`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => handleEditClick(project, e)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    title="Edit project"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {project.protocol_description && (
                    <p className="line-clamp-2">{project.protocol_description}</p>
                  )}
                  {(project.planned_sites || project.planned_subjects) && (
                    <div className="flex gap-4">
                      {project.planned_sites && (
                        <span>Sites: {project.planned_sites}</span>
                      )}
                      {project.planned_subjects && (
                        <span>Subjects: {project.planned_subjects}</span>
                      )}
                    </div>
                  )}
                  {project.protocol_status && (
                    <span className="inline-block rounded-full bg-secondary px-2 py-1 text-xs capitalize">
                      {project.protocol_status}
                    </span>
                  )}
                </div>
                <div className="mt-4 h-2 w-full rounded-full bg-black" />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full gap-2" asChild>
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
