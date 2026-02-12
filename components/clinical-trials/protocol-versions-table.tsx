'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteProtocolVersion } from '@/lib/actions/protocol-versions';
import type { ProtocolVersionWithRelations } from '@/lib/types/clinical-trials';

interface ProtocolVersionsTableProps {
  versions: ProtocolVersionWithRelations[];
  isLoading: boolean;
  onEdit: (version: ProtocolVersionWithRelations) => void;
  onRefresh: () => void;
  companyId: string;
  canManage?: boolean;
}

export function ProtocolVersionsTable({
  versions,
  isLoading,
  onEdit,
  onRefresh,
  companyId,
  canManage = true,
}: ProtocolVersionsTableProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this protocol version?')) {
      return;
    }

    setDeletingId(id);

    const result = await deleteProtocolVersion(companyId, id);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Protocol version deleted successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete protocol version',
        variant: 'destructive',
      });
    }

    setDeletingId(null);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading protocol versions...</div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No protocol versions</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Version</TableHead>
            <TableHead className="text-xs">Amendment</TableHead>
            <TableHead className="text-xs">Approval Date</TableHead>
            <TableHead className="text-xs">Description</TableHead>
            <TableHead className="text-xs">Created</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            {canManage && <TableHead className="w-[100px] text-xs">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.map((version) => (
            <TableRow key={version.id}>
              <TableCell className="text-xs font-medium">
                {version.version_number}
              </TableCell>
              <TableCell className="text-xs">
                {version.amendment_version || '-'}
              </TableCell>
              <TableCell className="text-xs">
                {formatDate(version.approval_date)}
              </TableCell>
              <TableCell className="text-xs max-w-[300px] truncate">
                {version.description || '-'}
              </TableCell>
              <TableCell className="text-xs">
                {formatDate(version.created_at)}
              </TableCell>
              <TableCell className="text-xs">
                {version.is_original ? (
                  <Badge variant="default" className="text-xs">
                    Original
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Amendment
                  </Badge>
                )}
              </TableCell>
              {canManage && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(version)}
                      className="h-7 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(version.id)}
                      disabled={deletingId === version.id}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
