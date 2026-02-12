'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClinicalRegions } from '@/lib/actions/clinical-regions';
import type { ClinicalRegionWithRelations } from '@/lib/types/clinical-trials';
import { RegionPsdvTable } from './region-psdv-table';
import { RegionPsdvDialog } from './region-psdv-dialog';

interface RegionPsdvTabProps {
  companyId: string;
  onDataChange?: () => void;
}

export function RegionPsdvTab({ companyId, onDataChange }: RegionPsdvTabProps) {
  const { toast } = useToast();
  const [regions, setRegions] = useState<ClinicalRegionWithRelations[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
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
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load regions',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast omitted to avoid dependency loop
  }, [companyId, search, page]);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const handleSuccess = () => {
    loadRegions();
    onDataChange?.();
    setEditingRegion(null);
  };

  const handleEditPsdv = (region: ClinicalRegionWithRelations) => {
    setEditingRegion(region);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search regions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
      </div>

      <RegionPsdvTable
        regions={regions}
        isLoading={isLoading}
        onEditPsdv={handleEditPsdv}
        onRefresh={loadRegions}
      />

      {editingRegion && (
        <RegionPsdvDialog
          open={!!editingRegion}
          onOpenChange={(open) => !open && setEditingRegion(null)}
          region={editingRegion}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
