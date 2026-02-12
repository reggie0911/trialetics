'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
  addFollowUpItem,
  updateFollowUpItem,
  deleteFollowUpItem,
} from '@/lib/actions/trip-reports';
import { ACTION_ITEM_CATEGORIES } from '@/lib/types/trip-reports';
import type { TripReportFollowUpItem } from '@/lib/types/trip-reports';

interface TripReportActionsSectionProps {
  tripReportId: string;
  items: TripReportFollowUpItem[];
  sectionTitle: 'Open Action Items' | 'Closed Action Items';
  statusFilter: 'open' | 'done';
  isLocked: boolean;
  onRefresh: () => void;
}

function formatDateForInput(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
}

export function TripReportActionsSection({
  tripReportId,
  items,
  sectionTitle,
  statusFilter,
  isLocked,
  onRefresh,
}: TripReportActionsSectionProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TripReportFollowUpItem | null>(null);
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDateOpened, setNewDateOpened] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDateOpened, setEditDateOpened] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDateResolved, setEditDateResolved] = useState('');
  const [editReviewerComments, setEditReviewerComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TripReportFollowUpItem | null>(null);

  const handleAdd = async () => {
    if (!newDescription.trim()) return;
    setIsSubmitting(true);
    const result = await addFollowUpItem(tripReportId, newDescription.trim(), {
      description: newDescription.trim(),
      category: newCategory || null,
      date_opened: newDateOpened || null,
      action_due_date: newDueDate || null,
    });
    if (result.success) {
      setNewDescription('');
      setNewCategory('');
      setNewDateOpened('');
      setNewDueDate('');
      setShowAddDialog(false);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleEdit = (item: TripReportFollowUpItem) => {
    setEditingItem(item);
    setEditDescription(item.description ?? item.activity ?? '');
    setEditCategory(item.category ?? '');
    setEditDateOpened(formatDateForInput(item.date_opened));
    setEditDueDate(formatDateForInput(item.action_due_date));
    setEditDateResolved(formatDateForInput(item.date_resolved));
    setEditReviewerComments(item.reviewer_comments ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    const result = await updateFollowUpItem(editingItem.id, {
      description: editDescription || editingItem.activity,
      category: editCategory || null,
      date_opened: editDateOpened || null,
      action_due_date: editDueDate || null,
      date_resolved: editDateResolved || null,
      status: editDateResolved ? 'done' : 'open',
      completed_date: editDateResolved ? `${editDateResolved}T00:00:00Z` : null,
      reviewer_comments: editReviewerComments || null,
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
    const result = await deleteFollowUpItem(itemToDelete.id);
    if (result.success) {
      setItemToDelete(null);
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'medium' });
  };

  const showAdd = statusFilter === 'open' && !isLocked;

  return (
    <TripReportSectionCard title={sectionTitle} count={items.length}>
      <div className="space-y-4">
        {showAdd && (
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add Action Item
          </Button>
        )}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No action items</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-sm font-medium">#{idx + 1}</span>
                  {!isLocked && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={() => setItemToDelete(item)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Category:</span>{' '}
                    {item.category ?? '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date Opened:</span>{' '}
                    {formatDate(item.date_opened)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Action Due Date:</span>{' '}
                    {formatDate(item.action_due_date)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date Resolved:</span>{' '}
                    {formatDate(item.date_resolved)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm block mb-1">Description:</span>
                  <p className="text-sm whitespace-pre-wrap">{item.description ?? item.activity ?? '—'}</p>
                </div>
                {item.reviewer_comments && (
                  <div>
                    <span className="text-muted-foreground text-sm block mb-1">Reviewer Comments:</span>
                    <p className="text-sm whitespace-pre-wrap">{item.reviewer_comments}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Category</label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v ?? '')}>
                <SelectTrigger className="text-sm h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Description</label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description..."
                className="min-h-[80px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Date Opened</label>
                <Input
                  type="date"
                  value={newDateOpened}
                  onChange={(e) => setNewDateOpened(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Action Due Date</label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newDescription.trim() || isSubmitting} className="text-xs">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Category</label>
              <Select value={editCategory} onValueChange={(v) => setEditCategory(v ?? '')}>
                <SelectTrigger className="text-sm h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Date Opened</label>
                <Input
                  type="date"
                  value={editDateOpened}
                  onChange={(e) => setEditDateOpened(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Action Due Date</label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Date Resolved</label>
                <Input
                  type="date"
                  value={editDateResolved}
                  onChange={(e) => setEditDateResolved(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Reviewer Comments</label>
              <Textarea
                value={editReviewerComments}
                onChange={(e) => setEditReviewerComments(e.target.value)}
                className="min-h-[60px] text-sm"
              />
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
            <AlertDialogTitle className="text-xs">Delete Action Item</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete this action item?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs text-destructive" onClick={handleDelete} disabled={isSubmitting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TripReportSectionCard>
  );
}
