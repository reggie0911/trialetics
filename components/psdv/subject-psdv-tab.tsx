'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSubjects } from '@/lib/actions/subjects';
import type { SubjectWithRelations } from '@/lib/types/clinical-trials';
import { SubjectPsdvTable } from './subject-psdv-table';
import { SubjectSdvDialog } from './subject-sdv-dialog';

interface SubjectPsdvTabProps {
  companyId: string;
  onDataChange?: () => void;
}

export function SubjectPsdvTab({ companyId, onDataChange }: SubjectPsdvTabProps) {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<SubjectWithRelations[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<SubjectWithRelations | null>(null);

  const loadSubjects = useCallback(async () => {
    setIsLoading(true);
    const result = await getSubjects(companyId, {
      search,
      page,
      pageSize: 25,
    });

    if (result.success && result.data) {
      setSubjects(result.data.subjects);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load subjects',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast omitted to avoid dependency loop
  }, [companyId, search, page]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleSuccess = () => {
    loadSubjects();
    onDataChange?.();
    setEditingSubject(null);
  };

  const handleEditSdv = (subject: SubjectWithRelations) => {
    setEditingSubject(subject);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
      </div>

      <SubjectPsdvTable
        subjects={subjects}
        isLoading={isLoading}
        onEditSdv={handleEditSdv}
        onRefresh={loadSubjects}
      />

      {editingSubject && (
        <SubjectSdvDialog
          open={!!editingSubject}
          onOpenChange={(open) => !open && setEditingSubject(null)}
          subject={editingSubject}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
