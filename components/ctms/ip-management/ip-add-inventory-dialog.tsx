'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { IpCategory } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS } from '@/lib/types/ip-management';
import { submitAddInventory, uploadIpReceiptImage } from '@/lib/actions/ip-management';
import { cn } from '@/lib/utils';
import { formatNanpPhoneInput } from '@/lib/utils/phone-input';
import {
  ADD_INVENTORY_UNIT_TOOLTIP_NEUTRAL,
  getAddInventoryContentsPerUnitTooltip,
  getAddOrderDrugCopy,
} from '@/lib/utils/ip-inventory-ui-copy';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface IpAddInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  studyLabel: string;
  pageCategoryFilterLocked: boolean;
  categoryFilter: IpCategory | null;
  onSuccess: () => void | Promise<void>;
}

export function IpAddInventoryDialog({
  open,
  onOpenChange,
  studyId,
  studyLabel,
  pageCategoryFilterLocked,
  categoryFilter,
  onSuccess,
}: IpAddInventoryDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState<IpCategory>('study_supplies');
  const [equipmentName, setEquipmentName] = useState('');
  const [unit, setUnit] = useState('Each');
  const [partNumber, setPartNumber] = useState('');
  const [qty, setQty] = useState('1');

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
  const [defaultContentsPerCatalog, setDefaultContentsPerCatalog] = useState('');

  const drugCopy = useMemo(() => getAddOrderDrugCopy(), []);

  const effectiveCategory = pageCategoryFilterLocked && categoryFilter ? categoryFilter : category;

  const resetForm = useCallback(() => {
    const nextCat: IpCategory =
      pageCategoryFilterLocked && categoryFilter ? categoryFilter : categoryFilter ?? 'study_supplies';
    setCategory(categoryFilter ?? 'study_supplies');
    setEquipmentName('');
    setUnit(nextCat === 'investigational_drug' ? 'Bottle' : 'Each');
    setPartNumber('');
    setQty('1');
    setSupplierName('');
    setAddress('');
    setCity('');
    setState('');
    setZip('');
    setCountry('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setCalibrationDays('');
    setPackagingDescription('');
    setWeight('');
    setWeightUnit('');
    setVolume('');
    setVolumeUnit('');
    setDimLength('');
    setDimWidth('');
    setDimHeight('');
    setDimensionUnit('');
    setImageFile(null);
    setImagePreviewUrl(null);
    setDefaultContentsPerCatalog('');
  }, [categoryFilter, pageCategoryFilterLocked]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const categoryField = (
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
        <Select value={category} onValueChange={(v) => setCategory(v as IpCategory)} disabled={pageCategoryFilterLocked}>
          <SelectTrigger className="text-[12px] h-9 w-full min-w-0 max-w-full">
            <SelectValue
              placeholder="Choose an option"
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
    </div>
  );

  const handleSubmit = async () => {
    if (!studyId) return;
    const q = Math.max(1, parseInt(qty, 10) || 1);

    if (!equipmentName.trim()) {
      toast({
        title: effectiveCategory === 'investigational_drug' ? 'Product name required' : 'Equipment name required',
        variant: 'destructive',
      });
      return;
    }

    let defaultContentsPerCatalogUnit: number | undefined;
    if (defaultContentsPerCatalog.trim() !== '') {
      const n = parseInt(defaultContentsPerCatalog.trim(), 10);
      if (!Number.isFinite(n) || n < 1) {
        toast({
          title: 'Invalid contents per catalog unit',
          description: 'Enter a whole number of at least 1, or leave the field blank.',
          variant: 'destructive',
        });
        return;
      }
      defaultContentsPerCatalogUnit = n;
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
    }

    const receiptMetadata = {
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
      ...(imagePath ? { imageStoragePath: imagePath } : {}),
    };

    setSubmitting(true);
    try {
      await submitAddInventory({
        studyId,
        mode: 'new',
        newItemName: equipmentName.trim(),
        category: effectiveCategory,
        unit: unit.trim() || 'Each',
        partOrMaterialNumber: partNumber.trim() || null,
        quantity: q,
        lotNumber: null,
        batchNumber: null,
        expiryDate: null,
        receiptMetadata,
        ...(defaultContentsPerCatalogUnit !== undefined ? { defaultContentsPerCatalogUnit } : {}),
      });
      toast({ title: 'Inventory added' });
      onOpenChange(false);
      await onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      const partial = msg.includes('catalog item was saved');
      if (partial) await onSuccess();
      toast({
        title: partial ? 'Item saved — stock receipt failed' : 'Add inventory failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[90vh] max-w-6xl flex-col gap-4 overflow-hidden lg:max-w-7xl"
      >
        <DialogHeader className="shrink-0 space-y-1.5 pr-8 text-left">
          <DialogTitle>Add inventory</DialogTitle>
          <DialogDescription>
            {effectiveCategory === 'investigational_drug' ? (
              <>
                Receive investigational product into the central (global) pool for this study. Record supplier and
                packaging details and physical attributes that support storage and handling; quantity drives inventory
                and the audit ledger.
              </>
            ) : (
              <>
                Receive stock into the central (global) pool for this study. Use the form to record supplier details and
                equipment specifications; quantity drives inventory and the audit ledger.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="grid gap-6 pb-2 lg:grid-cols-3">
            {/* Column 1 */}
            <div className="space-y-3">
              {categoryField}
              <div className="space-y-1">
                <Label className="text-xs">Supplier name</Label>
                <Input className="text-[12px] h-9" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Address</Label>
                <Input className="text-[12px] h-9" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input className="text-[12px] h-9" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">State</Label>
                  <Input className="text-[12px] h-9" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Zip code</Label>
                  <Input className="text-[12px] h-9 w-full min-w-0" value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Country</Label>
                  <Input className="text-[12px] h-9 w-full min-w-0" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact name</Label>
                <Input className="text-[12px] h-9" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input className="text-[12px] h-9" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
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
                  onChange={(e) => setContactPhone(formatNanpPhoneInput(e.target.value))}
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Protocol</Label>
                <div
                  className={cn(
                    'flex min-h-9 w-full items-center rounded-md border border-input bg-muted/30 px-2.5 py-2 text-[12px]',
                    'text-foreground'
                  )}
                >
                  {studyLabel}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  {effectiveCategory === 'investigational_drug' ? 'Product name' : 'Equipment name'}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="text-[12px] h-9 w-full min-w-0"
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  placeholder="Name for the new catalog item"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Item quantity <span className="text-destructive">*</span></Label>
                  <Input className="text-[12px] h-9" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Unit</Label>
                    <TooltipProvider delay={200}>
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="How the catalog unit is used for quantities"
                        >
                          <Info className="size-3.5" strokeWidth={2} />
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-sm text-left leading-snug">
                          {effectiveCategory === 'investigational_drug' ? (
                            <>
                              Receiving, shipping, and site counts use this unit (for example Bottle or Pack). Use a dose
                              unit such as Tablet only if you intentionally track by tablet.
                            </>
                          ) : (
                            ADD_INVENTORY_UNIT_TOOLTIP_NEUTRAL
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input className="text-[12px] h-9" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">{drugCopy.contentsPerUnitLabel}</Label>
                  <TooltipProvider delay={200}>
                    <Tooltip>
                      <TooltipTrigger
                        type="button"
                        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="What counts as contents per catalog unit"
                      >
                        <Info className="size-3.5" strokeWidth={2} />
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-sm text-left leading-snug">
                        {getAddInventoryContentsPerUnitTooltip(effectiveCategory, drugCopy, unit.trim() || 'catalog unit')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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

              <div
                className={cn(
                  'grid gap-2',
                  effectiveCategory === 'investigational_drug' ? 'grid-cols-1' : 'grid-cols-2'
                )}
              >
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs">Part / material number</Label>
                  <Input
                    className="text-[12px] h-9 w-full min-w-0"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                  />
                </div>
                {effectiveCategory !== 'investigational_drug' ? (
                  <div className="min-w-0 space-y-1">
                    <Label className="text-xs">Calibration interval (calendar days)</Label>
                    <Input
                      className="text-[12px] h-9 w-full min-w-0"
                      value={calibrationDays}
                      onChange={(e) => setCalibrationDays(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Packaging description</Label>
                <Textarea
                  className="text-[12px] min-h-[100px] resize-y"
                  placeholder="Type here..."
                  value={packagingDescription}
                  onChange={(e) => setPackagingDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-3 border-border lg:border-l lg:pl-6">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Weight</Label>
                  <Input className="text-[12px] h-9" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Weight unit</Label>
                  <Input className="text-[12px] h-9" placeholder="e.g. kg" value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Volume</Label>
                  <Input className="text-[12px] h-9" value={volume} onChange={(e) => setVolume(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Volume unit</Label>
                  <Input className="text-[12px] h-9" placeholder="e.g. mL" value={volumeUnit} onChange={(e) => setVolumeUnit(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs">Length</Label>
                  <Input className="text-[12px] h-9 w-full min-w-0" value={dimLength} onChange={(e) => setDimLength(e.target.value)} />
                </div>
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs">Width</Label>
                  <Input className="text-[12px] h-9 w-full min-w-0" value={dimWidth} onChange={(e) => setDimWidth(e.target.value)} />
                </div>
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs">Height</Label>
                  <Input className="text-[12px] h-9 w-full min-w-0" value={dimHeight} onChange={(e) => setDimHeight(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dimension unit</Label>
                <Input className="text-[12px] h-9" placeholder="e.g. cm" value={dimensionUnit} onChange={(e) => setDimensionUnit(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Inventory item image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setImageFile(f ?? null);
                  }}
                />
                <button
                  type="button"
                  className={cn(
                    'flex min-h-[120px] w-full flex-col items-center justify-center rounded-md border border-dashed border-input',
                    'bg-muted/20 px-3 py-4 text-[12px] text-muted-foreground transition-colors hover:bg-muted/30'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreviewUrl} alt="" className="max-h-24 max-w-full object-contain" />
                  ) : (
                    <span>Click to upload an image</span>
                  )}
                </button>
                {imageFile ? (
                  <Button type="button" variant="ghost" size="sm" className="text-[12px] h-8" onClick={() => setImageFile(null)}>
                    Remove image
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button
                  type="button"
                  className="w-full"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={submitting}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
