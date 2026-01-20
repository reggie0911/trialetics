'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateProjectForm } from '@/components/create-project-form';
import { Tables } from '@/lib/types/database.types';
import { createClient } from '@/lib/client';
import { toast } from 'sonner';

interface ProtectedProjectsProps {
  projects: Tables<'projects'>[];
}

export function ProtectedProjects({ projects }: ProtectedProjectsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleProjectCreated = () => {
    // Refresh the page to show the new project
    router.refresh();
  };

  const handleDeleteClick = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete);

      if (error) throw error;

      toast.success('Project deleted successfully');
      router.refresh();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
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
                    onClick={(e) => handleDeleteClick(project.id, e)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
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
                <div className="mt-4 h-2 w-full rounded-full bg-secondary/50" />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full gap-2" asChild>
                  <Link href={`/protected/dashboard?projectId=${project.id}`}>
                    View Project
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone and will permanently remove the project and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
