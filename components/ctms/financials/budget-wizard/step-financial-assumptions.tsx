'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { WizardFinancialAssumptions } from '@/lib/budget-template-generator';

interface StepFinancialAssumptionsProps {
  value: WizardFinancialAssumptions;
  onChange: (v: WizardFinancialAssumptions) => void;
}

export function StepFinancialAssumptions({ value, onChange }: StepFinancialAssumptionsProps) {
  const update = (patch: Partial<WizardFinancialAssumptions>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Indirect / overhead rate (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className="text-xs h-9"
            value={value.indirectRatePercent}
            onChange={(e) => update({ indirectRatePercent: parseFloat(e.target.value) || 0 })}
          />
          <p className="text-[10px] text-muted-foreground">
            Applied to direct costs in eligible sections (e.g. 26%).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Monitoring visits per year</Label>
          <Input
            type="number"
            min="0"
            max="52"
            className="text-xs h-9"
            value={value.monitoringVisitsPerYear}
            onChange={(e) => update({ monitoringVisitsPerYear: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Benchmark cost per patient{' '}
          <span className="text-muted-foreground">(optional — for comparison only)</span>
        </Label>
        <Input
          type="number"
          min="0"
          step="100"
          className="text-xs h-9"
          placeholder="e.g. 12000"
          value={value.benchmarkCostPerPatient ?? ''}
          onChange={(e) => {
            const v = e.target.value.trim();
            update({ benchmarkCostPerPatient: v === '' ? null : parseFloat(v) });
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="pass-through"
          checked={value.expectPassThroughCosts}
          onCheckedChange={(checked) => update({ expectPassThroughCosts: checked })}
        />
        <div>
          <Label htmlFor="pass-through" className="text-xs cursor-pointer">
            Include pass-through / startup costs
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Adds Section A: Invoiceable Items with standard startup line items.
          </p>
        </div>
      </div>
    </div>
  );
}
