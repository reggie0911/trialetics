'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClinicalRegions } from '@/lib/actions/clinical-regions';
import type { ClinicalRegionWithRelations } from '@/lib/types/clinical-trials';
import { RegionsDataTable } from './regions-data-table';
import { RegionFormDialog } from './region-form-dialog';

interface RegionsTabProps {
  companyId: string;
  onDataChange?: () => void;
}

export function RegionsTab({ companyId, onDataChange }: RegionsTabProps) {
  const { toast } = useToast();
  const [regions, setRegions] = useState<ClinicalRegionWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRegion, setEditingRegion] = useState<ClinicalRegionWithRelations | null>(null);

  const loadRegions = useCallback(async () => {
    setIsLoading(true);
    const result = await getClinicalRegions(companyId, {
      search,
      page,
      pageSize: 25,
    });

    if (result.success && result.data) {
      setRegions(result.data.regions);
      setTotal(result.data.total);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load countries',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [companyId, search, page]); // Removed toast from dependencies

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const handleSuccess = () => {
    loadRegions();
    onDataChange?.();
    setShowCreateDialog(false);
    setEditingRegion(null);
  };

  const handleEdit = (region: ClinicalRegionWithRelations) => {
    setEditingRegion(region);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Actions Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
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
          Add Country
        </Button>
      </div>

      {/* Data Table */}
      <RegionsDataTable
        regions={regions}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRefresh={loadRegions}
        companyId={companyId}
      />

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingRegion) && (
        <RegionFormDialog
          open={showCreateDialog || !!editingRegion}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              setEditingRegion(null);
            }
          }}
          companyId={companyId}
          region={editingRegion}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
