'use client';

import {
  Banknote,
  ClipboardList,
  FileText,
  LineChart,
  ReceiptText,
  ShoppingCart,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinanceReportLibraryCard } from '@/lib/actions/study-finance-module';

interface ReportsLibraryCardsProps {
  rows: FinanceReportLibraryCard[];
}

const CATEGORY_ICON: Record<string, typeof Banknote> = {
  'Budget & Spend': Banknote,
  'Site Payments': ClipboardList,
  'Vendor & Contract': FileText,
  Invoices: ReceiptText,
  'Purchase Orders': ShoppingCart,
  Forecasting: LineChart,
};

export function ReportsLibraryCards({ rows }: ReportsLibraryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => {
        const Icon = CATEGORY_ICON[row.category] ?? FileText;
        return (
          <Card key={row.category}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="size-4 text-primary" />
                  {row.label}
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">{row.reportCount} reports</span>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[11px] text-muted-foreground">
                {row.description}
              </CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
