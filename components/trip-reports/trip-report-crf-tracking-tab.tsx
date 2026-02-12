'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import {
  addTripReportCrfTracking,
  updateTripReportCrfTracking,
  deleteTripReportCrfTracking,
} from '@/lib/actions/trip-reports';
import type { TripReportCrfTracking } from '@/lib/types/trip-reports';

interface TripReportCrfTrackingTabProps {
  tripReportId: string;
  items: TripReportCrfTracking[];
  isLocked: boolean;
  onRefresh: () => void;
}

export function TripReportCrfTrackingTab({
  tripReportId,
  items,
  isLocked,
  onRefresh,
}: TripReportCrfTrackingTabProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TripReportCrfTracking | null>(null);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newVisitName, setNewVisitName] = useState('');
  const [editSourceVerified, setEditSourceVerified] = useState(false);
  const [editRetrieved, setEditRetrieved] = useState(false);
  const [editPageNumbers, setEditPageNumbers] = useState('');
  const [editChartsDate, setEditChartsDate] = useState('');
  const [editFormsDate, setEditFormsDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TripReportCrfTracking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'short' });
  };

  const handleAdd = async () => {
    setIsSubmitting(true);
    const result = await addTripReportCrfTracking(tripReportId, {
      subject_identifier: newSubjectId.trim() || null,
      visit_name: newVisitName.trim() || null,
    });
    if (result.success) {
      setNewSubjectId('');
      setNewVisitName('');
      setShowAddDialog(false);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleEdit = (item: TripReportCrfTracking) => {
    setEditingItem(item);
    setEditSourceVerified(item.source_verified);
    setEditRetrieved(item.retrieved);
    setEditPageNumbers(item.page_numbers_verified || '');
    setEditChartsDate(item.charts_reviewed_date ? item.charts_reviewed_date.slice(0, 10) : '');
    setEditFormsDate(item.forms_signed_date ? item.forms_signed_date.slice(0, 10) : '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    const result = await updateTripReportCrfTracking(editingItem.id, {
      source_verified: editSourceVerified,
      retrieved: editRetrieved,
      page_numbers_verified: editPageNumbers || null,
      charts_reviewed_date: editChartsDate ? `${editChartsDate}T00:00:00Z` : null,
      forms_signed_date: editFormsDate ? `${editFormsDate}T00:00:00Z` : null,
    });
    if (result.success) {
      setEditingItem(null);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const result = await deleteTripReportCrfTracking(itemToDelete.id);
    if (result.success) {
      setItemToDelete(null);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsDeleting(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-medium">CRF Tracking</CardTitle>
          {!isLocked && (
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add CRF
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No CRF tracking entries</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Subject / Visit</th>
                    <th className="text-left py-2 px-3 font-medium">Source Verified</th>
                    <th className="text-left py-2 px-3 font-medium">Retrieved</th>
                    <th className="text-left py-2 px-3 font-medium">Pages Verified</th>
                    <th className="text-left py-2 px-3 font-medium">Charts Reviewed</th>
                    <th className="text-left py-2 px-3 font-medium">Forms Signed</th>
                    {!isLocked && <th className="w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 px-3">
                        {item.subject_identifier || item.visit_name || '—'}
                      </td>
                      <td className="py-2 px-3">
                        {item.source_verified ? <Check className="h-4 w-4 text-green-600" /> : '—'}
                      </td>
                      <td className="py-2 px-3">
                        {item.retrieved ? <Check className="h-4 w-4 text-green-600" /> : '—'}
                      </td>
                      <td className="py-2 px-3">{item.page_numbers_verified || '—'}</td>
                      <td className="py-2 px-3">{formatDate(item.charts_reviewed_date)}</td>
                      <td className="py-2 px-3">{formatDate(item.forms_signed_date)}</td>
                      {!isLocked && (
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(item)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => setItemToDelete(item)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xs">Add CRF Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Subject Identifier</label>
              <Input
                value={newSubjectId}
                onChange={(e) => setNewSubjectId(e.target.value)}
                placeholder="e.g. SUBJ-001"
                className="text-[12px] h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Visit Name</label>
              <Input
                value={newVisitName}
                onChange={(e) => setNewVisitName(e.target.value)}
                placeholder="e.g. Week 4"
                className="text-[12px] h-8"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleAdd} disabled={isSubmitting} className="text-xs">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xs">Edit CRF Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="source_verified"
                checked={editSourceVerified}
                onCheckedChange={(v) => setEditSourceVerified(!!v)}
              />
              <label htmlFor="source_verified" className="text-xs">Source Verified</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="retrieved"
                checked={editRetrieved}
                onCheckedChange={(v) => setEditRetrieved(!!v)}
              />
              <label htmlFor="retrieved" className="text-xs">Retrieved</label>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Page Numbers Verified</label>
              <Input
                value={editPageNumbers}
                onChange={(e) => setEditPageNumbers(e.target.value)}
                placeholder="e.g. 1-5, 8"
                className="text-[12px] h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Charts Reviewed Date</label>
              <Input
                type="date"
                value={editChartsDate}
                onChange={(e) => setEditChartsDate(e.target.value)}
                className="text-[12px] h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Forms Signed Date</label>
              <Input
                type="date"
                value={editFormsDate}
                onChange={(e) => setEditFormsDate(e.target.value)}
                className="text-[12px] h-8"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)} className="text-xs">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting} className="text-xs">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs">Delete CRF Entry</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete this CRF tracking entry?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs text-destructive" onClick={handleDelete} disabled={isDeleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
