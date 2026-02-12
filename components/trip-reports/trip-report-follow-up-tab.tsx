'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  updateFollowUpItem,
  addFollowUpItem,
  deleteFollowUpItem,
} from '@/lib/actions/trip-reports';
import type { TripReportFollowUpItem } from '@/lib/types/trip-reports';
import { FOLLOW_UP_ITEM_STATUS_LABELS } from '@/lib/types/trip-reports';

interface TripReportFollowUpTabProps {
  tripReportId: string;
  items: TripReportFollowUpItem[];
  isLocked: boolean;
  onRefresh: () => void;
}

export function TripReportFollowUpTab({
  tripReportId,
  items,
  isLocked,
  onRefresh,
}: TripReportFollowUpTabProps) {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<TripReportFollowUpItem | null>(null);
  const [editCompletedDate, setEditCompletedDate] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newActivity, setNewActivity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TripReportFollowUpItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDateForInput = (dateStr: string | null) => {
    if (!dateStr) return '';
    return dateStr.slice(0, 16);
  };

  const handleEdit = (item: TripReportFollowUpItem) => {
    setEditingItem(item);
    setEditCompletedDate(formatDateForInput(item.completed_date));
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    const result = await updateFollowUpItem(editingItem.id, {
      completed_date: editCompletedDate ? `${editCompletedDate}:00Z` : null,
      status: editCompletedDate ? 'done' : 'open',
    });
    if (result.success) {
      setEditingItem(null);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleAdd = async () => {
    if (!newActivity.trim()) return;
    setIsSubmitting(true);
    const result = await addFollowUpItem(tripReportId, newActivity.trim());
    if (result.success) {
      setNewActivity('');
      setShowAddDialog(false);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const result = await deleteFollowUpItem(itemToDelete.id);
    if (result.success) {
      setItemToDelete(null);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsDeleting(false);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-medium">Action Items</CardTitle>
          {!isLocked && (
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add Action Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No follow-up items</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border p-3 text-[12px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.activity}</div>
                    {item.completed_date && (
                      <div className="text-muted-foreground mt-1">Completed: {formatDate(item.completed_date)}</div>
                    )}
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px]">
                    {FOLLOW_UP_ITEM_STATUS_LABELS[item.status as 'open' | 'done']}
                  </span>
                  {!isLocked && (
                    <div className="flex gap-1 shrink-0">
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
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xs">Edit Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Completed Date</label>
              <Input
                type="datetime-local"
                value={editCompletedDate}
                onChange={(e) => setEditCompletedDate(e.target.value)}
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xs">Add Action Item</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              placeholder="Action item"
              className="text-[12px] h-8"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleAdd} disabled={!newActivity.trim() || isSubmitting} className="text-xs">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs">Delete Item</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete this follow-up item?
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
