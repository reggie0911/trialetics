'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WizardStudyInputs } from '@/lib/budget-template-generator';

interface StepStudyInputsProps {
  value: WizardStudyInputs;
  onChange: (v: WizardStudyInputs) => void;
  /** When true, enrollment label is scoped to this site ("Planned patients at this site"). */
  siteVariant?: boolean;
}

const PROCEDURE_INTENSITY_LABEL: Record<WizardStudyInputs['procedureIntensity'], string> = {
  low: 'Low — basic assessments, few labs',
  medium: 'Medium — standard CRO trial package',
  high: 'High — complex / oncology, extensive labs + AEs',
};

export function StepStudyInputs({ value, onChange, siteVariant = false }: StepStudyInputsProps) {
  const update = (patch: Partial<WizardStudyInputs>) => onChange({ ...value, ...patch });

  const addVisit = () => {
    onChange({
      ...value,
      visits: [...value.visits, { visitName: '', timepointDays: null }],
    });
  };

  const removeVisit = (i: number) => {
    onChange({ ...value, visits: value.visits.filter((_, idx) => idx !== i) });
  };

  const updateVisit = (i: number, patch: Partial<WizardStudyInputs['visits'][number]>) => {
    onChange({
      ...value,
      visits: value.visits.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    });
  };

  return (
    <div className="space-y-5">
      {/* Labels in row 1, inputs in row 2 so fields align when a label wraps to multiple lines */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Label className="text-xs min-w-0 leading-snug self-end">
          {siteVariant ? 'Planned patients at this site' : 'Planned enrollment (subjects)'}
        </Label>
        <Label className="text-xs min-w-0 leading-snug self-end">Study duration (months)</Label>
        <Input
          type="number"
          min="1"
          className="text-xs h-9 min-w-0"
          value={value.plannedEnrollment}
          onChange={(e) => update({ plannedEnrollment: parseInt(e.target.value) || 0 })}
        />
        <Input
          type="number"
          min="1"
          className="text-xs h-9 min-w-0"
          value={value.studyDurationMonths}
          onChange={(e) => update({ studyDurationMonths: parseInt(e.target.value) || 0 })}
        />
      </div>

      {siteVariant ? (
        <div className="space-y-1.5">
          <Label className="text-xs min-w-0 leading-snug">Planned budget (optional)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="text-xs h-9 min-w-0"
            placeholder="Target total for this budget"
            value={value.plannedBudgetAmount ?? ''}
            onChange={(e) => {
              const t = e.target.value.trim();
              if (t === '') {
                update({ plannedBudgetAmount: null });
                return;
              }
              const n = parseFloat(t);
              update({ plannedBudgetAmount: Number.isFinite(n) ? n : null });
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Label className="text-xs min-w-0 leading-snug self-end">Planned budget (optional)</Label>
          <Label className="text-xs min-w-0 leading-snug self-end">Planned sites (optional)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="text-xs h-9 min-w-0"
            placeholder="Study-level target total"
            value={value.plannedBudgetAmount ?? ''}
            onChange={(e) => {
              const t = e.target.value.trim();
              if (t === '') {
                update({ plannedBudgetAmount: null });
                return;
              }
              const n = parseFloat(t);
              update({ plannedBudgetAmount: Number.isFinite(n) ? n : null });
            }}
          />
          <Input
            type="number"
            min="1"
            className="text-xs h-9 min-w-0"
            placeholder="Anticipated site count"
            value={value.plannedSitesCount ?? ''}
            onChange={(e) => {
              const t = e.target.value.trim();
              if (t === '') {
                update({ plannedSitesCount: null });
                return;
              }
              const n = parseInt(t, 10);
              update({
                plannedSitesCount: Number.isFinite(n) && n >= 1 ? n : null,
              });
            }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Procedure intensity</Label>
        <Select
          value={value.procedureIntensity}
          onValueChange={(v) => update({ procedureIntensity: v as 'low' | 'medium' | 'high' })}
        >
          <SelectTrigger className="text-xs h-9 capitalize">
            <SelectValue
              getDisplayLabel={(v) =>
                v && v in PROCEDURE_INTENSITY_LABEL
                  ? PROCEDURE_INTENSITY_LABEL[v as WizardStudyInputs['procedureIntensity']]
                  : null
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low" className="text-xs capitalize">
              {PROCEDURE_INTENSITY_LABEL.low}
            </SelectItem>
            <SelectItem value="medium" className="text-xs capitalize">
              {PROCEDURE_INTENSITY_LABEL.medium}
            </SelectItem>
            <SelectItem value="high" className="text-xs capitalize">
              {PROCEDURE_INTENSITY_LABEL.high}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Visit schedule</Label>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addVisit}>
            <Plus className="h-3 w-3 mr-1" />
            Add visit
          </Button>
        </div>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {value.visits.map((visit, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                className="text-xs h-8 flex-1"
                placeholder="Visit name (e.g. Baseline)"
                value={visit.visitName}
                onChange={(e) => updateVisit(i, { visitName: e.target.value })}
              />
              <Input
                className="text-xs h-8 w-28"
                type="number"
                min="0"
                placeholder="Day (opt.)"
                value={visit.timepointDays ?? ''}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  updateVisit(i, { timepointDays: v === '' ? null : parseInt(v) });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => removeVisit(i)}
              >
                <X className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
