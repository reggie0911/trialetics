'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle } from 'lucide-react';
import { updateActionItem } from '@/lib/actions/action-items';
import {
  ACTION_ITEM_STATUS_LABELS,
  ACTION_ITEM_PRIORITY_LABELS,
  ACTION_ITEM_SOURCE_LABELS,
} from '@/lib/types/action-items';
import type { ActionItem, ActionItemStatus, ActionItemPriority } from '@/lib/types/action-items';

interface ActionItemDetailSheetProps {
  item: ActionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ActionItemDetailSheet({ item, open, onOpenChange, onUpdate }: ActionItemDetailSheetProps) {
  const [status, setStatus] = useState<ActionItemStatus>(item.status);
  const [priority, setPriority] = useState<ActionItemPriority>(item.priority);
  const [resolutionNotes, setResolutionNotes] = useState(item.resolution_notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const formatName = (profile: { first_name: string | null; last_name: string | null } | null | undefined) => {
    if (!profile) return '—';
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || '—';
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateActionItem(item.id, {
      status,
      priority,
      resolution_notes: resolutionNotes || undefined,
    });
    setIsSaving(false);
    onUpdate();
  };

  const handleEscalate = async () => {
    setIsSaving(true);
    await updateActionItem(item.id, { escalated: true });
    setIsSaving(false);
    onUpdate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{item.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {item.escalated && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Escalated{item.escalated_at ? ` on ${new Date(item.escalated_at).toLocaleDateString()}` : ''}
            </div>
          )}

          {item.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <p>{ACTION_ITEM_SOURCE_LABELS[item.source_type]}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <p>{item.category || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assigned To</Label>
              <p>{formatName(item.assigned_to)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assigned By</Label>
              <p>{formatName(item.assigned_by)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <p>{item.due_date || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Protocol</Label>
              <p>{item.protocol?.title || item.protocol?.protocol_number || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Created</Label>
              <p>{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            {item.resolved_date && (
              <div>
                <Label className="text-xs text-muted-foreground">Resolved</Label>
                <p>{new Date(item.resolved_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ActionItemStatus)}>
                <SelectTrigger>
                  <SelectValue
                    getDisplayLabel={(v) => ACTION_ITEM_STATUS_LABELS[v as ActionItemStatus] ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_ITEM_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ActionItemPriority)}>
                <SelectTrigger>
                  <SelectValue
                    getDisplayLabel={(v) => ACTION_ITEM_PRIORITY_LABELS[v as ActionItemPriority] ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_ITEM_PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(status === 'resolved' || status === 'closed') && (
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe how this was resolved..."
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {!item.escalated && (
              <Button variant="outline" onClick={handleEscalate} disabled={isSaving}>
                Escalate
              </Button>
            )}
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
