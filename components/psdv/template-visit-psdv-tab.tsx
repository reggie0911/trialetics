'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTemplateVisitsForPsdv } from '@/lib/actions/psdv';
import { TemplateVisitPsdvTable } from './template-visit-psdv-table';
import { TemplateVisitPsdvDialog } from './template-visit-psdv-dialog';

interface TemplateVisitPsdvTabProps {
  companyId: string;
  onDataChange?: () => void;
}

export function TemplateVisitPsdvTab({ companyId, onDataChange }: TemplateVisitPsdvTabProps) {
  const { toast } = useToast();
  const [visits, setVisits] = useState<Array<{
    id: string;
    visit_name: string;
    visit_type: string;
    sequence: number;
    sdv_required: boolean;
    page_numbers_to_verify: string | null;
    template_id: string;
    template?: { name: string; version_number: string };
    protocol?: { protocol_number: string; title: string };
  }>>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingVisit, setEditingVisit] = useState<typeof visits[0] | null>(null);

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    const result = await getTemplateVisitsForPsdv(companyId);

    if (result.success && result.data) {
      setVisits(result.data);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load template visits',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast omitted to avoid dependency loop
  }, [companyId]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const handleSuccess = () => {
    loadVisits();
    onDataChange?.();
    setEditingVisit(null);
  };

  const handleEditPsdv = (visit: typeof visits[0]) => {
    setEditingVisit(visit);
  };

  const filteredVisits = search
    ? visits.filter(
        (v) =>
          v.visit_name?.toLowerCase().includes(search.toLowerCase()) ||
          v.template?.name?.toLowerCase().includes(search.toLowerCase()) ||
          v.protocol?.protocol_number?.toLowerCase().includes(search.toLowerCase())
      )
    : visits;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search visits, templates, protocols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
      </div>

      <TemplateVisitPsdvTable
        visits={filteredVisits}
        isLoading={isLoading}
        onEditPsdv={handleEditPsdv}
        onRefresh={loadVisits}
      />

      {editingVisit && (
        <TemplateVisitPsdvDialog
          open={!!editingVisit}
          onOpenChange={(open) => !open && setEditingVisit(null)}
          visit={editingVisit}
          companyId={companyId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
