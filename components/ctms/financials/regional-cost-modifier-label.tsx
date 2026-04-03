'use client';

import { CircleHelp } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const REGIONAL_MODIFIER_HINT =
  'Multiplies every unit cost copied from the study budget. For example, 1.1 is about 10% higher rates and 0.9 is about 10% lower. Enrollment still sets how many patients apply to per-patient lines. Use 1 when you do not need a regional adjustment.';

interface RegionalCostModifierLabelProps {
  htmlFor: string;
  /** Shown beside the help icon; keep human-readable (no database field names). */
  labelText?: string;
}

export function RegionalCostModifierLabel({
  htmlFor,
  labelText = 'Regional cost modifier (1 = none)',
}: RegionalCostModifierLabelProps) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor} className="text-xs">
        {labelText}
      </Label>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="inline-flex shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="About regional cost modifier"
            />
          }
        >
          <CircleHelp className="h-3.5 w-3.5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-[11px] leading-snug">
          {REGIONAL_MODIFIER_HINT}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
