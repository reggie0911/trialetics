'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Loader2 } from 'lucide-react';
import { XIcon } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import type { StudySite } from '@/lib/types/ctms';
import type { IpAddSiteEquipmentContext, IpStudyMetricRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, type IpCategory } from '@/lib/types/ip-management';
import { getIpAddSiteEquipmentContext, linkIpCatalogItemToStudySites } from '@/lib/actions/ip-management';
import { cn } from '@/lib/utils';

export interface IpAddSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  studyLabel: string;
  metric: IpStudyMetricRow | null;
  sites: StudySite[];
  onSuccess: (ctx: { itemId: string }) => void | Promise<void>;
}

const readOnlyInputClass =
  'text-[12px] h-8 cursor-default bg-muted/45 shadow-none border-input/60 py-1 focus-visible:ring-0 focus-visible:border-input/60';

const sectionTitleClass =
  'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1';

const triggerClass =
  'border-input data-[placeholder]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 gap-1.5 rounded-md border bg-background py-2 pr-2 pl-2.5 shadow-xs transition-[color,box-shadow] focus-visible:ring-[3px] flex h-9 w-full min-w-0 max-w-full items-center justify-between text-[12px] outline-none disabled:cursor-not-allowed disabled:opacity-50';

export function IpAddSiteDialog({
  open,
  onOpenChange,
  studyId,
  studyLabel,
  metric,
  sites,
  onSuccess,
}: IpAddSiteDialogProps) {
  const { toast } = useToast();
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ctx, setCtx] = useState<IpAddSiteEquipmentContext | null>(null);

  const itemId = metric?.item_id ?? '';

  const linkedSet = useMemo(
    () => new Set(ctx?.linkedStudySiteIds ?? []),
    [ctx?.linkedStudySiteIds]
  );

  const eligibleSites = useMemo(
    () => sites.filter((s) => !linkedSet.has(s.id)),
    [sites, linkedSet]
  );

  const pickerSites = useMemo(
    () => eligibleSites.filter((s) => !selectedSiteIds.includes(s.id)),
    [eligibleSites, selectedSiteIds]
  );

  useEffect(() => {
    if (!open) {
      setSelectedSiteIds([]);
      setPickerOpen(false);
      setCtx(null);
      return;
    }
    setSelectedSiteIds([]);
    setPickerOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open || !studyId || !itemId) {
      setCtx(null);
      return;
    }
    let cancelled = false;
    setLoadingContext(true);
    void getIpAddSiteEquipmentContext({ studyId, itemId })
      .then((data) => {
        if (!cancelled) setCtx(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setCtx(null);
          toast({
            title: 'Could not load equipment details',
            description: e instanceof Error ? e.message : 'Error',
            variant: 'destructive',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, studyId, itemId, toast]);

  const calibration = ctx?.receiptMeta?.calibrationDays ?? '';
  const packaging = ctx?.receiptMeta?.packagingDescription ?? '';
  const part = ctx?.partOrMaterialNumber?.trim() || '';

  const handleSave = async () => {
    if (!studyId || !itemId || selectedSiteIds.length === 0) {
      toast({
        title: 'Select at least one site',
        description: 'Choose one or more study sites from the list.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await linkIpCatalogItemToStudySites({
        studyId,
        itemId,
        studySiteIds: selectedSiteIds,
      });
      toast({
        title: 'Site associations saved',
        description:
          selectedSiteIds.length === 1
            ? 'The site is now linked to this equipment.'
            : `${selectedSiteIds.length} sites are now linked to this equipment.`,
      });
      await onSuccess({ itemId });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not save association',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const removeSelected = (id: string) => {
    setSelectedSiteIds((prev) => prev.filter((x) => x !== id));
  };

  const catLabel =
    ctx && ctx.category
      ? (IP_CATEGORY_LABELS[ctx.category as IpCategory] ?? ctx.category)
      : '—';

  const triggerLabel =
    selectedSiteIds.length === 0
      ? null
      : selectedSiteIds.length === 1
        ? sites.find((s) => s.id === selectedSiteIds[0])?.name ?? `${selectedSiteIds.length} sites`
        : `${selectedSiteIds.length} sites selected`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[92vh] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 pb-3 pt-4 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">Add site</DialogTitle>
          <DialogDescription className="text-[12px] leading-snug text-muted-foreground">
            Choose one or more study sites (names only in the list). Already linked sites are hidden. Equipment summary
            below is read-only.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-4 pt-3">
          {loadingContext ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-[12px]">
              <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" />
              Loading equipment details…
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <section
                aria-label="Study site selection"
                className={cn(
                  'rounded-lg border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent',
                  'px-3 py-2.5 dark:from-primary/12 dark:via-primary/6 dark:to-transparent'
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0">
                    <Label className="text-xs text-foreground">
                      Study sites <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Site name only in list</span>
                  </div>
                  {!ctx ? (
                    <p className="text-[12px] text-muted-foreground">Equipment details could not be loaded.</p>
                  ) : sites.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      No sites on this study yet. Add sites from the{' '}
                      <Link href={`/protected/studies/${studyId}`} className="font-medium text-foreground underline">
                        study record
                      </Link>
                      .
                    </p>
                  ) : eligibleSites.length === 0 && selectedSiteIds.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      All study sites are already linked to this equipment.
                    </p>
                  ) : (
                    <>
                      {selectedSiteIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSiteIds.map((id) => {
                            const name = sites.find((s) => s.id === id)?.name ?? id;
                            return (
                              <span
                                key={id}
                                className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[12px] leading-tight shadow-xs"
                              >
                                <span className="truncate">{name}</span>
                                <button
                                  type="button"
                                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  aria-label={`Remove ${name}`}
                                  onClick={() => removeSelected(id)}
                                >
                                  <XIcon className="size-3.5" aria-hidden />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                        <PopoverTrigger
                          type="button"
                          className={cn(triggerClass, !triggerLabel && 'text-muted-foreground')}
                          disabled={eligibleSites.length === 0 && selectedSiteIds.length === 0}
                        >
                          <span className="truncate text-left">{triggerLabel ?? 'Choose study sites…'}</span>
                          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-[min(100vw-2rem,var(--anchor-width,24rem))] max-w-[calc(100vw-2rem)] p-0 gap-0"
                        >
                          <div className="border-b border-border px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                            Add site
                          </div>
                          <div className="max-h-60 overflow-y-auto p-1">
                            {pickerSites.length === 0 ? (
                              <p className="px-2 py-3 text-[12px] text-muted-foreground">
                                {eligibleSites.length === 0
                                  ? 'No more sites to add.'
                                  : 'All available sites are selected. Remove one above to add a different site.'}
                              </p>
                            ) : (
                              <ul className="flex flex-col gap-0.5">
                                {pickerSites.map((s) => (
                                  <li key={s.id}>
                                    <label
                                      className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-muted/80'
                                      )}
                                    >
                                      <Checkbox
                                        checked={false}
                                        className="border-input"
                                        onCheckedChange={(v) => {
                                          if (v === true) {
                                            setSelectedSiteIds((prev) => [...prev, s.id]);
                                          }
                                        }}
                                      />
                                      <span className="min-w-0 flex-1 leading-snug">{s.name}</span>
                                    </label>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              </section>

              <div className="min-w-0" role="region" aria-labelledby="add-site-equipment-heading">
                <h3 id="add-site-equipment-heading" className={sectionTitleClass}>
                  Equipment summary
                </h3>
                <div className="mt-1 grid gap-2 rounded-md border border-border/80 bg-card/40 p-3 sm:grid-cols-2 sm:gap-x-3">
                  <div className="space-y-0.5 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Protocol</Label>
                    <div className="flex min-h-8 w-full items-center rounded-md border border-input/50 bg-muted/35 px-2 py-1.5 text-[12px] text-foreground">
                      {studyLabel || '—'}
                    </div>
                  </div>

                  <div className="space-y-0.5 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Equipment name</Label>
                    <div className="rounded-md border border-input/50 bg-muted/35 px-2 py-1.5 text-[12px] font-medium leading-snug text-foreground">
                      {ctx?.itemName ?? metric?.item_name ?? '—'}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Input className={cn(readOnlyInputClass, 'w-full min-w-0')} value={catLabel} disabled readOnly tabIndex={-1} />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">Unit</Label>
                    <Input
                      className={cn(readOnlyInputClass, 'w-full min-w-0')}
                      value={ctx?.unit ?? metric?.unit ?? ''}
                      disabled
                      readOnly
                      tabIndex={-1}
                    />
                  </div>

                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">Part / material number</Label>
                    <Input
                      className={cn(readOnlyInputClass, 'w-full min-w-0')}
                      value={part || '—'}
                      disabled
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">Calibration interval (calendar days)</Label>
                    <Input
                      className={cn(readOnlyInputClass, 'w-full min-w-0')}
                      value={calibration || '—'}
                      disabled
                      readOnly
                      tabIndex={-1}
                    />
                  </div>

                  <div className="space-y-0.5 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Packaging description</Label>
                    <Textarea
                      className="text-[12px] min-h-[56px] max-h-28 resize-y bg-muted/45 border-input/60 py-1.5 shadow-none focus-visible:ring-0 cursor-default"
                      value={packaging || '—'}
                      disabled
                      readOnly
                      tabIndex={-1}
                    />
                  </div>

                  <div className="space-y-0.5 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Equipment image</Label>
                    <div
                      className={cn(
                        'flex min-h-[72px] w-full flex-col items-center justify-center rounded-md border border-dashed border-input/70',
                        'bg-muted/25 px-2 py-2 text-[12px] text-muted-foreground'
                      )}
                    >
                      {ctx?.imageSignedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ctx.imageSignedUrl} alt="" className="max-h-24 max-w-full rounded object-contain" />
                      ) : (
                        <span>No image on file</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!loadingContext && (
          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-5 py-2.5 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || sites.length === 0 || !ctx || selectedSiteIds.length === 0}
              onClick={() => void handleSave()}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
