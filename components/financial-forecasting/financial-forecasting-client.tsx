'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getBudgetLineItems,
  createBudgetLineItem,
  getSpendActuals,
  createSpendActual,
  getSpendForecasts,
  createSpendForecast,
  getVarianceReports,
  generateVarianceReport,
  getBudgetVsActualSummary,
  getProtocolsForSelect,
} from '@/lib/actions/financial-forecasting';
import type { BudgetLineItem, SpendActual, SpendForecast, VarianceReport } from '@/lib/types/financial-forecasting';
import { BUDGET_CATEGORY_LABELS } from '@/lib/types/financial-forecasting';

interface FinancialForecastingClientProps {
  companyId: string;
}

export function FinancialForecastingClient({ companyId }: FinancialForecastingClientProps) {
  const [activeTab, setActiveTab] = useState('budget');
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [actuals, setActuals] = useState<SpendActual[]>([]);
  const [forecasts, setForecasts] = useState<SpendForecast[]>([]);
  const [varianceReports, setVarianceReports] = useState<VarianceReport[]>([]);
  const [summary, setSummary] = useState<{
    total_budgeted: number;
    total_actual: number;
    total_remaining: number;
    variance_amount: number;
    variance_percentage: number | null;
  } | null>(null);
  const [protocols, setProtocols] = useState<{ id: string; protocol_number: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showActualDialog, setShowActualDialog] = useState(false);
  const [showForecastDialog, setShowForecastDialog] = useState(false);
  const [showVarianceDialog, setShowVarianceDialog] = useState(false);
  const { toast } = useToast();

  const [budgetProtocolId, setBudgetProtocolId] = useState('');
  const [budgetCategory, setBudgetCategory] = useState<'site_costs' | 'personnel' | 'travel' | 'vendor' | 'other'>('site_costs');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetDesc, setBudgetDesc] = useState('');
  const [budgetPeriodStart, setBudgetPeriodStart] = useState('');
  const [budgetPeriodEnd, setBudgetPeriodEnd] = useState('');

  const [actualProtocolId, setActualProtocolId] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [actualDate, setActualDate] = useState('');
  const [actualDesc, setActualDesc] = useState('');

  const [forecastProtocolId, setForecastProtocolId] = useState('');
  const [forecastName, setForecastName] = useState('');
  const [forecastDate, setForecastDate] = useState('');
  const [forecastPeriodStart, setForecastPeriodStart] = useState('');
  const [forecastPeriodEnd, setForecastPeriodEnd] = useState('');
  const [forecastTotal, setForecastTotal] = useState('');

  const [varianceProtocolId, setVarianceProtocolId] = useState('');
  const [varianceReportDate, setVarianceReportDate] = useState('');
  const [variancePeriodStart, setVariancePeriodStart] = useState('');
  const [variancePeriodEnd, setVariancePeriodEnd] = useState('');
  const [varianceNotes, setVarianceNotes] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    const [b, a, f, v, s, prot] = await Promise.all([
      getBudgetLineItems(companyId),
      getSpendActuals(companyId),
      getSpendForecasts(companyId),
      getVarianceReports(companyId),
      getBudgetVsActualSummary(companyId),
      getProtocolsForSelect(companyId),
    ]);
    if (b.success && b.data) setBudgetItems(b.data);
    if (a.success && a.data) setActuals(a.data);
    if (f.success && f.data) setForecasts(f.data);
    if (v.success && v.data) setVarianceReports(v.data);
    if (s.success && s.data) setSummary(s.data);
    if (prot.success && prot.data) setProtocols(prot.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <>
      {summary && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="text-xl font-semibold">{formatCurrency(summary.total_budgeted)}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-xl font-semibold text-orange-600">{formatCurrency(summary.total_actual)}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-xl font-semibold text-green-600">{formatCurrency(summary.total_remaining)}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Variance %</p>
            <p className={`text-xl font-semibold ${(summary.variance_percentage ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.variance_percentage != null ? `${summary.variance_percentage.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      )}

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <TabsList>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="actuals">Actuals</TabsTrigger>
              <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
              <TabsTrigger value="variance">Variance</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => {
              if (activeTab === 'budget') setShowBudgetDialog(true);
              else if (activeTab === 'actuals') setShowActualDialog(true);
              else if (activeTab === 'forecasts') setShowForecastDialog(true);
              else setShowVarianceDialog(true);
            }}>
              <Plus className="mr-1 h-4 w-4" /> {activeTab === 'variance' ? 'Generate' : 'Add'}
            </Button>
          </CardHeader>
          <CardContent>
            <TabsContent value="budget" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : budgetItems.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No budget items yet</TableCell></TableRow>
                    ) : budgetItems.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium text-sm">{b.clinical_protocols?.protocol_number || b.protocol_id}</TableCell>
                        <TableCell><Badge variant="secondary">{BUDGET_CATEGORY_LABELS[b.category]}</Badge></TableCell>
                        <TableCell className="text-sm">{b.description || '—'}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(b.budgeted_amount)}</TableCell>
                        <TableCell className="text-sm">{b.period_start || '—'} to {b.period_end || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="actuals" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actuals.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No spend actuals yet</TableCell></TableRow>
                    ) : actuals.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-sm">{a.clinical_protocols?.protocol_number || a.protocol_id}</TableCell>
                        <TableCell className="text-sm">{a.spend_date}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(a.amount)}</TableCell>
                        <TableCell className="text-sm">{a.description || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="forecasts" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Forecasted Spend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecasts.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No forecasts yet</TableCell></TableRow>
                    ) : forecasts.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium text-sm">{f.clinical_protocols?.protocol_number || f.protocol_id}</TableCell>
                        <TableCell className="text-sm">{f.forecast_name || '—'}</TableCell>
                        <TableCell className="text-sm">{f.forecast_period_start} to {f.forecast_period_end}</TableCell>
                        <TableCell className="text-sm">{f.total_forecasted_spend != null ? formatCurrency(f.total_forecasted_spend) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="variance" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Report Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Budgeted</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Variance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varianceReports.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No variance reports yet</TableCell></TableRow>
                    ) : varianceReports.map((vr) => (
                      <TableRow key={vr.id}>
                        <TableCell className="font-medium text-sm">{vr.clinical_protocols?.protocol_number || vr.protocol_id}</TableCell>
                        <TableCell className="text-sm">{vr.report_date}</TableCell>
                        <TableCell className="text-sm">{vr.period_start} to {vr.period_end}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(vr.total_budgeted)}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(vr.total_actual)}</TableCell>
                        <TableCell className="text-sm">{vr.variance_percentage != null ? `${vr.variance_percentage.toFixed(1)}%` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Budget Dialog */}
      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Budget Line Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={budgetProtocolId} onValueChange={setBudgetProtocolId}>
                <SelectTrigger><SelectValue placeholder="Select protocol..." /></SelectTrigger>
                <SelectContent>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.protocol_number} – {p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={budgetCategory} onValueChange={(v) => setBudgetCategory(v as typeof budgetCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BUDGET_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budgeted Amount</Label>
              <Input type="number" step="0.01" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={budgetDesc} onChange={(e) => setBudgetDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input type="date" value={budgetPeriodStart} onChange={(e) => setBudgetPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={budgetPeriodEnd} onChange={(e) => setBudgetPeriodEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBudgetDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await createBudgetLineItem({
                protocol_id: budgetProtocolId,
                category: budgetCategory,
                budgeted_amount: parseFloat(budgetAmount) || 0,
                description: budgetDesc || undefined,
                period_start: budgetPeriodStart || undefined,
                period_end: budgetPeriodEnd || undefined,
              });
              if (r.success) {
                setShowBudgetDialog(false);
                setBudgetProtocolId(''); setBudgetAmount(''); setBudgetDesc(''); setBudgetPeriodStart(''); setBudgetPeriodEnd('');
                load(); toast({ title: 'Budget item added' });
              } else toast({ title: 'Error', description: r.error, variant: 'destructive' });
            }} disabled={!budgetProtocolId || !budgetAmount}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actual Dialog */}
      <Dialog open={showActualDialog} onOpenChange={setShowActualDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Spend Actual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={actualProtocolId} onValueChange={setActualProtocolId}>
                <SelectTrigger><SelectValue placeholder="Select protocol..." /></SelectTrigger>
                <SelectContent>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.protocol_number} – {p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={actualAmount} onChange={(e) => setActualAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Spend Date</Label>
              <Input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={actualDesc} onChange={(e) => setActualDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActualDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await createSpendActual({
                protocol_id: actualProtocolId,
                amount: parseFloat(actualAmount) || 0,
                spend_date: actualDate,
                description: actualDesc || undefined,
              });
              if (r.success) {
                setShowActualDialog(false);
                setActualProtocolId(''); setActualAmount(''); setActualDate(''); setActualDesc('');
                load(); toast({ title: 'Spend actual added' });
              } else toast({ title: 'Error', description: r.error, variant: 'destructive' });
            }} disabled={!actualProtocolId || !actualAmount || !actualDate}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forecast Dialog */}
      <Dialog open={showForecastDialog} onOpenChange={setShowForecastDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Spend Forecast</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={forecastProtocolId} onValueChange={setForecastProtocolId}>
                <SelectTrigger><SelectValue placeholder="Select protocol..." /></SelectTrigger>
                <SelectContent>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.protocol_number} – {p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forecast Name (optional)</Label>
              <Input value={forecastName} onChange={(e) => setForecastName(e.target.value)} placeholder="e.g. Q2 2025" />
            </div>
            <div className="space-y-2">
              <Label>Forecast Date</Label>
              <Input type="date" value={forecastDate} onChange={(e) => setForecastDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input type="date" value={forecastPeriodStart} onChange={(e) => setForecastPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={forecastPeriodEnd} onChange={(e) => setForecastPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Forecasted Spend</Label>
              <Input type="number" step="0.01" value={forecastTotal} onChange={(e) => setForecastTotal(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForecastDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await createSpendForecast({
                protocol_id: forecastProtocolId,
                forecast_date: forecastDate,
                forecast_name: forecastName || undefined,
                forecast_period_start: forecastPeriodStart,
                forecast_period_end: forecastPeriodEnd,
                total_forecasted_spend: forecastTotal ? parseFloat(forecastTotal) : undefined,
              });
              if (r.success) {
                setShowForecastDialog(false);
                setForecastProtocolId(''); setForecastName(''); setForecastDate('');
                setForecastPeriodStart(''); setForecastPeriodEnd(''); setForecastTotal('');
                load(); toast({ title: 'Forecast added' });
              } else toast({ title: 'Error', description: r.error, variant: 'destructive' });
            }} disabled={!forecastProtocolId || !forecastDate || !forecastPeriodStart || !forecastPeriodEnd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variance Dialog */}
      <Dialog open={showVarianceDialog} onOpenChange={setShowVarianceDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Generate Variance Report</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={varianceProtocolId} onValueChange={setVarianceProtocolId}>
                <SelectTrigger><SelectValue placeholder="Select protocol..." /></SelectTrigger>
                <SelectContent>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.protocol_number} – {p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Report Date</Label>
              <Input type="date" value={varianceReportDate} onChange={(e) => setVarianceReportDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input type="date" value={variancePeriodStart} onChange={(e) => setVariancePeriodStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={variancePeriodEnd} onChange={(e) => setVariancePeriodEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={varianceNotes} onChange={(e) => setVarianceNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVarianceDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await generateVarianceReport({
                protocol_id: varianceProtocolId,
                report_date: varianceReportDate,
                period_start: variancePeriodStart,
                period_end: variancePeriodEnd,
                notes: varianceNotes || undefined,
              });
              if (r.success) {
                setShowVarianceDialog(false);
                setVarianceProtocolId(''); setVarianceReportDate('');
                setVariancePeriodStart(''); setVariancePeriodEnd(''); setVarianceNotes('');
                load(); toast({ title: 'Variance report generated' });
              } else toast({ title: 'Error', description: r.error, variant: 'destructive' });
            }} disabled={!varianceProtocolId || !varianceReportDate || !variancePeriodStart || !variancePeriodEnd}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
