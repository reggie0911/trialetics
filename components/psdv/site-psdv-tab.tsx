'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClinicalSites } from '@/lib/actions/clinical-sites';
import type { ClinicalSiteWithRelations } from '@/lib/types/clinical-trials';
import { SitePsdvTable } from './site-psdv-table';
import { SitePsdvDialog } from './site-psdv-dialog';

interface SitePsdvTabProps {
  companyId: string;
  onDataChange?: () => void;
}

export function SitePsdvTab({ companyId, onDataChange }: SitePsdvTabProps) {
  const { toast } = useToast();
  const [sites, setSites] = useState<ClinicalSiteWithRelations[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSite, setEditingSite] = useState<ClinicalSiteWithRelations | null>(null);

  const loadSites = useCallback(async () => {
    setIsLoading(true);
    const result = await getClinicalSites(companyId, {
      search,
      page,
      pageSize: 25,
    });

    if (result.success && result.data) {
      setSites(result.data.sites);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load sites',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast omitted to avoid dependency loop
  }, [companyId, search, page]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const handleSuccess = () => {
    loadSites();
    onDataChange?.();
    setEditingSite(null);
  };

  const handleEditPsdv = (site: ClinicalSiteWithRelations) => {
    setEditingSite(site);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
      </div>

      <SitePsdvTable
        sites={sites}
        isLoading={isLoading}
        onEditPsdv={handleEditPsdv}
        onRefresh={loadSites}
      />

      {editingSite && (
        <SitePsdvDialog
          open={!!editingSite}
          onOpenChange={(open) => !open && setEditingSite(null)}
          site={editingSite}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
