'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Pencil, RotateCcw } from 'lucide-react';
import { PaymentRecordDialog } from './payment-record-dialog';
import { revertPaymentRecord } from '@/lib/actions/clinical-payments';
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from '@/lib/types/clinical-payments';
import type {
  PaymentRecordFilters,
  PaymentStatus,
  PaymentType,
  PaymentRecordWithRelations,
} from '@/lib/types/clinical-payments';
import { useToast } from '@/hooks/use-toast';

interface PaymentRecordsTabProps {
  records: PaymentRecordWithRelations[];
  total: number;
  filters: PaymentRecordFilters;
  onFiltersChange: (filters: PaymentRecordFilters) => void;
  onRefresh: () => void;
  companyId: string;
}

function getSiteNumber(site: { site_number: string | null } | { site_number: string | null }[] | undefined): string {
  if (!site) return 'N/A';
  const s = Array.isArray(site) ? site[0] : site;
  return s?.site_number ?? 'N/A';
}

function getProtocolNumber(proto: { protocol_number: string } | { protocol_number: string }[] | undefined): string {
  if (!proto) return 'N/A';
  const p = Array.isArray(proto) ? proto[0] : proto;
  return p?.protocol_number ?? 'N/A';
}

export function PaymentRecordsTab({
  records,
  total,
  filters,
  onFiltersChange,
  onRefresh,
  companyId,
}: PaymentRecordsTabProps) {
  const { toast } = useToast();
  const [editRecord, setEditRecord] = useState<PaymentRecordWithRelations | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const handleStatusChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      status: value as PaymentStatus | 'all',
      page: 1,
    });
  };

  const handleTypeChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      payment_type: value as PaymentType | 'all',
      page: 1,
    });
  };

  const handleEdit = (r: PaymentRecordWithRelations) => {
    setEditRecord(r);
    setEditOpen(true);
  };

  const handleRevert = async (id: string) => {
    setRevertingId(id);
    const result = await revertPaymentRecord(id);
    if (result.success) {
      toast({ title: 'Success', description: 'Payment record reverted' });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error ?? 'Failed to revert',
        variant: 'destructive',
      });
    }
    setRevertingId(null);
  };

  const canRevert = (status: string) =>
    status === 'to_be_processed' || status === 'in_progress';

  const formatCurrency = (val: number | null) => {
    if (val == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Payment Records</CardTitle>
        <p className="text-xs text-muted-foreground">
          Payment records ready for processing. Filter by status or type.
        </p>
        <div className="flex gap-2 mt-2">
          <Select value={filters.status ?? 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px] text-xs h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.payment_type ?? 'all'} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[180px] text-xs h-8">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Types</SelectItem>
              {Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            No payment records found. Generate payments from site payment activities.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Payment #</TableHead>
                <TableHead className="text-xs">Site</TableHead>
                <TableHead className="text-xs">Protocol</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Earned</TableHead>
                <TableHead className="text-xs text-right">Requested</TableHead>
                <TableHead className="text-xs text-right">Check Amount</TableHead>
                <TableHead className="text-xs">Check Date</TableHead>
                <TableHead className="text-xs w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-medium">{r.payment_number ?? '-'}</TableCell>
                  <TableCell className="text-xs">{getSiteNumber(r.site)}</TableCell>
                  <TableCell className="text-xs">{getProtocolNumber(r.protocol)}</TableCell>
                  <TableCell className="text-xs">
                    {PAYMENT_TYPE_LABELS[r.payment_type as PaymentType] ?? r.payment_type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'processed' ? 'default' : 'secondary'} className="text-xs">
                      {PAYMENT_STATUS_LABELS[r.status as PaymentStatus] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right">{formatCurrency(r.earned_amount)}</TableCell>
                  <TableCell className="text-xs text-right">{formatCurrency(r.requested_amount)}</TableCell>
                  <TableCell className="text-xs text-right">{formatCurrency(r.check_amount)}</TableCell>
                  <TableCell className="text-xs">{formatDate(r.check_date)}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-xs"
                        onClick={() => handleEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {canRevert(r.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-xs"
                          onClick={() => handleRevert(r.id)}
                          disabled={!!revertingId}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <PaymentRecordDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={onRefresh}
          record={editRecord}
        />
        {total > (filters.pageSize ?? 25) && (
          <div className="flex justify-between items-center mt-4">
            <p className="text-xs text-muted-foreground">
              Showing {records.length} of {total} records
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => onFiltersChange({ ...filters, page: (filters.page ?? 1) - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={(filters.page ?? 1) * (filters.pageSize ?? 25) >= total}
                onClick={() => onFiltersChange({ ...filters, page: (filters.page ?? 1) + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
