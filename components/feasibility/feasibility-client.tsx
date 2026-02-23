'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  getFeasibilityStudies,
  deleteFeasibilityStudy,
} from '@/lib/actions/feasibility';
import type { FeasibilityStudy, FeasibilityFilters } from '@/lib/types/feasibility';
import { FEASIBILITY_STATUS_LABELS } from '@/lib/types/feasibility';
import { FeasibilityStudyDialog } from './feasibility-study-dialog';
import { FeasibilityCriteriaEditor } from './feasibility-criteria-editor';
import { SiteEvaluationTable } from './site-evaluation-table';
import { FeasibilityRankingChart } from './feasibility-ranking-chart';
import { SiteSelectionDialog } from './site-selection-dialog';
import { FeasibilityComparisonView } from './feasibility-comparison-view';

interface FeasibilityClientProps {
  companyId: string;
  profileId: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

export function FeasibilityClient({ companyId, profileId }: FeasibilityClientProps) {
  const { toast } = useToast();
  const [studies, setStudies] = useState<FeasibilityStudy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FeasibilityFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<FeasibilityStudy | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await getFeasibilityStudies(companyId, filters);
    if (res.success && res.data) {
      setStudies(res.data.items);
      setTotal(res.data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId, filters]);

  const handleDelete = async (id: string) => {
    const res = await deleteFeasibilityStudy(id);
    if (res.success) {
      toast({ title: 'Study deleted' });
      if (selectedStudy?.id === id) setSelectedStudy(null);
      load();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading feasibility studies...</p>
      </div>
    );
  }

  if (selectedStudy) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedStudy(null)} className="mb-2">
              &larr; Back to studies
            </Button>
            <h2 className="text-lg font-semibold">{selectedStudy.name}</h2>
            <p className="text-xs text-muted-foreground">{selectedStudy.description || 'No description'}</p>
          </div>
          <Badge variant="outline" className={statusColors[selectedStudy.status]}>
            {FEASIBILITY_STATUS_LABELS[selectedStudy.status]}
          </Badge>
        </div>

        <FeasibilityCriteriaEditor studyId={selectedStudy.id} />
        <SiteEvaluationTable studyId={selectedStudy.id} companyId={companyId} />
        <FeasibilityRankingChart studyId={selectedStudy.id} />
        <FeasibilityComparisonView studyId={selectedStudy.id} />
        <SiteSelectionDialog studyId={selectedStudy.id} companyId={companyId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Input
          placeholder="Search studies..."
          className="w-64"
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
        />
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          New Study
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {studies.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No feasibility studies found. Create one to get started.
          </p>
        ) : (
          studies.map((study) => (
            <div
              key={study.id}
              className="rounded-lg border bg-white p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedStudy(study)}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-sm">{study.name}</h3>
                <Badge variant="outline" className={statusColors[study.status]}>
                  {FEASIBILITY_STATUS_LABELS[study.status]}
                </Badge>
              </div>
              {study.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{study.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Created {new Date(study.created_at).toLocaleDateString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(study.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <FeasibilityStudyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
        onSuccess={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}
