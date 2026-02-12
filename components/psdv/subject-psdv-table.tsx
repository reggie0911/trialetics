'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings2 } from 'lucide-react';
import { SDV_LAST_UPDATED_SOURCE_LABELS } from '@/lib/types/clinical-trials';
import type { SubjectWithRelations } from '@/lib/types/clinical-trials';

interface SubjectPsdvTableProps {
  subjects: SubjectWithRelations[];
  isLoading: boolean;
  onEditSdv: (subject: SubjectWithRelations) => void;
  onRefresh: () => void;
}

export function SubjectPsdvTable({
  subjects,
  isLoading,
  onEditSdv,
}: SubjectPsdvTableProps) {
  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>;
  }

  if (subjects.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No subjects found. Create subjects in Clinical Trials Management first.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Subject #</TableHead>
            <TableHead className="text-xs">Screening #</TableHead>
            <TableHead className="text-xs">Site</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">SDV Required</TableHead>
            <TableHead className="text-xs">Last Updated Source</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell className="text-xs font-medium">
                {subject.subject_number || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {subject.screening_number || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {subject.site?.site_number ?? subject.site?.organization?.name ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs">
                  {subject.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {subject.sdv_required !== null ? (
                  <Badge variant={subject.sdv_required ? 'default' : 'secondary'} className="text-xs">
                    {subject.sdv_required ? 'Yes' : 'No'}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                {subject.sdv_last_updated_source ? (
                  SDV_LAST_UPDATED_SOURCE_LABELS[subject.sdv_last_updated_source as keyof typeof SDV_LAST_UPDATED_SOURCE_LABELS]
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditSdv(subject)}>
                      <Settings2 className="mr-2 h-3 w-3" />
                      Edit SDV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
