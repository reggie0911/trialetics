'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { VendorSpendRow } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';
import {
  FM_VENDOR_HEALTH_LABELS,
  FM_VENDOR_RISK_LABELS,
  FM_VENDOR_SERVICE_CATEGORY_LABELS,
  type FmVendorHealthStatus,
  type FmVendorRiskLevel,
  type FmVendorServiceCategory,
} from '@/lib/finance-module/types';

interface VendorSpendTableProps {
  rows: VendorSpendRow[];
  baseCurrency: string;
}

const HEALTH_VARIANT: Record<FmVendorHealthStatus, 'success' | 'warning' | 'destructive'> = {
  healthy: 'success',
  at_risk: 'warning',
  critical: 'destructive',
};

const RISK_VARIANT: Record<FmVendorRiskLevel, 'success' | 'warning' | 'destructive'> = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
};

export function VendorSpendTable({ rows, baseCurrency }: VendorSpendTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Vendors</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No vendors yet. Add vendors to start tracking contracts and spend.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Contract</TableHead>
                <TableHead className="text-xs text-right">Invoiced</TableHead>
                <TableHead className="text-xs text-right">Paid</TableHead>
                <TableHead className="text-xs text-right">Remaining</TableHead>
                <TableHead className="text-xs">Health</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.vendorId}>
                  <TableCell className="text-xs font-medium">{row.name}</TableCell>
                  <TableCell className="text-xs">
                    {FM_VENDOR_SERVICE_CATEGORY_LABELS[row.serviceCategory as FmVendorServiceCategory] ??
                      row.serviceCategory}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCompactCurrency(row.contractValue, baseCurrency)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCompactCurrency(row.invoiced, baseCurrency)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCompactCurrency(row.paid, baseCurrency)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCompactCurrency(row.remaining, baseCurrency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={HEALTH_VARIANT[row.healthStatus as FmVendorHealthStatus] ?? 'secondary'}>
                      {FM_VENDOR_HEALTH_LABELS[row.healthStatus as FmVendorHealthStatus] ?? row.healthStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={RISK_VARIANT[row.riskLevel as FmVendorRiskLevel] ?? 'secondary'}>
                      {FM_VENDOR_RISK_LABELS[row.riskLevel as FmVendorRiskLevel] ?? row.riskLevel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
