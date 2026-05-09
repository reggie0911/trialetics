'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';
import {
  FM_VENDOR_SERVICE_CATEGORY_LABELS,
  type FmContract,
  type FmVendor,
  type FmVendorServiceCategory,
} from '@/lib/finance-module/types';

interface ContractSummaryCardProps {
  contracts: FmContract[];
  vendors: FmVendor[];
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  draft: 'secondary',
  pending_signature: 'warning',
  active: 'success',
  amended: 'info',
  expired: 'destructive',
  terminated: 'destructive',
  archived: 'secondary',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_signature: 'Pending Signature',
  active: 'Active',
  amended: 'Amended',
  expired: 'Expired',
  terminated: 'Terminated',
  archived: 'Archived',
};

export function ContractSummaryCard({ contracts, vendors }: ContractSummaryCardProps) {
  const vendorMap = new Map(vendors.map((v) => [v.id, v] as const));
  const total = contracts.reduce((sum, c) => sum + Number(c.total_value), 0);
  const baseCurrency = contracts[0]?.currency ?? 'USD';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Contracts</CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No contracts on file yet. Add contracts to begin tracking obligations and amendments.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatCompactCurrency(total, baseCurrency)}
              </span>{' '}
              committed across {contracts.length} contract{contracts.length === 1 ? '' : 's'}.
            </div>
            <ul className="divide-y divide-border">
              {contracts.slice(0, 8).map((contract) => {
                const vendor = vendorMap.get(contract.vendor_id);
                return (
                  <li key={contract.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{contract.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {vendor?.name ?? 'Unknown vendor'}
                        {vendor?.service_category
                          ? ` · ${
                              FM_VENDOR_SERVICE_CATEGORY_LABELS[
                                vendor.service_category as FmVendorServiceCategory
                              ] ?? vendor.service_category
                            }`
                          : ''}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium">
                        {formatCompactCurrency(Number(contract.total_value), contract.currency)}
                      </span>
                      <Badge variant={STATUS_VARIANT[contract.status] ?? 'secondary'}>
                        {STATUS_LABEL[contract.status] ?? contract.status}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
