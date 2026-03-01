'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  getSiteBudgets,
  approveSiteBudget,
  updateSiteBudget,
  getSiteBudgetVsActual,
} from '@/lib/actions/site-budgets';
import type { SiteBudgetWithRelations, SiteBudgetStatus } from '@/lib/types/site-budgets';
import type { SiteBudgetVsActualSummary } from '@/lib/types/site-budgets';
import { SITE_BUDGET_STATUS_LABELS } from '@/lib/types/site-budgets';
import { BUDGET_CATEGORY_LABELS } from '@/lib/types/budget-templates';
import { useToast } from '@/hooks/use-toast';

interface SiteBudgetTabProps {
  siteId: string;
  companyId: string;
  profileId: string;
}

const statusVariant: Record<SiteBudgetStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  negotiating: 'outline',
  approved: 'default',
  active: 'default',
  closed: 'secondary',
};

const STATUS_TRANSITIONS: Record<SiteBudgetStatus, SiteBudgetStatus[]> = {
  draft: ['negotiating'],
  negotiating: ['draft'],
  approved: ['active'],
  active: ['closed'],
  closed: [],
};

const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const getCategoryLabel = (category: string) =>
  BUDGET_CATEGORY_LABELS[category as keyof typeof BUDGET_CATEGORY_LABELS] || category;

export default function SiteBudgetTab({ siteId, companyId, profileId }: SiteBudgetTabProps) {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<SiteBudgetWithRelations[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<SiteBudgetWithRelations | null>(null);
  const [vsActual, setVsActual] = useState<SiteBudgetVsActualSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    const result = await getSiteBudgets(companyId, { site_id: siteId });
    if (result.success && result.data) {
      setBudgets(result.data);
      if (result.data.length > 0) {
        const first = result.data[0];
        setSelectedBudget(first);
        const vsResult = await getSiteBudgetVsActual(first.id);
        if (vsResult.success && vsResult.data) {
          setVsActual(vsResult.data);
        }
      } else {
        setSelectedBudget(null);
        setVsActual(null);
      }
    }
    setLoading(false);
  }, [companyId, siteId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleSelectBudget = async (budget: SiteBudgetWithRelations) => {
    setSelectedBudget(budget);
    const vsResult = await getSiteBudgetVsActual(budget.id);
    if (vsResult.success && vsResult.data) {
      setVsActual(vsResult.data);
    }
  };

  const handleStatusChange = async (budgetId: string, newStatus: SiteBudgetStatus) => {
    setActionLoading(true);
    const result = await updateSiteBudget(budgetId, { status: newStatus });
    if (result.success) {
      toast({ title: 'Success', description: `Status updated to ${SITE_BUDGET_STATUS_LABELS[newStatus]}.` });
      fetchBudgets();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to update status.', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleApprove = async (budgetId: string) => {
    setActionLoading(true);
    const result = await approveSiteBudget(budgetId, profileId);
    if (result.success) {
      toast({ title: 'Success', description: 'Budget approved.' });
      fetchBudgets();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to approve.', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-xs text-muted-foreground">
            No site budgets yet. Create one by cloning a budget template from the Budget Templates page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {budgets.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {budgets.map((b) => {
            const protocol = Array.isArray(b.protocol) ? b.protocol[0] : b.protocol;
            return (
              <Button
                key={b.id}
                variant={selectedBudget?.id === b.id ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7"
                onClick={() => handleSelectBudget(b)}
              >
                {b.name || protocol?.protocol_number || 'Budget'}
              </Button>
            );
          })}
        </div>
      )}

      {selectedBudget && (
        <>
          <Card>
            <CardContent className="pt-4 pb-4 px-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{selectedBudget.name || 'Site Budget'}</h3>
                  {(() => {
                    const protocol = Array.isArray(selectedBudget.protocol) ? selectedBudget.protocol[0] : selectedBudget.protocol;
                    return protocol ? (
                      <p className="text-xs text-muted-foreground">
                        Protocol: {protocol.protocol_number} - {protocol.title}
                      </p>
                    ) : null;
                  })()}
                  {(() => {
                    const tmpl = selectedBudget.budget_template;
                    return tmpl && typeof tmpl === 'object' && 'name' in tmpl ? (
                      <p className="text-[10px] text-muted-foreground">
                        Based on template: {tmpl.name}
                      </p>
                    ) : null;
                  })()}
                </div>
                <Badge variant={statusVariant[selectedBudget.status]} className="text-[10px]">
                  {SITE_BUDGET_STATUS_LABELS[selectedBudget.status]}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground border-t pt-3">
                <span className="font-medium text-foreground">
                  Total Budgeted: {formatCurrency(Number(selectedBudget.total_budgeted), selectedBudget.currency_code)}
                </span>
                {selectedBudget.approved_at && (
                  <span>
                    Approved: {new Date(selectedBudget.approved_at).toLocaleDateString()}
                  </span>
                )}
                {selectedBudget.notes && (
                  <span className="truncate max-w-[200px]">Notes: {selectedBudget.notes}</span>
                )}

                <div className="ml-auto flex gap-2">
                  {selectedBudget.status === 'negotiating' && (
                    <Button
                      size="sm"
                      className="text-xs h-6"
                      disabled={actionLoading}
                      onClick={() => handleApprove(selectedBudget.id)}
                    >
                      Approve
                    </Button>
                  )}
                  {STATUS_TRANSITIONS[selectedBudget.status].map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(selectedBudget.id, nextStatus)}
                    >
                      {SITE_BUDGET_STATUS_LABELS[nextStatus]}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {vsActual && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-3 pb-2 px-4">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Budgeted</p>
                  <p className="text-sm font-semibold">{formatCurrency(vsActual.total_budgeted)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2 px-4">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Actual</p>
                  <p className="text-sm font-semibold">{formatCurrency(vsActual.total_actual)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2 px-4">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Remaining</p>
                  <p className="text-sm font-semibold">{formatCurrency(vsActual.total_remaining)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2 px-4">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Variance</p>
                  <p className={`text-sm font-semibold ${vsActual.variance_percentage && vsActual.variance_percentage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {vsActual.variance_percentage !== null ? `${vsActual.variance_percentage.toFixed(1)}%` : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {vsActual && vsActual.items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold">Budget vs Actual by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs text-right">Budgeted</TableHead>
                      <TableHead className="text-xs text-right">Actual</TableHead>
                      <TableHead className="text-xs text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vsActual.items.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {getCategoryLabel(row.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(row.budgeted)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(row.actual)}</TableCell>
                        <TableCell className={`text-xs text-right font-medium ${row.remaining < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(row.remaining)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {selectedBudget.items && selectedBudget.items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold">Budget Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Subcategory</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Budgeted</TableHead>
                      <TableHead className="text-xs text-right">Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBudget.items.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {getCategoryLabel(item.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{item.subcategory || '-'}</TableCell>
                        <TableCell className="text-xs max-w-[250px] truncate">{item.description || '-'}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(Number(item.budgeted_amount))}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(Number(item.actual_amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
