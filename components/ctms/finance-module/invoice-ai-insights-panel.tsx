'use client';

import { Sparkles } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FmInvoice } from '@/lib/finance-module/types';

interface InvoiceAiInsightsPanelProps {
  invoices: FmInvoice[];
}

/** Rule-based duplicate / PO checks from invoice rows only (no LLM). */
export function InvoiceAiInsightsPanel({ invoices }: InvoiceAiInsightsPanelProps) {
  const insights: Array<{ id: string; label: string; detail: string }> = [];

  const seen = new Map<string, FmInvoice[]>();
  for (const inv of invoices) {
    const key = `${inv.vendor_id ?? 'no-vendor'}|${Number(inv.total_amount).toFixed(2)}|${inv.invoice_date}`;
    const list = seen.get(key) ?? [];
    list.push(inv);
    seen.set(key, list);
  }
  for (const list of seen.values()) {
    if (list.length > 1) {
      insights.push({
        id: `dup-${list[0].id}`,
        label: 'Potential Duplicate',
        detail: `Invoices ${list.map((i) => i.invoice_number).join(', ')} share vendor, amount, and date.`,
      });
    }
  }

  for (const inv of invoices) {
    if (inv.approval_status === 'approved' && !inv.purchase_order_id) {
      insights.push({
        id: `unmatched-${inv.id}`,
        label: 'Unmatched PO',
        detail: `Invoice ${inv.invoice_number} was approved without a linked purchase order.`,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Insights
        </CardTitle>
        <CardDescription className="text-xs">
          Advisory only—deterministic checks on this page&apos;s invoice list; they never modify records. Use the study
          AI Finance panels where enabled for generated narrative.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-xs text-muted-foreground">No insights surfaced for current invoices.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-xs">
            {insights.slice(0, 5).map((insight) => (
              <li key={insight.id}>
                <p className="font-medium text-foreground">{insight.label}</p>
                <p className="text-muted-foreground mt-0.5">{insight.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
