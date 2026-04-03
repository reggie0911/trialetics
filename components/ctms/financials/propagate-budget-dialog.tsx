'use client';

import { useState, useTransition } from 'react';
import { Share2, Loader2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
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

import type { StudySite } from '@/lib/types/ctms';
import { generateSiteBudgetFromStudy } from '@/lib/actions/site-budget-propagation';
import { RegionalCostModifierLabel } from '@/components/ctms/financials/regional-cost-modifier-label';

interface PropagateBudgetDialogProps {
  studyId: string;
  studyBudgetId: string;
  studyBudgetName: string;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  onSuccess?: () => void;
}

interface SiteOverride {
  siteId: string;
  enrollment: number;
  regionalModifier: number;
}

export function PropagateBudgetDialog({
  studyId,
  studyBudgetId,
  studyBudgetName,
  sites,
  onSuccess,
}: PropagateBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());
  const [defaultEnrollment, setDefaultEnrollment] = useState(5);
  const [defaultModifier, setDefaultModifier] = useState(1);
  const [overrides, setOverrides] = useState<Record<string, SiteOverride>>({});
  const [results, setResults] = useState<Array<{ siteName: string; linesCreated: number; error: string | null }>>([]);
  const [done, setDone] = useState(false);

  const toggleSite = (siteId: string) => {
    const next = new Set(selectedSiteIds);
    if (next.has(siteId)) next.delete(siteId);
    else next.add(siteId);
    setSelectedSiteIds(next);
  };

  const getSiteOverride = (siteId: string): SiteOverride => ({
    siteId,
    enrollment: overrides[siteId]?.enrollment ?? defaultEnrollment,
    regionalModifier: overrides[siteId]?.regionalModifier ?? defaultModifier,
  });

  const updateOverride = (siteId: string, patch: Partial<SiteOverride>) => {
    setOverrides((prev) => ({
      ...prev,
      [siteId]: { ...getSiteOverride(siteId), ...patch },
    }));
  };

  const handlePropagate = () => {
    if (selectedSiteIds.size === 0) {
      toast.error('Select at least one site.');
      return;
    }
    setGenerating(true);
    startTransition(async () => {
      const siteArray = [...selectedSiteIds];
      const resultItems: Array<{ siteName: string; linesCreated: number; error: string | null }> = [];
      for (const siteId of siteArray) {
        const site = sites.find((s) => s.id === siteId);
        const override = getSiteOverride(siteId);
        const result = await generateSiteBudgetFromStudy(studyId, siteId, studyBudgetId, {
          siteEnrollment: override.enrollment,
          regionalModifier: override.regionalModifier !== 1 ? override.regionalModifier : null,
        });
        resultItems.push({
          siteName: site?.name ?? siteId,
          linesCreated: result.linesCreated,
          error: result.error,
        });
      }
      setResults(resultItems);
      setDone(true);
      setGenerating(false);
      const errors = resultItems.filter((r) => r.error);
      if (errors.length === 0) {
        toast.success(`Budget propagated to ${resultItems.length} site(s).`);
        onSuccess?.();
      } else {
        toast.error(`${errors.length} site(s) failed. Check details.`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setDone(false); setResults([]); setSelectedSiteIds(new Set()); } }}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-xs gap-1.5" />}>
        <Share2 className="h-3.5 w-3.5" />
        Propagate to sites
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Propagate to Site Budgets</DialogTitle>
          <DialogDescription className="text-xs">
            Auto-generate site budgets from <strong>{studyBudgetName}</strong>.
            Per-patient costs are scaled by site enrollment.
          </DialogDescription>
        </DialogHeader>

        {!done ? (
          <div className="space-y-4 py-2">
            {/* Defaults */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5 w-full min-w-0">
                <Label className="text-xs">Default enrollment / site</Label>
                <Input
                  type="number"
                  min="1"
                  className="text-xs h-8"
                  value={defaultEnrollment}
                  onChange={(e) => setDefaultEnrollment(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1.5 w-full min-w-0">
                <RegionalCostModifierLabel htmlFor="propagate-default-regional-modifier" />
                <Input
                  id="propagate-default-regional-modifier"
                  type="number"
                  min="0.01"
                  step="0.05"
                  className="text-xs h-8"
                  value={defaultModifier}
                  onChange={(e) => setDefaultModifier(parseFloat(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Site selection */}
            <div className="space-y-2">
              <Label className="text-xs">Select sites</Label>
              <div className="divide-y rounded-md border max-h-56 overflow-y-auto">
                {sites.map((site) => {
                  const selected = selectedSiteIds.has(site.id);
                  const override = getSiteOverride(site.id);
                  return (
                    <div key={site.id} className="p-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selected}
                          onCheckedChange={() => toggleSite(site.id)}
                          className="h-4 w-7"
                        />
                        <span className="text-xs flex-1">
                          {site.site_number && <span className="text-muted-foreground mr-1">{site.site_number}</span>}
                          {site.name}
                        </span>
                        {selected && (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min="1"
                              className="text-xs h-6 w-16"
                              value={override.enrollment}
                              onChange={(e) => updateOverride(site.id, { enrollment: parseInt(e.target.value) || 1 })}
                              title="Enrollment override for this site"
                            />
                            <span className="text-[10px] text-muted-foreground">pts</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {sites.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No sites found for this study.</p>
                )}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              {selectedSiteIds.size} of {sites.length} site(s) selected.
              Each site gets its own site budget linked to this study budget.
            </p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            <p className="text-xs font-medium mb-2">Propagation results</p>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {r.error ? (
                  <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                )}
                <span className="flex-1">{r.siteName}</span>
                {r.error ? (
                  <span className="text-destructive text-[10px]">{r.error}</span>
                ) : (
                  <Badge variant="outline" className="text-[10px]">{r.linesCreated} lines</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setOpen(false)}>
            {done ? 'Close' : 'Cancel'}
          </Button>
          {!done && (
            <Button size="sm" className="text-xs" onClick={handlePropagate} disabled={generating || selectedSiteIds.size === 0}>
              {generating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Propagate to {selectedSiteIds.size} site{selectedSiteIds.size !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
