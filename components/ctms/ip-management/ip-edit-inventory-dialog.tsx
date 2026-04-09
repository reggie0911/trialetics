'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { IpCategory, IpItemCatalogMetadata, IpStudyMetricRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS } from '@/lib/types/ip-management';
import { getIpItemForEdit, updateIpItem, uploadIpReceiptImage } from '@/lib/actions/ip-management';
import { cn } from '@/lib/utils';
import { EDIT_INVENTORY_DEFAULT_CONTENTS_DESCRIPTION } from '@/lib/utils/ip-inventory-ui-copy';
import { formatPhoneFieldInput, normalizePhoneDisplayForInput } from '@/lib/utils/phone-input';

export interface IpEditInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  studyLabel: string;
  itemId: string;
  metric: IpStudyMetricRow | null;
  pageCategoryFilterLocked: boolean;
  categoryFilter: IpCategory | null;
  onSuccess: () => void | Promise<void>;
}

export function IpEditInventoryDialog({
  open,
  onOpenChange,
  studyId,
  studyLabel,
  itemId,
  metric,
  pageCategoryFilterLocked,
  categoryFilter,
  onSuccess,
}: IpEditInventoryDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<IpCategory>('study_supplies');
  const [unit, setUnit] = useState('Each');
  const [partNumber, setPartNumber] = useState('');
  const [minStockThreshold, setMinStockThreshold] = useState('');
  /** Default inner units per catalog unit; prefills Add order optional contents for any category. */
  const [defaultContentsPerCatalog, setDefaultContentsPerCatalog] = useState('');

  const [supplierName, setSupplierName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [calibrationDays, setCalibrationDays] = useState('');
  const [packagingDescription, setPackagingDescription] = useState('');

  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('');
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('');
  const [dimLength, setDimLength] = useState('');
  const [dimWidth, setDimWidth] = useState('');
  const [dimHeight, setDimHeight] = useState('');
  const [dimensionUnit, setDimensionUnit] = useState('');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  /** Path last saved on the item; used when the user does not change the image. */
  const [storedImagePath, setStoredImagePath] = useState<string | null>(null);
  /** When true, save clears `imageStoragePath` in metadata. */
  const [clearCatalogImage, setClearCatalogImage] = useState(false);

  const [linkedSites, setLinkedSites] = useState<{ siteNumber: string | null; siteName: string }[]>([]);

  const effectiveCategory = pageCategoryFilterLocked && categoryFilter ? categoryFilter : category;

  const applyLoaded = useCallback(
    (data: Awaited<ReturnType<typeof getIpItemForEdit>>) => {
      setName(data.name);
      setCategory(data.category);
      setUnit(data.unit);
      setPartNumber(data.partOrMaterialNumber ?? '');
      setMinStockThreshold(data.minStockThreshold != null ? String(data.minStockThreshold) : '');
      setDefaultContentsPerCatalog(
        data.catalogMeta.defaultContentsPerCatalogUnit != null
          ? String(data.catalogMeta.defaultContentsPerCatalogUnit)
          : ''
      );
      const m = data.catalogMeta;
      setSupplierName(m.supplier?.name ?? '');
      setAddress(m.supplier?.address ?? '');
      setCity(m.supplier?.city ?? '');
      setState(m.supplier?.state ?? '');
      setZip(m.supplier?.zip ?? '');
      setCountry(m.supplier?.country ?? '');
      setContactName(m.contact?.name ?? '');
      setContactEmail(m.contact?.email ?? '');
      setContactPhone(normalizePhoneDisplayForInput(m.contact?.phone ?? ''));
      setCalibrationDays(m.calibrationDays ?? '');
      setPackagingDescription(m.packagingDescription ?? '');
      setWeight(m.physical?.weight ?? '');
      setWeightUnit(m.physical?.weightUnit ?? '');
      setVolume(m.physical?.volume ?? '');
      setVolumeUnit(m.physical?.volumeUnit ?? '');
      setDimLength(m.physical?.length ?? '');
      setDimWidth(m.physical?.width ?? '');
      setDimHeight(m.physical?.height ?? '');
      setDimensionUnit(m.physical?.dimensionUnit ?? '');
      setStoredImagePath(m.imageStoragePath ?? null);
      setClearCatalogImage(false);
      setImageFile(null);
      setImagePreviewUrl(data.imageSignedUrl);
      setLinkedSites(data.linkedSites);
    },
    []
  );

  useEffect(() => {
    if (!open || !studyId || !itemId) return;
    setLoading(true);
    void getIpItemForEdit({ studyId, itemId })
      .then(applyLoaded)
      .catch((e) => {
        toast({
          title: 'Could not load item',
          description: e instanceof Error ? e.message : 'Error',
          variant: 'destructive',
        });
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, studyId, itemId, applyLoaded, onOpenChange, toast]);

  useEffect(() => {
    if (!imageFile) return;
    setClearCatalogImage(false);
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const buildCatalogMetadata = (imagePath: string | undefined): IpItemCatalogMetadata => ({
    supplier: {
      name: supplierName.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zip: zip.trim() || undefined,
      country: country.trim() || undefined,
    },
    contact: {
      name: contactName.trim() || undefined,
      email: contactEmail.trim() || undefined,
      phone: contactPhone.trim() || undefined,
    },
    calibrationDays: calibrationDays.trim() || undefined,
    packagingDescription: packagingDescription.trim() || undefined,
    physical: {
      weight: weight.trim() || undefined,
      weightUnit: weightUnit.trim() || undefined,
      volume: volume.trim() || undefined,
      volumeUnit: volumeUnit.trim() || undefined,
      length: dimLength.trim() || undefined,
      width: dimWidth.trim() || undefined,
      height: dimHeight.trim() || undefined,
      dimensionUnit: dimensionUnit.trim() || undefined,
    },
    imageStoragePath: imagePath,
  });

  const handleSubmit = async () => {
    if (!studyId || !itemId || !name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    let imagePath: string | undefined;
    if (imageFile) {
      try {
        const fd = new FormData();
        fd.set('studyId', studyId);
        fd.set('file', imageFile);
        const up = await uploadIpReceiptImage(fd);
        imagePath = up.path;
      } catch (e) {
        toast({
          title: 'Image upload failed',
          description: e instanceof Error ? e.message : 'Error',
          variant: 'destructive',
        });
        return;
      }
    } else if (clearCatalogImage) {
      imagePath = '';
    } else {
      imagePath = storedImagePath ?? undefined;
    }

    const baseCatalogMetadata = buildCatalogMetadata(imagePath);
    const catalogMetadata: IpItemCatalogMetadata = {
      ...baseCatalogMetadata,
      defaultContentsPerCatalogUnit:
        defaultContentsPerCatalog.trim() === ''
          ? null
          : (() => {
              const n = parseInt(defaultContentsPerCatalog.trim(), 10);
              return Number.isFinite(n) && n >= 1 ? n : null;
            })(),
    };

    setSubmitting(true);
    try {
      await updateIpItem({
        itemId,
        name: name.trim(),
        category: effectiveCategory,
        unit: unit.trim() || 'Each',
        partOrMaterialNumber: partNumber.trim() || null,
        catalogMetadata,
        minStockThreshold:
          minStockThreshold.trim() !== '' ? Math.max(0, Math.floor(Number(minStockThreshold))) : null,
      });
      toast({ title: 'Inventory details saved' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const m = metric;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[min(90vh,720px)] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle>Edit inventory</DialogTitle>
          <DialogDescription>
            Update catalog details for this item. Site links are shown for context only; use other actions to add sites or
            move stock.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 px-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="px-6 overflow-y-auto flex-1 space-y-4 pb-2">
              <div className="rounded-md border bg-muted/30 p-3 text-[12px] space-y-1">
                <div>
                  <span className="text-muted-foreground">Study / protocol</span>
                  <div className="font-medium">{studyLabel || '—'}</div>
                </div>
                <div className="pt-2 border-t border-border/60">
                  <span className="text-muted-foreground">Associated sites</span>
                  {linkedSites.length === 0 ? (
                    <div className="mt-0.5">None linked yet.</div>
                  ) : (
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      {linkedSites.map((s, i) => (
                        <li key={i}>
                          {s.siteNumber ? `${s.siteNumber} — ` : ''}
                          {s.siteName || 'Site'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="pt-2 border-t border-border/60 space-y-3 text-center">
                  <span className="text-muted-foreground">Current quantities (read-only)</span>

                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground text-center">
                      Global inventory
                    </p>
                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 text-[12px]">
                      <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                        <dt className="text-muted-foreground">In stock</dt>
                        <dd className="tabular-nums font-medium text-foreground">
                          {m?.global_in_stock ?? '—'}
                        </dd>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                        <dt className="text-muted-foreground">Sent</dt>
                        <dd className="tabular-nums font-medium text-foreground">
                          {m?.global_sent ?? '—'}
                        </dd>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                        <dt className="text-muted-foreground">Returns</dt>
                        <dd className="tabular-nums font-medium text-foreground">
                          {m?.global_returns ?? '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="pt-2 border-t border-border/40 space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground text-center">
                      Site inventory (aggregated)
                    </p>
                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 text-[12px]">
                      <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                        <dt className="text-muted-foreground">Received</dt>
                        <dd className="tabular-nums font-medium text-foreground">
                          {m?.site_shipments ?? '—'}
                        </dd>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                        <dt className="text-muted-foreground">Onsite</dt>
                        <dd className="tabular-nums font-medium text-foreground">
                          {m?.site_onsite ?? '—'}
                        </dd>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                        <dt className="text-muted-foreground">Available</dt>
                        <dd className="tabular-nums font-medium text-foreground">
                          {m?.site_available ?? '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Equipment name <span className="text-destructive">*</span>
                </Label>
                <Input className="text-[12px] h-9" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Category <span className="text-destructive">*</span>
                </Label>
                {pageCategoryFilterLocked && categoryFilter ? (
                  <div
                    className={cn(
                      'flex h-9 w-full items-center rounded-md border border-input bg-transparent px-2.5 py-2 text-[12px] shadow-xs',
                      'text-foreground'
                    )}
                    aria-readonly="true"
                  >
                    {IP_CATEGORY_LABELS[categoryFilter]}
                  </div>
                ) : (
                  <Select value={category} onValueChange={(v) => setCategory(v as IpCategory)}>
                    <SelectTrigger className="text-[12px] h-9">
                      <SelectValue
                        placeholder="Select category"
                        getDisplayLabel={(v) => (v ? (IP_CATEGORY_LABELS[v as IpCategory] ?? null) : null)}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(IP_CATEGORY_LABELS) as [IpCategory, string][]).map(([val, lab]) => (
                        <SelectItem key={val} value={val} className="text-[12px]">
                          {lab}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {pageCategoryFilterLocked && (
                  <p className="text-[11px] text-muted-foreground">
                    Category matches the filter on this page. Change the category control above the table to edit a
                    different catalog type.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input className="text-[12px] h-9" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Part / material number</Label>
                  <Input className="text-[12px] h-9" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min stock threshold</Label>
                  <Input
                    className="text-[12px] h-9"
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={minStockThreshold}
                    onChange={(e) => setMinStockThreshold(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Default contents per catalog unit (optional)</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {EDIT_INVENTORY_DEFAULT_CONTENTS_DESCRIPTION}
                </p>
                <Input
                  className="text-[12px] h-9 max-w-xs"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="e.g. 30"
                  value={defaultContentsPerCatalog}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      setDefaultContentsPerCatalog('');
                      return;
                    }
                    const n = parseInt(v, 10);
                    if (Number.isNaN(n)) return;
                    if (n < 1) return;
                    setDefaultContentsPerCatalog(String(n));
                  }}
                />
              </div>

              <p className="text-xs font-medium text-foreground pt-1">Supplier</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Supplier name</Label>
                  <Input className="text-[12px] h-9" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Address</Label>
                  <Input className="text-[12px] h-9" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input className="text-[12px] h-9" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">State / region</Label>
                  <Input className="text-[12px] h-9" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Postal code</Label>
                  <Input className="text-[12px] h-9" value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Country</Label>
                  <Input className="text-[12px] h-9" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
              </div>

              <p className="text-xs font-medium text-foreground pt-1">Supplier contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contact name</Label>
                  <Input className="text-[12px] h-9" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input className="text-[12px] h-9" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    className="text-[12px] h-9"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(555) 123-4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(formatPhoneFieldInput(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Calibration interval (days)</Label>
                <Input
                  className="text-[12px] h-9"
                  value={calibrationDays}
                  onChange={(e) => setCalibrationDays(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Packaging description</Label>
                <Textarea
                  className="text-[12px] min-h-[72px]"
                  value={packagingDescription}
                  onChange={(e) => setPackagingDescription(e.target.value)}
                />
              </div>

              <p className="text-xs font-medium text-foreground pt-1">Physical details (optional)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Weight</Label>
                  <Input className="text-[12px] h-9" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Weight unit</Label>
                  <Input className="text-[12px] h-9" value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Volume</Label>
                  <Input className="text-[12px] h-9" value={volume} onChange={(e) => setVolume(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Volume unit</Label>
                  <Input className="text-[12px] h-9" value={volumeUnit} onChange={(e) => setVolumeUnit(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Length</Label>
                  <Input className="text-[12px] h-9" value={dimLength} onChange={(e) => setDimLength(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Width</Label>
                  <Input className="text-[12px] h-9" value={dimWidth} onChange={(e) => setDimWidth(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height</Label>
                  <Input className="text-[12px] h-9" value={dimHeight} onChange={(e) => setDimHeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dimension unit</Label>
                  <Input
                    className="text-[12px] h-9"
                    value={dimensionUnit}
                    onChange={(e) => setDimensionUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1 pb-2">
                <Label className="text-xs">Item image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={() => fileInputRef.current?.click()}>
                    {imageFile ? 'Replace image' : 'Upload image'}
                  </Button>
                  {(storedImagePath || imageFile) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[12px] text-muted-foreground"
                      onClick={() => {
                        setImageFile(null);
                        setClearCatalogImage(true);
                        setImagePreviewUrl(null);
                      }}
                    >
                      Remove from catalog
                    </Button>
                  )}
                </div>
                {imagePreviewUrl && (
                  <img src={imagePreviewUrl} alt="" className="mt-2 max-h-40 rounded-md border object-contain" />
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t shrink-0">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !name.trim()}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
