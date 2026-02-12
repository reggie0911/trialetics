'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClinicalSites } from '@/lib/actions/clinical-sites';
import type { ClinicalSiteWithRelations } from '@/lib/types/clinical-trials';
import { SitesDataTable } from './sites-data-table';
import { SiteFormDialog } from './site-form-dialog';

interface SitesTabProps {
  companyId: string;
  onDataChange?: () => void;
}

export function SitesTab({ companyId, onDataChange }: SitesTabProps) {
  const { toast } = useToast();
  const [sites, setSites] = useState<ClinicalSiteWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
      setTotal(result.data.total);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load sites',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [companyId, search, page]); // Removed toast from dependencies

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const handleSuccess = () => {
    loadSites();
    onDataChange?.();
    setShowCreateDialog(false);
    setEditingSite(null);
  };

  const handleEdit = (site: ClinicalSiteWithRelations) => {
    setEditingSite(site);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Actions Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
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
          Add Site
        </Button>
      </div>

      {/* Data Table */}
      <SitesDataTable
        sites={sites}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRefresh={loadSites}
        companyId={companyId}
      />

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingSite) && (
        <SiteFormDialog
          open={showCreateDialog || !!editingSite}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              setEditingSite(null);
            }
          }}
          companyId={companyId}
          site={editingSite}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
