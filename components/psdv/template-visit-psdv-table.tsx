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

type TemplateVisitPsdvRow = {
  id: string;
  visit_name: string;
  visit_type: string;
  sequence: number;
  sdv_required: boolean;
  page_numbers_to_verify: string | null;
  template_id: string;
  template?: { name: string; version_number: string };
  protocol?: { protocol_number: string; title: string };
};

interface TemplateVisitPsdvTableProps {
  visits: TemplateVisitPsdvRow[];
  isLoading: boolean;
  onEditPsdv: (visit: TemplateVisitPsdvRow) => void;
  onRefresh: () => void;
}

export function TemplateVisitPsdvTable({
  visits,
  isLoading,
  onEditPsdv,
}: TemplateVisitPsdvTableProps) {
  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>;
  }

  if (visits.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No visit templates found. Create visit templates in Clinical Trials Management first.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Visit Name</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Sequence</TableHead>
            <TableHead className="text-xs">Template</TableHead>
            <TableHead className="text-xs">Protocol</TableHead>
            <TableHead className="text-xs">SDV Required</TableHead>
            <TableHead className="text-xs">Page Numbers</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.map((visit) => (
            <TableRow key={visit.id}>
              <TableCell className="text-xs font-medium">
                {visit.visit_name || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {visit.visit_type || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {visit.sequence}
              </TableCell>
              <TableCell className="text-xs">
                {visit.template
                  ? `${visit.template.name} v${visit.template.version_number}`
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {visit.protocol?.protocol_number ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant={visit.sdv_required ? 'default' : 'secondary'} className="text-xs">
                  {visit.sdv_required ? 'Yes' : 'No'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {visit.page_numbers_to_verify || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditPsdv(visit)}>
                      <Settings2 className="mr-2 h-3 w-3" />
                      Edit PSDV
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
