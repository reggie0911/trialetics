'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  updateChecklistItem,
  addChecklistItem,
  deleteChecklistItem,
} from '@/lib/actions/trip-reports';
import type { TripReportChecklistItem } from '@/lib/types/trip-reports';
import { CHECKLIST_ITEM_STATUS_LABELS, type ChecklistItemStatus } from '@/lib/types/trip-reports';

interface TripReportChecklistTabProps {
  tripReportId: string;
  items: TripReportChecklistItem[];
  isLocked: boolean;
  onRefresh: () => void;
}

export function TripReportChecklistTab({
  tripReportId,
  items,
  isLocked,
  onRefresh,
}: TripReportChecklistTabProps) {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<TripReportChecklistItem | null>(null);
  const [editStatus, setEditStatus] = useState<ChecklistItemStatus>('pending');
  const [editComments, setEditComments] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newActivity, setNewActivity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TripReportChecklistItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (item: TripReportChecklistItem) => {
    setEditingItem(item);
    setEditStatus(item.status as ChecklistItemStatus);
    setEditComments(item.comments || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    const result = await updateChecklistItem(editingItem.id, { status: editStatus, comments: editComments });
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
    const result = await addChecklistItem(tripReportId, newActivity.trim());
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
    const result = await deleteChecklistItem(itemToDelete.id);
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
          <CardTitle className="text-xs font-medium">Checklist Activities</CardTitle>
          {!isLocked && (
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add Activity
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No checklist items</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border p-3 text-[12px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.activity}</div>
                    {item.comments && (
                      <div className="text-muted-foreground mt-1">{item.comments}</div>
                    )}
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px]">
                    {CHECKLIST_ITEM_STATUS_LABELS[item.status as ChecklistItemStatus]}
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
            <DialogTitle className="text-xs">Edit Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ChecklistItemStatus)}>
                <SelectTrigger className="text-[12px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHECKLIST_ITEM_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-[12px]">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Comments</label>
              <Input
                value={editComments}
                onChange={(e) => setEditComments(e.target.value)}
                placeholder="Comments..."
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
            <DialogTitle className="text-xs">Add Checklist Activity</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              placeholder="Activity description"
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
              Are you sure you want to delete this checklist item?
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
