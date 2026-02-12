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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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
}: ProtocolsDataTableProps) {
  const { toast } = useToast();

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
  );
}
