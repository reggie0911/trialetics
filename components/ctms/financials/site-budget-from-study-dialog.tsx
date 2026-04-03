'use client';

import { useMemo, useState, useTransition } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { generateSiteBudgetFromStudy } from '@/lib/actions/site-budget-propagation';
import { RegionalCostModifierLabel } from '@/components/ctms/financials/regional-cost-modifier-label';

/** Human-readable label for UI; sentence-cases the stored name. */
function formatStudyBudgetLabel(name: string): string {
  const t = name.trim();
  if (!t) return 'Unnamed budget';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export interface SiteBudgetStudyOption {
  id: string;
  name: string;
}

interface SiteBudgetFromStudyDialogProps {
  studyId: string;
  siteId: string;
  studyBudgets: SiteBudgetStudyOption[];
  onSuccess?: () => void;
}

export function SiteBudgetFromStudyDialog({
  studyId,
  siteId,
  studyBudgets,
  onSuccess,
}: SiteBudgetFromStudyDialogProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [studyBudgetId, setStudyBudgetId] = useState(() => studyBudgets[0]?.id ?? '');
  const [enrollment, setEnrollment] = useState(5);
  const [regionalModifier, setRegionalModifier] = useState(1);

  const studyBudgetSelectItems = useMemo(
    () =>
      studyBudgets.map((b) => ({
        value: b.id,
        label: formatStudyBudgetLabel(b.name),
      })),
    [studyBudgets],
  );

  const selectedName = formatStudyBudgetLabel(
    studyBudgets.find((b) => b.id === studyBudgetId)?.name ?? '',
  );

  const handleCreate = () => {
    if (!studyBudgetId) {
      toast.error('Select a study budget.');
      return;
    }
    setGenerating(true);
    startTransition(async () => {
      const result = await generateSiteBudgetFromStudy(studyId, siteId, studyBudgetId, {
        siteEnrollment: enrollment,
        regionalModifier: regionalModifier !== 1 ? regionalModifier : null,
      });
      setGenerating(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Site budget created with ${result.linesCreated} line item(s) from the study budget.`);
      setOpen(false);
      onSuccess?.();
    });
  };

  if (studyBudgets.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && studyBudgets.length > 0 && !studyBudgets.some((b) => b.id === studyBudgetId)) {
          setStudyBudgetId(studyBudgets[0].id);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" />}>
        <Share2 className="h-3.5 w-3.5" />
        Create from study budget
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Create site budget from study</DialogTitle>
          <DialogDescription className="text-xs">
            Copy line items from an existing study budget to this site. Per-patient costs use the enrollment you enter below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {studyBudgets.length > 1 ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Study budget</Label>
              <Select
                value={studyBudgetId}
                items={studyBudgetSelectItems}
                onValueChange={setStudyBudgetId}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Choose study budget" />
                </SelectTrigger>
                <SelectContent>
                  {studyBudgets.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {formatStudyBudgetLabel(b.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Using study budget: <span className="font-medium text-foreground">{selectedName}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5 w-full min-w-0">
              <Label className="text-xs">Enrollment at this site</Label>
              <Input
                type="number"
                min={1}
                className="text-xs h-8"
                value={enrollment}
                onChange={(e) => setEnrollment(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-1.5 w-full min-w-0">
              <RegionalCostModifierLabel htmlFor="site-budget-regional-cost-modifier" />
              <Input
                id="site-budget-regional-cost-modifier"
                type="number"
                min={0.01}
                step={0.05}
                className="text-xs h-8"
                value={regionalModifier}
                onChange={(e) => setRegionalModifier(parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" className="text-xs" onClick={handleCreate} disabled={generating || !studyBudgetId}>
            {generating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Create site budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
