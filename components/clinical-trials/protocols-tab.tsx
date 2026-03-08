'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClinicalProtocols } from '@/lib/actions/clinical-protocols';
import type { ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';
import { ProtocolsDataTable } from './protocols-data-table';
import { ProtocolFormDialog } from './protocol-form-dialog';
import { CreateProjectForm } from '@/components/create-project-form';

interface ProtocolsTabProps {
  companyId: string;
  profileId: string;
  email: string;
  onDataChange?: () => void;
}

export function ProtocolsTab({ companyId, profileId, email, onDataChange }: ProtocolsTabProps) {
  const { toast } = useToast();
  const [protocols, setProtocols] = useState<ClinicalProtocolWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<ClinicalProtocolWithRelations | null>(null);

  const loadProtocols = useCallback(async () => {
    setIsLoading(true);
    const result = await getClinicalProtocols(companyId, {
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
        description: result.error || 'Failed to load projects',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [companyId, search, page]); // Removed toast from dependencies

  useEffect(() => {
    loadProtocols();
  }, [loadProtocols]);

  const handleSuccess = () => {
    loadProtocols();
    onDataChange?.();
    setShowCreateDialog(false);
    setEditingProtocol(null);
  };

  const handleEdit = (protocol: ClinicalProtocolWithRelations) => {
    setEditingProtocol(protocol);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Actions Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
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
          Add Project
        </Button>
      </div>

      {/* Data Table */}
      <ProtocolsDataTable
        protocols={protocols}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRefresh={loadProtocols}
        companyId={companyId}
      />

      {/* Create Project Dialog (Add Protocol) */}
      {showCreateDialog && (
        <CreateProjectForm
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={handleSuccess}
        />
      )}

      {/* Edit Protocol Dialog */}
      {editingProtocol && (
        <ProtocolFormDialog
          open={!!editingProtocol}
          onOpenChange={(open) => {
            if (!open) setEditingProtocol(null);
          }}
          companyId={companyId}
          profileId={profileId}
          email={email}
          protocol={editingProtocol}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
