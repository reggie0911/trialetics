'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClinicalPrograms } from '@/lib/actions/clinical-programs';
import type { ClinicalProgramWithRelations } from '@/lib/types/clinical-trials';
import { ProgramsDataTable } from './programs-data-table';
import { ProgramFormDialog } from './program-form-dialog';

interface ProgramsTabProps {
  companyId: string;
  profileId: string;
  email: string;
  onDataChange?: () => void;
}

export function ProgramsTab({ companyId, profileId, email, onDataChange }: ProgramsTabProps) {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<ClinicalProgramWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ClinicalProgramWithRelations | null>(null);

  const loadPrograms = useCallback(async () => {
    setIsLoading(true);
    const result = await getClinicalPrograms(companyId, {
      search,
      page,
      pageSize: 25,
    });

    if (result.success && result.data) {
      setPrograms(result.data.programs);
      setTotal(result.data.total);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load programs',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [companyId, search, page]); // Removed toast from dependencies

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const handleSuccess = () => {
    loadPrograms();
    onDataChange?.();
    setShowCreateDialog(false);
    setEditingProgram(null);
  };

  const handleEdit = (program: ClinicalProgramWithRelations) => {
    setEditingProgram(program);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Actions Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search programs..."
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
          Add Program
        </Button>
      </div>

      {/* Data Table */}
      <ProgramsDataTable
        programs={programs}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRefresh={loadPrograms}
        companyId={companyId}
      />

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingProgram) && (
        <ProgramFormDialog
          open={showCreateDialog || !!editingProgram}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              setEditingProgram(null);
            }
          }}
          companyId={companyId}
          profileId={profileId}
          email={email}
          program={editingProgram}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
