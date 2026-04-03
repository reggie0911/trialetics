'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, Loader2, Plus, Minus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import type { DiffLine } from '@/lib/actions/site-budget-propagation';
import {
  previewResyncSiteBudgetFromStudy,
  resyncSiteBudgetFromStudy,
} from '@/lib/actions/site-budget-propagation';

interface BudgetResyncDiffDialogProps {
  siteId: string;
  studyId: string;
  siteBudgetId: string;
  studyBudgetId: string;
  studyBudgetName: string;
  defaultEnrollment?: number;
  onSuccess?: () => void;
}

export function BudgetResyncDiffDialog({
  siteId,
  studyId,
  siteBudgetId,
  studyBudgetId,
  studyBudgetName,
  defaultEnrollment = 5,
  onSuccess,
}: BudgetResyncDiffDialogProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [enrollment, setEnrollment] = useState(defaultEnrollment);
  const [regionalModifier, setRegionalModifier] = useState(1);
  const [preserveOverrides, setPreserveOverrides] = useState(true);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [diff, setDiff] = useState<DiffLine[] | null>(null);

  const handlePreview = () => {
    setLoading(true);
    startTransition(async () => {
      const { diff: d, error } = await previewResyncSiteBudgetFromStudy(siteBudgetId, studyBudgetId, {
        siteEnrollment: enrollment,
        regionalModifier: regionalModifier !== 1 ? regionalModifier : null,
        preserveOverrides,
      });
      setLoading(false);
      if (error) { toast.error(error); return; }
      setDiff(d);
    });
  };

  const handleApply = () => {
    setApplying(true);
    startTransition(async () => {
      const { error } = await resyncSiteBudgetFromStudy(siteId, studyId, siteBudgetId, studyBudgetId, {
        siteEnrollment: enrollment,
        regionalModifier: regionalModifier !== 1 ? regionalModifier : null,
        preserveOverrides,
      });
      setApplying(false);
      if (error) { toast.error(error); return; }
      toast.success('Site budget re-synced from study budget.');
      setOpen(false);
      setDiff(null);
      onSuccess?.();
    });
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const added = diff?.filter((d) => d.type === 'added') ?? [];
  const changed = diff?.filter((d) => d.type === 'changed') ?? [];
  const removed = diff?.filter((d) => d.type === 'removed') ?? [];
  const unchanged = diff?.filter((d) => d.type === 'unchanged') ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDiff(null); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-xs gap-1.5" />}>
        <RefreshCw className="h-3.5 w-3.5" />
        Re-sync from study
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Re-sync from Study Budget</DialogTitle>
          <DialogDescription className="text-xs">
            Update this site budget from <strong>{studyBudgetName}</strong>.
            Preview changes before applying.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Site enrollment</Label>
              <Input
                type="number" min="1" className="text-xs h-8"
                value={enrollment}
                onChange={(e) => setEnrollment(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Regional modifier</Label>
              <Input
                type="number" min="0.01" step="0.05" className="text-xs h-8"
                value={regionalModifier}
                onChange={(e) => setRegionalModifier(parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="preserve-overrides" checked={preserveOverrides} onCheckedChange={setPreserveOverrides} />
            <Label htmlFor="preserve-overrides" className="text-xs cursor-pointer">
              Preserve site-level unit cost overrides
            </Label>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs w-full"
            onClick={handlePreview}
            disabled={loading}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Preview changes
          </Button>

          {diff != null && (
            <div className="space-y-3">
              {added.length > 0 && (
                <DiffSection
                  label={`${added.length} added`}
                  variant="added"
                  items={added}
                  formatCurrency={formatCurrency}
                />
              )}
              {changed.length > 0 && (
                <DiffSection
                  label={`${changed.length} changed`}
                  variant="changed"
                  items={changed}
                  formatCurrency={formatCurrency}
                />
              )}
              {removed.length > 0 && (
                <DiffSection
                  label={`${removed.length} removed`}
                  variant="removed"
                  items={removed}
                  formatCurrency={formatCurrency}
                />
              )}
              {unchanged.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {unchanged.length} line{unchanged.length !== 1 ? 's' : ''} unchanged.
                </p>
              )}
              {diff.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No differences found.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setOpen(false)}>Cancel</Button>
          {diff != null && (added.length > 0 || changed.length > 0 || removed.length > 0) && (
            <Button size="sm" className="text-xs" onClick={handleApply} disabled={applying}>
              {applying && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Apply re-sync
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffSection({
  label,
  variant,
  items,
  formatCurrency,
}: {
  label: string;
  variant: 'added' | 'changed' | 'removed';
  items: DiffLine[];
  formatCurrency: (n: number) => string;
}) {
  const colorClass =
    variant === 'added'
      ? 'text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400'
      : variant === 'removed'
      ? 'text-destructive bg-red-50 dark:bg-red-950/30'
      : 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400';
  const Icon = variant === 'added' ? Plus : variant === 'removed' ? Minus : ArrowRight;

  return (
    <div className="rounded-md border overflow-hidden">
      <div className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>
        {label}
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5 text-xs border-t first:border-0">
          <Icon className={`h-3 w-3 shrink-0 ${colorClass.split(' ')[0]}`} />
          <span className="flex-1 min-w-0 truncate">
            <span className="text-muted-foreground text-[10px] mr-1">{item.section}</span>
            {item.description}
          </span>
          <div className="flex items-center gap-1 shrink-0 text-[10px]">
            {item.oldValue != null && (
              <span className="text-muted-foreground line-through">{formatCurrency(item.oldValue)}</span>
            )}
            {item.newValue != null && (
              <span className="font-medium">{formatCurrency(item.newValue)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
