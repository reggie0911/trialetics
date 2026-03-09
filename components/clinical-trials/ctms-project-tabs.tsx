'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronRight, FolderOpen } from 'lucide-react';
import type { ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';
import { PROTOCOL_PHASE_LABELS, PROTOCOL_STATUS_LABELS } from '@/lib/types/clinical-trials';

interface CTMSProjectTabsProps {
  protocols: ClinicalProtocolWithRelations[];
  onProjectClick: (protocol: ClinicalProtocolWithRelations) => void;
  loading: boolean;
}

export function CTMSProjectTabs({
  protocols,
  onProjectClick,
  loading,
}: CTMSProjectTabsProps) {
  const filteredProtocols = protocols.filter((p) => p.type !== 'test');

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
          Loading projects...
        </div>
      ) : filteredProtocols.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground">
          <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
          <p>No projects found</p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 text-xs font-medium w-[200px]">
                  Project Number
                </TableHead>
                <TableHead className="bg-muted/50 text-xs font-medium">Title</TableHead>
                <TableHead className="bg-muted/50 text-xs font-medium w-[120px]">
                  Phase
                </TableHead>
                <TableHead className="bg-muted/50 text-xs font-medium w-[120px]">
                  Status
                </TableHead>
                <TableHead className="bg-muted/50 text-xs font-medium w-[100px] text-center">
                  Countries
                </TableHead>
                <TableHead className="bg-muted/50 text-xs font-medium w-[100px] text-center">
                  Sites
                </TableHead>
                <TableHead className="bg-muted/50 text-xs font-medium w-[88px] p-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProtocols.map((protocol) => (
                <TableRow
                  key={protocol.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onProjectClick(protocol)}
                >
                  <TableCell className="text-xs font-medium">
                    {protocol.protocol_number}
                  </TableCell>
                  <TableCell className="text-xs">{protocol.title}</TableCell>
                  <TableCell className="text-xs">
                    {protocol.phase && (
                      <Badge variant="outline" className="text-xs">
                        {PROTOCOL_PHASE_LABELS[protocol.phase]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      variant={protocol.status === 'in_progress' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {PROTOCOL_STATUS_LABELS[protocol.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    {protocol.regions_count ?? 0}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    {protocol.sites_count ?? 0}
                  </TableCell>
                  <TableCell className="p-0 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex h-8 items-center justify-center gap-1.5 px-2 transition-all duration-200 hover:bg-[#79D7BE]/30 hover:text-foreground hover:scale-105 active:scale-95"
                        onClick={() => onProjectClick(protocol)}
                        title="Go to project"
                      >
                        <span className="text-xs">View</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
