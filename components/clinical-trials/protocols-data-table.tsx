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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Edit, Trash2, Users, BarChart3, FileText } from 'lucide-react';
import { ProtocolContactsSheet } from './protocol-contacts-sheet';
import { ProtocolStatusReportSheet } from './protocol-status-report-sheet';
import { PROTOCOL_STATUS_LABELS, PROTOCOL_PHASE_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';
import { deleteClinicalProtocol } from '@/lib/actions/clinical-protocols';
import { useToast } from '@/hooks/use-toast';

interface ProtocolsDataTableProps {
  protocols: ClinicalProtocolWithRelations[];
  isLoading: boolean;
  onEdit: (protocol: ClinicalProtocolWithRelations) => void;
  onRefresh: () => void;
  companyId: string;
}

export function ProtocolsDataTable({
  protocols,
  isLoading,
  onEdit,
  onRefresh,
  companyId,
}: ProtocolsDataTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [contactsSheetProtocol, setContactsSheetProtocol] = useState<ClinicalProtocolWithRelations | null>(null);
  const [statusReportProtocol, setStatusReportProtocol] = useState<ClinicalProtocolWithRelations | null>(null);

  const handleDelete = async (protocolId: string) => {
    if (!confirm('Are you sure you want to delete this protocol? This will also delete all associated regions and sites.')) return;

    const result = await deleteClinicalProtocol(protocolId);
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Protocol deleted successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete protocol',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (protocols.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        No protocols found. Click "Add Protocol" to create one.
      </div>
    );
  }

  return (
    <>
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Protocol #</TableHead>
            <TableHead className="text-xs">Title</TableHead>
            <TableHead className="text-xs">Phase</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Sites</TableHead>
            <TableHead className="text-xs">Program</TableHead>
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
                {protocol.phase ? (
                  <Badge variant="outline" className="text-xs">
                    {PROTOCOL_PHASE_LABELS[protocol.phase]}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs">
                  {PROTOCOL_STATUS_LABELS[protocol.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{protocol.sites_count || 0}</TableCell>
              <TableCell className="text-xs">
                {protocol.program?.name || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setContactsSheetProtocol(protocol)}>
                      <Users className="mr-2 h-3 w-3" />
                      Contacts & Partners
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusReportProtocol(protocol)}>
                      <FileText className="mr-2 h-3 w-3" />
                      Status Report
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex items-center">
                        <BarChart3 className="mr-2 h-3 w-3" />
                        View in Trackers
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {[
                          { label: 'AE Metrics', href: '/protected/ae' },
                          { label: 'eCRF Query', href: '/protected/ecrf-query-tracker' },
                          { label: 'SDV Tracker', href: '/protected/sdv-tracker' },
                          { label: 'Visit Window', href: '/protected/vw' },
                          { label: 'Med Compliance', href: '/protected/mc' },
                          { label: 'Patients', href: '/protected/patients' },
                        ].map(({ label, href }) => (
                          <DropdownMenuItem
                            key={href}
                            onClick={() => router.push(`${href}?protocol=${protocol.id}`)}
                          >
                            {label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => onEdit(protocol)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(protocol.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {contactsSheetProtocol && (
      <ProtocolContactsSheet
        open={!!contactsSheetProtocol}
        onOpenChange={(open) => !open && setContactsSheetProtocol(null)}
        protocolId={contactsSheetProtocol.id}
        protocolNumber={contactsSheetProtocol.protocol_number}
        protocolTitle={contactsSheetProtocol.title}
        companyId={companyId}
        onSuccess={onRefresh}
      />
    )}
    {statusReportProtocol && (
      <ProtocolStatusReportSheet
        open={!!statusReportProtocol}
        onOpenChange={(open) => !open && setStatusReportProtocol(null)}
        protocolId={statusReportProtocol.id}
        protocolNumber={statusReportProtocol.protocol_number}
        protocolTitle={statusReportProtocol.title}
        companyId={companyId}
        onSuccess={onRefresh}
      />
    )}
    </>
  );
}
