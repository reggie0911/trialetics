'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuditLog } from '@/lib/actions/audit-trail';
import type { AuditLogEntry, AuditFilters } from '@/lib/types/audit-trail';
import { AUDITED_TABLE_LABELS } from '@/lib/types/audit-trail';
import { AuditLogDataTable } from './audit-log-data-table';
import { AuditDetailSheet } from './audit-detail-sheet';
import { InspectionExportDialog } from './inspection-export-dialog';

interface AuditTrailClientProps {
  companyId: string;
  profileId: string;
}

export function AuditTrailClient({ companyId, profileId }: AuditTrailClientProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, pageSize: 50 });
  const [searchInput, setSearchInput] = useState('');
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getAuditLog(companyId, filters);
    if (result.success && result.data) {
      setEntries(result.data.entries);
      setTotal(result.data.total);
    }
    setIsLoading(false);
  }, [companyId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-9 w-full sm:w-[200px] text-xs"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select
              value={filters.table_name || 'all'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, table_name: !v || v === 'all' ? undefined : v, page: 1 }))}
            >
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="All Tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {Object.entries(AUDITED_TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.action || 'all'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, action: v === 'all' ? undefined : v as AuditFilters['action'], page: 1 }))}
            >
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="h-9 w-[140px] text-xs"
              value={filters.date_from || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value || undefined, page: 1 }))}
            />
            <Input
              type="date"
              className="h-9 w-[140px] text-xs"
              value={filters.date_to || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value || undefined, page: 1 }))}
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <AuditLogDataTable
            entries={entries}
            total={total}
            isLoading={isLoading}
            filters={filters}
            onFiltersChange={setFilters}
            onSelect={setSelectedEntry}
          />
        </CardContent>
      </Card>

      {selectedEntry && (
        <AuditDetailSheet
          entry={selectedEntry}
          open={!!selectedEntry}
          onOpenChange={(open) => { if (!open) setSelectedEntry(null); }}
        />
      )}

      <InspectionExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        filters={filters}
        onSuccess={() => {
          setShowExportDialog(false);
          toast({ title: 'Export requested' });
        }}
      />
    </>
  );
}
