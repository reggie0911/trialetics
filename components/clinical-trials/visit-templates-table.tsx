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
import { deleteVisitTemplate } from '@/lib/actions/visit-templates';
import type { SubjectVisitTemplateWithRelations } from '@/lib/types/clinical-trials';

interface VisitTemplatesTableProps {
  templates: SubjectVisitTemplateWithRelations[];
  isLoading: boolean;
  onEdit: (template: SubjectVisitTemplateWithRelations) => void;
  onRefresh: () => void;
  companyId: string;
  canManage?: boolean;
}

export function VisitTemplatesTable({
  templates,
  isLoading,
  onEdit,
  onRefresh,
  companyId,
  canManage = true,
}: VisitTemplatesTableProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this visit template?')) {
      return;
    }

    setDeletingId(id);

    const result = await deleteVisitTemplate(companyId, id);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Visit template deleted successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete visit template',
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
        <div className="text-sm text-muted-foreground">Loading visit templates...</div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No visit templates</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Version</TableHead>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Protocol</TableHead>
            <TableHead className="text-xs">IRB Approval</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Created</TableHead>
            {canManage && <TableHead className="w-[100px] text-xs">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell className="text-xs font-medium">
                {template.version_number}
              </TableCell>
              <TableCell className="text-xs">{template.name}</TableCell>
              <TableCell className="text-xs">
                {template.protocol ? (
                  <div className="flex flex-col">
                    <span className="font-medium">{template.protocol.protocol_number}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {template.protocol.title}
                    </span>
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-xs">{formatDate(template.irb_approval_date)}</TableCell>
              <TableCell className="text-xs">
                {template.is_active ? (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-xs">{formatDate(template.created_at)}</TableCell>
              {canManage && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(template)}
                      className="h-7 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      disabled={deletingId === template.id}
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
