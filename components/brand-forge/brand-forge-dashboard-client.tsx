'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Loader2, FlaskConical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/client';
import { brandForgeBasePath, brandForgeStudyIdFromPathname } from '@/lib/nav/brand-forge-paths';
import { ProjectCard } from './project-card';
import type { BFProject } from '@/lib/types/brand-forge';

interface BrandForgeDashboardClientProps {
  companyId: string;
  profileId: string;
}

type ProjectWithInputs = BFProject & {
  therapeutic_area?: string | null;
  phase?: string | null;
  protocol_number?: string | null;
};

export function BrandForgeDashboardClient({ companyId }: BrandForgeDashboardClientProps) {
  const pathname = usePathname();
  const studyId = brandForgeStudyIdFromPathname(pathname);
  const basePath = brandForgeBasePath(studyId);
  const [projects, setProjects] = useState<ProjectWithInputs[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient();
      let query = supabase
        .from('bf_projects')
        .select('*, bf_brand_inputs(therapeutic_area, phase, protocol_number)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (studyId) {
        query = query.eq('study_id', studyId);
      }

      const { data } = await query;

      const mapped = (data ?? []).map((row: Record<string, unknown>) => {
        const inputs = row.bf_brand_inputs as Record<string, unknown> | Record<string, unknown>[] | null;
        const first = Array.isArray(inputs) ? inputs[0] : inputs;
        return {
          ...(row as unknown as BFProject),
          therapeutic_area: (first?.therapeutic_area as string) ?? null,
          phase: (first?.phase as string) ?? null,
          protocol_number: (first?.protocol_number as string) ?? null,
        };
      });

      setProjects(mapped);
      setIsLoading(false);
    }
    loadProjects();
  }, [companyId, studyId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="rounded-full bg-muted p-4">
            <FlaskConical className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-medium">No study brands yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Create your first study brand to generate a professional, compliant identity system for your clinical trial.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={`${basePath}/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New study brand
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{projects.length} stud{projects.length !== 1 ? 'ies' : 'y'}</p>
        <Button asChild size="sm">
          <Link href={`${basePath}/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New study brand
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDeleted={(id) => setProjects((prev) => prev.filter((p) => p.id !== id))}
            onProjectUpdated={(id, patch) =>
              setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
            }
            basePath={basePath}
          />
        ))}
      </div>
    </div>
  );
}
