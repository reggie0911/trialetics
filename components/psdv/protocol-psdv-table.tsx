'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings2 } from 'lucide-react';
import { PROTOCOL_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';

interface ProtocolPsdvTableProps {
  protocols: ClinicalProtocolWithRelations[];
  isLoading: boolean;
  onEditPsdv: (protocol: ClinicalProtocolWithRelations) => void;
  onRefresh: () => void;
}

export function ProtocolPsdvTable({
  protocols,
  isLoading,
  onEditPsdv,
}: ProtocolPsdvTableProps) {
  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>;
  }

  if (protocols.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No protocols found. Create protocols in Clinical Trials Management first.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Protocol #</TableHead>
            <TableHead className="text-xs">Title</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Number of Initial Subjects</TableHead>
            <TableHead className="text-xs">Subject Auto-Select Rate (%)</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {protocols.map((protocol) => (
            <TableRow key={protocol.id}>
              <TableCell className="text-xs font-medium">{protocol.protocol_number}</TableCell>
              <TableCell className="text-xs">
                <span className="line-clamp-1">{protocol.title}</span>
              </TableCell>
              <TableCell className="text-xs">
                {PROTOCOL_STATUS_LABELS[protocol.status]}
              </TableCell>
              <TableCell className="text-xs">
                {protocol.psdv_initial_subjects_count ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {protocol.psdv_subject_auto_select_rate != null ? (
                  `${protocol.psdv_subject_auto_select_rate}%`
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
                    <DropdownMenuItem onClick={() => onEditPsdv(protocol)}>
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
