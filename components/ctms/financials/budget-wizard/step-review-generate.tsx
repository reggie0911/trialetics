'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { GeneratedBudget } from '@/lib/budget-template-generator';
import { BUDGET_SECTION_TYPE_LABEL } from '@/lib/types/ctms';

interface StepReviewGenerateProps {
  generated: GeneratedBudget;
  currency: string;
  budgetName: string;
  onBudgetNameChange: (v: string) => void;
  saveAsTemplate: boolean;
  onSaveAsTemplateChange: (v: boolean) => void;
  templateName: string;
  onTemplateNameChange: (v: string) => void;
  plannedBudgetAmount: number | null;
  plannedSitesCount: number | null;
  /** When true, planned site count is hidden (single-site wizard). */
  siteVariant?: boolean;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function StepReviewGenerate({
  generated,
  currency,
  budgetName,
  onBudgetNameChange,
  saveAsTemplate,
  onSaveAsTemplateChange,
  templateName,
  onTemplateNameChange,
  plannedBudgetAmount,
  plannedSitesCount,
  siteVariant = false,
}: StepReviewGenerateProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs">Budget name <span className="text-destructive">*</span></Label>
        <Input
          className="text-xs h-9"
          value={budgetName}
          onChange={(e) => onBudgetNameChange(e.target.value)}
          placeholder="e.g. Phase III Study Budget v1"
          autoFocus
        />
      </div>

      {/* Preview */}
      <div className="rounded-md border divide-y">
        <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
          <span className="text-xs font-semibold">Generated Budget Preview</span>
          <span className="text-xs font-semibold text-primary">
            {formatCurrency(generated.estimatedTotal, currency)}
          </span>
        </div>

        {generated.sections.map((section, i) => {
          const sectionDirect = section.default_lines.reduce(
            (s, l) => s + l.unit_cost * l.quantity,
            0
          );
          const sectionIndirect = section.indirect_rate != null ? sectionDirect * section.indirect_rate : 0;
          const sectionTotal = sectionDirect + sectionIndirect;

          return (
            <div key={i} className="px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">
                    {BUDGET_SECTION_TYPE_LABEL[section.section_type]}
                  </Badge>
                  <span className="text-xs font-medium">{section.name}</span>
                </div>
                <span className="text-xs font-semibold tabular-nums">
                  {formatCurrency(sectionTotal, currency)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {section.default_lines.length} line item(s)
                {section.indirect_rate != null && ` · ${(section.indirect_rate * 100).toFixed(0)}% indirect`}
              </p>
            </div>
          );
        })}

        <div className="px-3 py-2 bg-muted/20 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {generated.plannedEnrollment} subjects · {generated.visitSchedule.length} visits · {generated.studyDurationMonths} months
              {!siteVariant && plannedSitesCount != null && ` · ${plannedSitesCount} planned site${plannedSitesCount === 1 ? '' : 's'}`}
            </span>
            <span className="text-xs text-muted-foreground">
              Est. {formatCurrency(generated.estimatedTotal / Math.max(1, generated.plannedEnrollment), currency)}/patient
            </span>
          </div>
          {plannedBudgetAmount != null && (
            <p className="text-[10px] text-muted-foreground leading-snug">
              Planned budget {formatCurrency(plannedBudgetAmount, currency)} · Estimated total{' '}
              {formatCurrency(generated.estimatedTotal, currency)}
              {plannedBudgetAmount >= generated.estimatedTotal ? (
                <span className="text-foreground/80"> · At or above estimated total.</span>
              ) : (
                <span className="text-foreground/80">
                  {' '}
                  · Below estimated by {formatCurrency(generated.estimatedTotal - plannedBudgetAmount, currency)}.
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch
            id="save-template"
            checked={saveAsTemplate}
            onCheckedChange={onSaveAsTemplateChange}
          />
          <div>
            <Label htmlFor="save-template" className="text-xs cursor-pointer">Save as reusable template</Label>
            <p className="text-[10px] text-muted-foreground">
              Saves this budget structure to the company template library for future studies.
            </p>
          </div>
        </div>

        {saveAsTemplate && (
          <div className="space-y-1.5 pl-7">
            <Label className="text-xs">Template name</Label>
            <Input
              className="text-xs h-9"
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              placeholder={budgetName || 'My Budget Template'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
