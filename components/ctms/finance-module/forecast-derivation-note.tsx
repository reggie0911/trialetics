import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ForecastDerivationNote() {
  return (
    <Card className="border-dashed">
      <CardHeader className="py-3">
        <CardTitle className="text-xs font-medium">How this forecast is built</CardTitle>
        <CardDescription className="text-[11px] leading-relaxed">
          Figures refresh whenever you open this page: assumptions come from workspace settings, totals from the budget
          tracker and approved-category logic, and curves from invoice dates. Scenario bands (optimistic / pessimistic /
          etc.) are illustrative multiples—not stored scenarios and not a separate “recompute” job. Adjust assumptions in
          Settings to change the baseline.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
