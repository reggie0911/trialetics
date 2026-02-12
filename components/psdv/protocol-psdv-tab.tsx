'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClinicalProtocolsForPsdv } from '@/lib/actions/clinical-protocols';
import type { ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';
import { ProtocolPsdvTable } from './protocol-psdv-table';
import { ProtocolPsdvDialog } from './protocol-psdv-dialog';

interface ProtocolPsdvTabProps {
  companyId: string;
  onDataChange?: () => void;
}

export function ProtocolPsdvTab({ companyId, onDataChange }: ProtocolPsdvTabProps) {
  const { toast } = useToast();
  const [protocols, setProtocols] = useState<ClinicalProtocolWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProtocol, setEditingProtocol] = useState<ClinicalProtocolWithRelations | null>(null);

  const loadProtocols = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getClinicalProtocolsForPsdv(companyId, {
        search,
        page,
        pageSize: 25,
      });

      if (result.success && result.data) {
        setProtocols(result.data.protocols);
        setTotal(result.data.total);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load protocols',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load protocols',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast intentionally omitted to avoid dependency loop (useToast returns new ref each render)
  }, [companyId, search, page]);

  useEffect(() => {
    loadProtocols();
  }, [loadProtocols]);

  const handleSuccess = () => {
    loadProtocols();
    onDataChange?.();
    setEditingProtocol(null);
  };

  const handleEditPsdv = (protocol: ClinicalProtocolWithRelations) => {
    setEditingProtocol(protocol);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search protocols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
      </div>

      <ProtocolPsdvTable
        protocols={protocols}
        isLoading={isLoading}
        onEditPsdv={handleEditPsdv}
        onRefresh={loadProtocols}
      />

      {editingProtocol && (
        <ProtocolPsdvDialog
          open={!!editingProtocol}
          onOpenChange={(open) => !open && setEditingProtocol(null)}
          protocol={editingProtocol}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
