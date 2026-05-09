'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPurchaseOrder } from '@/lib/actions/study-finance-module';
import type { FmBudgetCategory, FmContract, FmVendor } from '@/lib/finance-module/types';

interface PurchaseOrderCreateCardProps {
  studyId: string;
  vendors: FmVendor[];
  contracts: FmContract[];
  categories: FmBudgetCategory[];
  baseCurrency: string;
}

export function PurchaseOrderCreateCard({
  studyId,
  vendors,
  contracts,
  categories,
  baseCurrency,
}: PurchaseOrderCreateCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [vendorId, setVendorId] = useState('');
  const [contractId, setContractId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [description, setDescription] = useState('');
  const [poValue, setPoValue] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [poDate, setPoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expirationDate, setExpirationDate] = useState('');

  const vendorContracts = useMemo(
    () => contracts.filter((c) => c.vendor_id === vendorId && c.status !== 'archived'),
    [contracts, vendorId],
  );

  const activeVendors = useMemo(() => vendors.filter((v) => v.status !== 'archived'), [vendors]);
  const activeCats = useMemo(() => categories.filter((c) => !c.is_archived), [categories]);

  const submit = () => {
    if (!vendorId || !poNumber.trim()) {
      toast.error('Vendor and PO number are required.');
      return;
    }
    startTransition(async () => {
      const { error } = await createPurchaseOrder({
        studyId,
        vendorId,
        contractId: contractId && contractId !== '__none__' ? contractId : null,
        categoryId: categoryId && categoryId !== '__none__' ? categoryId : null,
        poNumber: poNumber.trim(),
        description: description.trim() || null,
        poValue: Number(poValue),
        currency: currency.trim().toUpperCase(),
        poDate,
        expirationDate: expirationDate.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Purchase order created.');
      setPoNumber('');
      setDescription('');
      setPoValue('');
      setContractId('');
      setCategoryId('');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Create purchase order</CardTitle>
        <CardDescription className="text-xs">
          Creates an open PO against a vendor. Close POs from the table when work is complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-[11px]">Vendor</Label>
          <Select value={vendorId || '__'} onValueChange={(v) => setVendorId(v === '__' ? '' : v)}>
            <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
              <SelectValue
                placeholder="Select vendor"
                getDisplayLabel={(val) => {
                  if (!val || val === '__') return null;
                  return activeVendors.find((v) => v.id === val)?.name ?? null;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__" className="text-xs">
                Select…
              </SelectItem>
              {activeVendors.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Contract (optional)</Label>
          <Select
            value={contractId || '__none__'}
            onValueChange={(v) => setContractId(v === '__none__' ? '' : v)}
            disabled={!vendorId}
          >
            <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
              <SelectValue
                placeholder="None"
                getDisplayLabel={(val) => {
                  if (!val || val === '__none__') return null;
                  return vendorContracts.find((c) => c.id === val)?.title ?? null;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">
                None
              </SelectItem>
              {vendorContracts.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Category (optional)</Label>
          <Select
            value={categoryId || '__none__'}
            onValueChange={(v) => setCategoryId(v === '__none__' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
              <SelectValue
                placeholder="None"
                getDisplayLabel={(val) => {
                  if (!val || val === '__none__') return null;
                  const c = activeCats.find((x) => x.id === val);
                  return c ? `${c.code} · ${c.name}` : null;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">
                None
              </SelectItem>
              {activeCats.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.code} · {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">PO number</Label>
          <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">PO date</Label>
          <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Expiration (optional)</Label>
          <Input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="text-xs h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Value</Label>
          <Input type="number" step="0.01" value={poValue} onChange={(e) => setPoValue(e.target.value)} className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Currency</Label>
          <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="text-xs h-9" />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Label className="text-[11px]">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="text-xs" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Button size="sm" disabled={pending} onClick={submit}>
            Create PO
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
