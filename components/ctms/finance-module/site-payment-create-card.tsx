'use client';

import { useState, useTransition } from 'react';
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
import { createSitePaymentSchedule } from '@/lib/actions/study-finance-module';
import {
  FM_SITE_PAYMENT_MILESTONE_LABELS,
  type FmSitePaymentMilestoneType,
} from '@/lib/finance-module/types';
import type { StudySite } from '@/lib/types/ctms';

const MILESTONE_KEYS = Object.keys(FM_SITE_PAYMENT_MILESTONE_LABELS) as FmSitePaymentMilestoneType[];

interface SitePaymentCreateCardProps {
  studyId: string;
  sites: StudySite[];
  baseCurrency: string;
}

export function SitePaymentCreateCard({ studyId, sites, baseCurrency }: SitePaymentCreateCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [siteId, setSiteId] = useState('');
  const [milestoneType, setMilestoneType] = useState<FmSitePaymentMilestoneType>('startup');
  const [milestoneLabel, setMilestoneLabel] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [holdbackPct, setHoldbackPct] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [perSubjectAmount, setPerSubjectAmount] = useState('');
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (!siteId) {
      toast.error('Select a site.');
      return;
    }
    if (!milestoneLabel.trim()) {
      toast.error('Milestone label is required.');
      return;
    }
    startTransition(async () => {
      const { error } = await createSitePaymentSchedule({
        studyId,
        siteId,
        milestoneType,
        milestoneLabel: milestoneLabel.trim(),
        triggerEvent: triggerEvent.trim() || null,
        amount: Number(amount),
        currency: currency.trim().toUpperCase(),
        holdbackPct: Number(holdbackPct) || 0,
        dueDate: dueDate.trim() || null,
        perSubjectAmount: perSubjectAmount.trim() ? Number(perSubjectAmount) : null,
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Site payment milestone added.');
      setMilestoneLabel('');
      setTriggerEvent('');
      setAmount('');
      setDueDate('');
      setPerSubjectAmount('');
      setNotes('');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Add site payment milestone</CardTitle>
        <CardDescription className="text-xs">
          Schedule startup, visit, enrollment, holdback, or closeout payments per site.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-[11px]">Site</Label>
          <Select value={siteId || '__'} onValueChange={(v) => setSiteId(v === '__' ? '' : v)}>
            <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
              <SelectValue
                placeholder="Select site"
                getDisplayLabel={(val) => {
                  if (!val || val === '__') return null;
                  const s = sites.find((x) => x.id === val);
                  return s ? `${s.site_number} · ${s.name}` : null;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__" className="text-xs">
                Select…
              </SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.site_number} · {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Milestone type</Label>
          <Select value={milestoneType} onValueChange={(v) => setMilestoneType(v as FmSitePaymentMilestoneType)}>
            <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
              <SelectValue
                placeholder="Milestone type"
                getDisplayLabel={(val) =>
                  val && FM_SITE_PAYMENT_MILESTONE_LABELS[val as FmSitePaymentMilestoneType]
                    ? FM_SITE_PAYMENT_MILESTONE_LABELS[val as FmSitePaymentMilestoneType]
                    : null
                }
              />
            </SelectTrigger>
            <SelectContent>
              {MILESTONE_KEYS.map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {FM_SITE_PAYMENT_MILESTONE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Milestone label</Label>
          <Input value={milestoneLabel} onChange={(e) => setMilestoneLabel(e.target.value)} className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Trigger (optional)</Label>
          <Input value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Amount</Label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Currency</Label>
          <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Holdback %</Label>
          <Input type="number" min={0} max={100} value={holdbackPct} onChange={(e) => setHoldbackPct(e.target.value)} className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Due date (optional)</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Per-subject amount (optional)</Label>
          <Input type="number" step="0.01" value={perSubjectAmount} onChange={(e) => setPerSubjectAmount(e.target.value)} className="text-xs h-9" />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Label className="text-[11px]">Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Button size="sm" disabled={pending || sites.length === 0} onClick={submit}>
            Add milestone
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
