'use client';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { Deviation, DeviationFilters } from '@/lib/types/deviations';
import { DEVIATION_STATUS_LABELS, DEVIATION_SEVERITY_LABELS } from '@/lib/types/deviations';
import { useState } from 'react';

interface DeviationsDataTableProps {
  items: Deviation[];
  total: number;
  isLoading: boolean;
  filters: DeviationFilters;
  onFiltersChange: (filters: DeviationFilters) => void;
  onSelect: (item: Deviation) => void;
}

export function DeviationsDataTable({
  items,
  total,
  isLoading,
  filters,
  onFiltersChange,
  onSelect,
}: DeviationsDataTableProps) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const totalPages = Math.ceil(total / pageSize);
  const [searchInput, setSearchInput] = useState('');

  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive' as const;
      case 'major': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open': return 'default' as const;
      case 'closed': return 'outline' as const;
      default: return 'secondary' as const;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading deviations...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 h-9 w-full sm:w-[200px] text-xs"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onFiltersChange({ ...filters, search: searchInput, page: 1 })}
          />
        </div>
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, status: v === 'all' ? undefined : v as DeviationFilters['status'], page: 1 })}
        >
          <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(DEVIATION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.severity || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, severity: v === 'all' ? undefined : v as DeviationFilters['severity'], page: 1 })}
        >
          <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="All Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {Object.entries(DEVIATION_SEVERITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No deviations found</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Number</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Severity</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Protocol</TableHead>
                <TableHead className="text-xs">Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(item)}>
                  <TableCell className="text-xs font-mono">{item.deviation_number}</TableCell>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant={severityBadge(item.severity)} className="text-[10px]">
                      {DEVIATION_SEVERITY_LABELS[item.severity]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadge(item.status)} className="text-[10px]">
                      {DEVIATION_STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.protocol?.protocol_number || item.protocol?.title || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.detected_date ? new Date(item.detected_date).toLocaleDateString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onFiltersChange({ ...filters, page: page - 1 })}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onFiltersChange({ ...filters, page: page + 1 })}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
