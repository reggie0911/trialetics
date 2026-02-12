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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { CrfTrackingWithRelations } from '@/lib/types/clinical-trials';

interface CrfTrackingTableProps {
  items: CrfTrackingWithRelations[];
  isLoading: boolean;
  onEdit: (item: CrfTrackingWithRelations) => void;
  onDelete: (item: CrfTrackingWithRelations) => void;
  onRefresh: () => void;
}

function formatDate(val: string | null | undefined) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString();
  } catch {
    return '—';
  }
}

export function CrfTrackingTable({
  items,
  isLoading,
  onEdit,
  onDelete,
}: CrfTrackingTableProps) {
  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No CRF tracking records. Add scheduled or unscheduled subject visits to a site visit.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Site Visit</TableHead>
            <TableHead className="text-xs">Visit Start</TableHead>
            <TableHead className="text-xs">Subject Visit</TableHead>
            <TableHead className="text-xs">SDV Required</TableHead>
            <TableHead className="text-xs">Source Verified</TableHead>
            <TableHead className="text-xs">Retrieved</TableHead>
            <TableHead className="text-xs">Charts Reviewed</TableHead>
            <TableHead className="text-xs">Forms Signed</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-xs font-medium">
                {item.site_visit?.visit_name ?? '—'}
              </TableCell>
              <TableCell className="text-xs">
                {formatDate(item.site_visit?.visit_start)}
              </TableCell>
              <TableCell className="text-xs">
                {item.subject_visit?.visit_name ?? '—'}
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant={item.sdv_required ? 'default' : 'secondary'} className="text-xs">
                  {item.sdv_required ? 'Yes' : 'No'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant={item.source_verified ? 'default' : 'outline'} className="text-xs">
                  {item.source_verified ? 'Yes' : 'No'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {item.retrieved ? 'Yes' : 'No'}
              </TableCell>
              <TableCell className="text-xs">
                {formatDate(item.charts_reviewed_date)}
              </TableCell>
              <TableCell className="text-xs">
                {formatDate(item.forms_signed_date)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Pencil className="mr-2 h-3 w-3" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive">
                      <Trash2 className="mr-2 h-3 w-3" />
                      Remove
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
