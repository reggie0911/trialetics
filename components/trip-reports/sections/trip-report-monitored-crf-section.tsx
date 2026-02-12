'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripReportSectionCard } from './trip-report-section-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  updateTripReport,
} from '@/lib/actions/trip-reports';
import type { TripReportCrfTracking } from '@/lib/types/trip-reports';

interface TripReportMonitoredCrfSectionProps {
  tripReportId: string;
  items: TripReportCrfTracking[];
  reviewerComments: string | null;
  isLocked: boolean;
  onRefresh: () => void;
}

export function TripReportMonitoredCrfSection({
  tripReportId,
  items,
  reviewerComments,
  isLocked,
  onRefresh,
}: TripReportMonitoredCrfSectionProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TripReportCrfTracking | null>(null);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newCrfName, setNewCrfName] = useState('');
  const [newSdvType, setNewSdvType] = useState<'partial' | 'complete' | ''>('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editCrfName, setEditCrfName] = useState('');
  const [editSdvType, setEditSdvType] = useState<'partial' | 'complete' | ''>('');
  const [comments, setComments] = useState(reviewerComments ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TripReportCrfTracking | null>(null);

  const handleAdd = async () => {
    setIsSubmitting(true);
    const result = await addTripReportCrfTracking(tripReportId, {
      subject_identifier: newSubjectId.trim() || null,
      visit_name: newCrfName.trim() || undefined,
      crf_name: newCrfName.trim() || null,
      sdv_type: newSdvType === '' ? null : (newSdvType as 'partial' | 'complete'),
    });
    if (result.success) {
      setNewSubjectId('');
      setNewCrfName('');
      setNewSdvType('');
      setShowAddDialog(false);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleEdit = (item: TripReportCrfTracking) => {
    setEditingItem(item);
    setEditSubjectId(item.subject_identifier ?? '');
    setEditCrfName(item.crf_name ?? item.visit_name ?? '');
    setEditSdvType((item.sdv_type as 'partial' | 'complete') ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    const result = await updateTripReportCrfTracking(editingItem.id, {
      subject_identifier: editSubjectId.trim() || null,
      visit_name: editCrfName.trim() || null,
      crf_name: editCrfName.trim() || null,
      sdv_type: editSdvType === '' ? null : (editSdvType as 'partial' | 'complete'),
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
    setIsSubmitting(true);
    const result = await deleteTripReportCrfTracking(itemToDelete.id);
    if (result.success) {
      setItemToDelete(null);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleCommentsBlur = async () => {
    if (isLocked || comments === (reviewerComments ?? '')) return;
    setIsSubmitting(true);
    const result = await updateTripReport(tripReportId, {
      crf_reviewer_comments: comments || null,
    });
    if (result.success) {
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const getCrfDisplayName = (item: TripReportCrfTracking) =>
    item.crf_name ?? item.visit_name ?? '—';
  const getSdvDisplay = (item: TripReportCrfTracking) =>
    item.sdv_type === 'complete' ? 'Complete' : item.sdv_type === 'partial' ? 'Partial' : '—';

  return (
    <TripReportSectionCard title="Monitored CRF(s)" count={items.length}>
      <div className="space-y-4">
        {!isLocked && (
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add CRF
          </Button>
        )}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No CRF entries</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium w-10">#</th>
                  <th className="text-left py-2 px-3 font-medium">Subject Number</th>
                  <th className="text-left py-2 px-3 font-medium">CRF Name</th>
                  <th className="text-left py-2 px-3 font-medium">Partial or Complete SDV?</th>
                  {!isLocked && <th className="w-20" />}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
                  >
                    <td className="py-2 px-3">{idx + 1}</td>
                    <td className="py-2 px-3">{item.subject_identifier ?? '—'}</td>
                    <td className="py-2 px-3">{getCrfDisplayName(item)}</td>
                    <td className="py-2 px-3">{getSdvDisplay(item)}</td>
                    {!isLocked && (
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(item)}
                          >
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
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Reviewer Comments:
          </label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            onBlur={handleCommentsBlur}
            disabled={isLocked || isSubmitting}
            placeholder="Reviewer comments..."
            className="min-h-[60px] text-sm resize-none"
          />
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Monitored CRF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Subject Number</label>
              <Input
                value={newSubjectId}
                onChange={(e) => setNewSubjectId(e.target.value)}
                placeholder="e.g. 1009-0001"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">CRF Name</label>
              <Input
                value={newCrfName}
                onChange={(e) => setNewCrfName(e.target.value)}
                placeholder="e.g. 12 Month Visit"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Partial or Complete SDV?</label>
              <Select
                value={newSdvType || 'none'}
                onValueChange={(v) => setNewSdvType(v === 'none' ? '' : (v as 'partial' | 'complete'))}
              >
                <SelectTrigger className="text-sm h-9">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting} className="text-xs">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Monitored CRF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Subject Number</label>
              <Input
                value={editSubjectId}
                onChange={(e) => setEditSubjectId(e.target.value)}
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">CRF Name</label>
              <Input
                value={editCrfName}
                onChange={(e) => setEditCrfName(e.target.value)}
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Partial or Complete SDV?</label>
              <Select
                value={editSdvType || 'none'}
                onValueChange={(v) => setEditSdvType(v === 'none' ? '' : (v as 'partial' | 'complete'))}
              >
                <SelectTrigger className="text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting} className="text-xs">
              Save
            </Button>
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
            <AlertDialogAction
              className="text-xs text-destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TripReportSectionCard>
  );
}
