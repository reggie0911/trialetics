'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { requestAuditExport } from '@/lib/actions/audit-trail';
import type { AuditFilters } from '@/lib/types/audit-trail';

interface InspectionExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AuditFilters;
  onSuccess: () => void;
}

export function InspectionExportDialog({
  open,
  onOpenChange,
  filters,
  onSuccess,
}: InspectionExportDialogProps) {
  const [exportType, setExportType] = useState<'inspection_package' | 'ad_hoc'>('ad_hoc');
  const [dateFrom, setDateFrom] = useState(filters.date_from || '');
  const [dateTo, setDateTo] = useState(filters.date_to || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExport = async () => {
    setIsSubmitting(true);
    const exportFilters: AuditFilters = {
      ...filters,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
    const result = await requestAuditExport(exportFilters, exportType);
    setIsSubmitting(false);
    if (result.success) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Audit Trail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Export Type</Label>
            <Select value={exportType} onValueChange={(v) => setExportType(v as typeof exportType)}>
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ad_hoc">Ad-Hoc Export</SelectItem>
                <SelectItem value="inspection_package">Inspection Package</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                className="mt-1 text-xs"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                className="mt-1 text-xs"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {exportType === 'inspection_package'
              ? 'Creates a comprehensive package with all changes for regulatory inspection.'
              : 'Exports filtered audit log entries as a report.'}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleExport} disabled={isSubmitting}>
            {isSubmitting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
