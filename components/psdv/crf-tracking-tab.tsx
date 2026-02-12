'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  getCrfTrackingForCompany,
  getSiteVisitsForCrf,
  deleteCrfTracking,
} from '@/lib/actions/psdv';
import type { CrfTrackingWithRelations } from '@/lib/types/clinical-trials';
import { CrfTrackingTable } from './crf-tracking-table';
import { AddCrfTrackingDialog } from './add-crf-tracking-dialog';
import { EditCrfTrackingDialog } from './edit-crf-tracking-dialog';
import { CalendarCheck, Calendar } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CrfTrackingTabProps {
  companyId: string;
  onDataChange?: () => void;
}

export function CrfTrackingTab({ companyId, onDataChange }: CrfTrackingTabProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<CrfTrackingWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [siteVisits, setSiteVisits] = useState<Array<{ id: string; visit_name: string; visit_start: string; visit_type: string }>>([]);
  const [siteVisitFilter, setSiteVisitFilter] = useState<string>('all');
  const [sourceVerifiedFilter, setSourceVerifiedFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState<'scheduled' | 'unscheduled'>('scheduled');
  const [editingItem, setEditingItem] = useState<CrfTrackingWithRelations | null>(null);
  const [deletingItem, setDeletingItem] = useState<CrfTrackingWithRelations | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [trackingRes, siteRes] = await Promise.all([
      getCrfTrackingForCompany(companyId, {
        site_visit_id: siteVisitFilter === 'all' ? undefined : siteVisitFilter,
        source_verified: sourceVerifiedFilter === 'all' ? undefined : sourceVerifiedFilter === 'yes',
        pageSize: 100,
      }),
      getSiteVisitsForCrf(companyId),
    ]);

    if (trackingRes.success && trackingRes.data) {
      setItems(trackingRes.data.items);
      setTotal(trackingRes.data.total);
    } else {
      toast({ title: 'Error', description: trackingRes.error, variant: 'destructive' });
    }
    if (siteRes.success && siteRes.data) {
      setSiteVisits(siteRes.data);
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast omitted to avoid dependency loop
  }, [companyId, siteVisitFilter, sourceVerifiedFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSuccess = () => {
    loadData();
    onDataChange?.();
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    const result = await deleteCrfTracking(deletingItem.id, companyId);
    if (result.success) {
      toast({ title: 'Success', description: 'CRF record removed' });
      handleSuccess();
      setDeletingItem(null);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={siteVisitFilter} onValueChange={(v) => setSiteVisitFilter(v ?? '')}>
          <SelectTrigger className="w-[200px] h-8 text-[12px]">
            <SelectValue placeholder="Site visit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[12px]">All site visits</SelectItem>
            {siteVisits.map((sv) => (
              <SelectItem key={sv.id} value={sv.id} className="text-[12px]">
                {sv.visit_name} ({new Date(sv.visit_start).toLocaleDateString()})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceVerifiedFilter} onValueChange={(v) => setSourceVerifiedFilter(v ?? '')}>
          <SelectTrigger className="w-[140px] h-8 text-[12px]">
            <SelectValue placeholder="Source verified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[12px]">All</SelectItem>
            <SelectItem value="yes" className="text-[12px]">Verified</SelectItem>
            <SelectItem value="no" className="text-[12px]">Pending</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={() => { setAddMode('scheduled'); setAddDialogOpen(true); }}
        >
          <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
          Add Scheduled
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={() => { setAddMode('unscheduled'); setAddDialogOpen(true); }}
        >
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          Add Unscheduled
        </Button>
      </div>

      <CrfTrackingTable
        items={items}
        isLoading={isLoading}
        onEdit={setEditingItem}
        onDelete={setDeletingItem}
        onRefresh={loadData}
      />

      <AddCrfTrackingDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        companyId={companyId}
        mode={addMode}
        onSuccess={handleSuccess}
      />

      {editingItem && (
        <EditCrfTrackingDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          item={editingItem}
          onSuccess={handleSuccess}
        />
      )}

      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove CRF record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tracking link between the site visit and subject visit. CRF data is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
