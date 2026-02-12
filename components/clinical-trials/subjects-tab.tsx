'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSubjects } from '@/lib/actions/subjects';
import { getAllClinicalSites } from '@/lib/actions/clinical-sites';
import type { SubjectWithRelations } from '@/lib/types/clinical-trials';
import { SubjectsDataTable } from './subjects-data-table';
import { SubjectDialog } from './subject-dialog';

interface SubjectsTabProps {
  companyId: string;
  profileId: string;
  email: string;
  onDataChange?: () => void;
}

export function SubjectsTab({ companyId, profileId, email, onDataChange }: SubjectsTabProps) {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<SubjectWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectWithRelations | null>(null);
  const [sites, setSites] = useState<Array<{ id: string; site_number: string | null; organization?: { name: string } | null }>>([]);

  const loadSubjects = useCallback(async () => {
    setIsLoading(true);
    const result = await getSubjects(companyId, {
      search,
      page,
      pageSize: 25,
    });

    if (result.success && result.data) {
      setSubjects(result.data.subjects);
      setTotal(result.data.total);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load subjects',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [companyId, search, page]);

  const loadSites = useCallback(async () => {
    const result = await getAllClinicalSites(companyId);
    if (result.success && result.data) {
      // Transform sites to match the expected format
      const transformedSites = result.data.map((site) => ({
        id: site.id,
        site_number: site.site_number,
        organization: site.organization || null,
      }));
      setSites(transformedSites);
    }
  }, [companyId]);

  useEffect(() => {
    loadSubjects();
    loadSites();
  }, [loadSubjects, loadSites]);

  const handleSuccess = () => {
    loadSubjects();
    loadSites();
    onDataChange?.();
    setShowCreateDialog(false);
    setEditingSubject(null);
  };

  const handleEdit = (subject: SubjectWithRelations) => {
    setEditingSubject(subject);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Actions Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="h-8 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Subject
        </Button>
      </div>

      {/* Data Table */}
      <SubjectsDataTable
        subjects={subjects}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRefresh={loadSubjects}
        companyId={companyId}
      />

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingSubject) && (
        <SubjectDialog
          open={showCreateDialog || !!editingSubject}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              setEditingSubject(null);
            }
          }}
          companyId={companyId}
          profileId={profileId}
          email={email}
          subject={editingSubject}
          sites={sites}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
