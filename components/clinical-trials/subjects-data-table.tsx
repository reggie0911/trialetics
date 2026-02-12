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
import { Edit, Trash2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteSubject } from '@/lib/actions/subjects';
import type { SubjectWithRelations } from '@/lib/types/clinical-trials';
import { SUBJECT_STATUS_LABELS } from '@/lib/types/clinical-trials';

interface SubjectsDataTableProps {
  subjects: SubjectWithRelations[];
  isLoading: boolean;
  onEdit: (subject: SubjectWithRelations) => void;
  onRefresh: () => void;
  companyId: string;
  canManage?: boolean;
}

export function SubjectsDataTable({
  subjects,
  isLoading,
  onEdit,
  onRefresh,
  companyId,
  canManage = true,
}: SubjectsDataTableProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) {
      return;
    }

    setDeletingId(id);

    const result = await deleteSubject(companyId, id);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Subject deleted successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete subject',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'screening':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'enrolled':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'terminated':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'screen_failure':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading subjects...</div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <User className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No subjects</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Screening #</TableHead>
            <TableHead className="text-xs">Subject #</TableHead>
            <TableHead className="text-xs">Site</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Screening Date</TableHead>
            <TableHead className="text-xs">Enrollment Date</TableHead>
            {canManage && <TableHead className="w-[100px] text-xs">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell className="text-xs font-medium">
                {subject.screening_number || '-'}
              </TableCell>
              <TableCell className="text-xs font-medium">
                {subject.subject_number || '-'}
              </TableCell>
              <TableCell className="text-xs">
                <div className="flex flex-col">
                  <span>{subject.site?.site_number || '-'}</span>
                  {subject.site?.organization && (
                    <span className="text-muted-foreground text-[10px]">
                      {subject.site.organization.name}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <Badge className={`text-xs ${getStatusColor(subject.status)}`}>
                  {SUBJECT_STATUS_LABELS[subject.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{formatDate(subject.screening_date)}</TableCell>
              <TableCell className="text-xs">{formatDate(subject.enrollment_date)}</TableCell>
              {canManage && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(subject)}
                      className="h-7 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(subject.id)}
                      disabled={deletingId === subject.id}
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
