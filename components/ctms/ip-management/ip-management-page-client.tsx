'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileDown, Printer, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Study } from '@/lib/types/ctms';
import type { IpCategory, IpInTransitLineRow, IpLogRow, IpStudyMetricRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, IP_DISPOSITION_LABELS, type IpDisposition } from '@/lib/types/ip-management';
import {
  createIpItem,
  getIpDispositionTotals,
  getIpLedgerRoster,
  getIpLogRows,
  getIpLotBreakdown,
  getIpInTransitLines,
  getIpReconciliationFlags,
  getIpStudyMetrics,
  ipDestroyAtSite,
  ipDispense,
  ipInitialGlobalReceipt,
  ipReceiveAtSite,
  ipReturnToGlobal,
  ipShipToSite,
  ipTransferSite,
  ipVerifyLot,
} from '@/lib/actions/ip-management';
import { getStudySites } from '@/lib/actions/sites';
import { getStudySubjects } from '@/lib/actions/subjects';
import { IpSummaryTable } from '@/components/ctms/ip-management/ip-summary-table';
import { IpSummaryCharts } from '@/components/ctms/ip-management/ip-summary-charts';
import { IpLogsTable } from '@/components/ctms/ip-management/ip-logs-table';
import { IpLogsCharts } from '@/components/ctms/ip-management/ip-logs-charts';
import { useToast } from '@/hooks/use-toast';
import { downloadIpInventoryLogPdf } from '@/lib/utils/ip-inventory-pdf';
import { cn } from '@/lib/utils';

const CATEGORY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '__all__', label: 'All categories' },
  ...(
    Object.entries(IP_CATEGORY_LABELS) as [IpCategory, string][]
  ).map(([value, label]) => ({ value, label })),
];

interface IpManagementPageClientProps {
  studies: Study[];
}

export function IpManagementPageClient({ studies }: IpManagementPageClientProps) {
  const { toast } = useToast();
  const [studyId, setStudyId] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('__all_sites__');
  const [category, setCategory] = useState<string>('__all__');
  const [tab, setTab] = useState<'summary' | 'logs'>('summary');
  const [metrics, setMetrics] = useState<IpStudyMetricRow[]>([]);
  const [breakdown, setBreakdown] = useState<Awaited<ReturnType<typeof getIpLotBreakdown>>>([]);
  const [logRows, setLogRows] = useState<IpLogRow[]>([]);
  const [dispTotals, setDispTotals] = useState<Awaited<ReturnType<typeof getIpDispositionTotals>>>([]);
  const [roster, setRoster] = useState<Awaited<ReturnType<typeof getIpLedgerRoster>>>([]);
  const [flags, setFlags] = useState<Awaited<ReturnType<typeof getIpReconciliationFlags>>>([]);
  const [sites, setSites] = useState<Awaited<ReturnType<typeof getStudySites>>>([]);
  const [loading, setLoading] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(true);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [destroyOpen, setDestroyOpen] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<IpCategory>('study_supplies');
  const [newItemUnit, setNewItemUnit] = useState('Each');

  const [receiptItemId, setReceiptItemId] = useState('');
  const [receiptQty, setReceiptQty] = useState('1');
  const [receiptLot, setReceiptLot] = useState('');
  const [receiptSerial, setReceiptSerial] = useState('');

  const [shipLotId, setShipLotId] = useState('');
  const [shipSiteId, setShipSiteId] = useState('');
  const [shipQty, setShipQty] = useState('1');

  const [inTransitLines, setInTransitLines] = useState<IpInTransitLineRow[]>([]);
  const [receiveLineKey, setReceiveLineKey] = useState('');
  const [receiveQty, setReceiveQty] = useState('1');

  const [activeLogRow, setActiveLogRow] = useState<IpLogRow | null>(null);
  const [dispenseQty, setDispenseQty] = useState('1');
  const [dispenseSubjectId, setDispenseSubjectId] = useState('');
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof getStudySubjects>>>([]);

  const [moveQty, setMoveQty] = useState('1');
  const [transferToSiteId, setTransferToSiteId] = useState('');

  const categoryFilter = category === '__all__' ? null : (category as IpCategory);
  const siteFilter = siteId === '__all_sites__' ? null : siteId;

  const refresh = useCallback(async () => {
    if (!studyId) {
      setMetrics([]);
      setBreakdown([]);
      setLogRows([]);
      setDispTotals([]);
      setRoster([]);
      setFlags([]);
      setInTransitLines([]);
      return;
    }
    setLoading(true);
    try {
      const [m, b, lr, dt, rs, fl, tr] = await Promise.all([
        getIpStudyMetrics({ studyId, siteId: siteFilter, category: categoryFilter }),
        getIpLotBreakdown({ studyId, siteId: siteFilter, category: categoryFilter }),
        getIpLogRows({ studyId, siteId: siteFilter, category: categoryFilter }),
        getIpDispositionTotals({ studyId, siteId: siteFilter, category: categoryFilter }),
        getIpLedgerRoster({ studyId, siteId: siteFilter, limit: 40 }),
        getIpReconciliationFlags({ studyId, siteId: siteFilter }),
        getIpInTransitLines({ studyId, siteId: siteFilter }),
      ]);
      setMetrics(m);
      setBreakdown(b);
      setLogRows(lr);
      setDispTotals(dt);
      setRoster(rs);
      setFlags(fl);
      setInTransitLines(tr);
    } catch (e) {
      toast({
        title: 'Could not load investigational product data',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [studyId, siteFilter, categoryFilter, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!studyId) {
      setSites([]);
      setSubjects([]);
      return;
    }
    void getStudySites(studyId).then(setSites).catch(() => setSites([]));
    void getStudySubjects(studyId).then(setSubjects).catch(() => setSubjects([]));
  }, [studyId]);

  const study = useMemo(() => studies.find((s) => s.id === studyId), [studies, studyId]);
  const compliancePct = metrics[0]?.compliance_pct ?? null;

  const dispositionWidget = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of dispTotals) {
      m[r.disposition] = (m[r.disposition] ?? 0) + r.total_qty;
    }
    return m;
  }, [dispTotals]);

  const formatSiteLabel = useCallback(
    (studySiteId: string) => {
      const s = sites.find((x) => x.id === studySiteId);
      return s ? `${s.site_number} — ${s.name}` : 'Site';
    },
    [sites]
  );

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!study) return;
    try {
      await downloadIpInventoryLogPdf({
        studyLabel: `${study.protocol_number} — ${study.title}`,
        printedAt: new Date().toLocaleString(),
        rows: logRows,
      });
      toast({ title: 'PDF downloaded' });
    } catch (e) {
      toast({
        title: 'PDF failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const openShipForLot = (lotId: string, sId: string) => {
    setShipLotId(lotId);
    setShipSiteId(sId);
    setShipQty('1');
    setShipOpen(true);
  };

  const submitAddItem = async () => {
    if (!studyId || !newItemName.trim()) return;
    try {
      await createIpItem({
        studyId,
        name: newItemName.trim(),
        category: newItemCategory,
        unit: newItemUnit.trim() || 'Each',
      });
      toast({ title: 'Item added' });
      setAddItemOpen(false);
      setNewItemName('');
      await refresh();
    } catch (e) {
      toast({
        title: 'Failed to add item',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const submitReceipt = async () => {
    if (!studyId || !receiptItemId || !receiptQty) return;
    try {
      await ipInitialGlobalReceipt({
        studyId,
        itemId: receiptItemId,
        quantity: Math.max(1, parseInt(receiptQty, 10) || 1),
        lotNumber: receiptLot.trim() || null,
        serialNumber: receiptSerial.trim() || null,
      });
      toast({ title: 'Global receipt recorded' });
      setReceiptOpen(false);
      await refresh();
    } catch (e) {
      toast({
        title: 'Receipt failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const submitShip = async () => {
    if (!studyId || !shipLotId || !shipSiteId) return;
    try {
      await ipShipToSite({
        studyId,
        lotId: shipLotId,
        studySiteId: shipSiteId,
        quantity: Math.max(1, parseInt(shipQty, 10) || 1),
      });
      toast({
        title: 'Shipment recorded',
        description: 'Receive at the site when the delivery arrives to move stock into site inventory.',
      });
      setShipOpen(false);
      await refresh();
    } catch (e) {
      toast({
        title: 'Ship failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const selectedReceiveLine = useMemo(() => {
    if (!receiveLineKey) return null;
    return inTransitLines.find((l) => `${l.lot_id}::${l.study_site_id}` === receiveLineKey) ?? null;
  }, [receiveLineKey, inTransitLines]);

  const submitReceive = async () => {
    if (!studyId || !selectedReceiveLine) return;
    const q = Math.max(1, parseInt(receiveQty, 10) || 1);
    if (q > selectedReceiveLine.qty_in_transit) {
      toast({
        title: 'Quantity too high',
        description: `At most ${selectedReceiveLine.qty_in_transit} in transit for this line.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      await ipReceiveAtSite({
        studyId,
        lotId: selectedReceiveLine.lot_id,
        studySiteId: selectedReceiveLine.study_site_id,
        quantity: q,
      });
      toast({ title: 'Receipt at site recorded' });
      setReceiveOpen(false);
      await refresh();
    } catch (e) {
      toast({
        title: 'Receive failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const submitVerify = async (row: IpLogRow) => {
    if (!studyId) return;
    try {
      await ipVerifyLot({ studyId, lotId: row.lot_id, studySiteId: row.study_site_id });
      toast({ title: 'Verification recorded' });
      await refresh();
    } catch (e) {
      toast({
        title: 'Verify failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const submitDispense = async () => {
    if (!studyId || !activeLogRow || !dispenseSubjectId) return;
    try {
      await ipDispense({
        studyId,
        lotId: activeLogRow.lot_id,
        studySiteId: activeLogRow.study_site_id,
        quantity: Math.max(1, parseInt(dispenseQty, 10) || 1),
        subjectId: dispenseSubjectId,
      });
      toast({ title: 'Dispense recorded' });
      setDispenseOpen(false);
      setActiveLogRow(null);
      await refresh();
    } catch (e) {
      toast({
        title: 'Dispense failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const submitReturn = async () => {
    if (!studyId || !activeLogRow) return;
    try {
      await ipReturnToGlobal({
        studyId,
        lotId: activeLogRow.lot_id,
        studySiteId: activeLogRow.study_site_id,
        quantity: Math.max(1, parseInt(moveQty, 10) || 1),
      });
      toast({ title: 'Return recorded' });
      setReturnOpen(false);
      setActiveLogRow(null);
      await refresh();
    } catch (e) {
      toast({
        title: 'Return failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const submitTransfer = async () => {
    if (!studyId || !activeLogRow || !transferToSiteId) return;
    try {
      await ipTransferSite({
        studyId,
        lotId: activeLogRow.lot_id,
        fromSiteId: activeLogRow.study_site_id,
        toSiteId: transferToSiteId,
        quantity: Math.max(1, parseInt(moveQty, 10) || 1),
      });
      toast({ title: 'Transfer recorded' });
      setTransferOpen(false);
      setActiveLogRow(null);
      await refresh();
    } catch (e) {
      toast({
        title: 'Transfer failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const submitDestroy = async () => {
    if (!studyId || !activeLogRow) return;
    try {
      await ipDestroyAtSite({
        studyId,
        lotId: activeLogRow.lot_id,
        studySiteId: activeLogRow.study_site_id,
        quantity: Math.max(1, parseInt(moveQty, 10) || 1),
      });
      toast({ title: 'Destruction recorded' });
      setDestroyOpen(false);
      setActiveLogRow(null);
      await refresh();
    } catch (e) {
      toast({
        title: 'Destroy failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6 print:p-4">
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Investigational product</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Inventory summary, site logs, and audit trail (ledger-backed).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={handlePrint} aria-label="Print">
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void handleDownloadPdf()}
              disabled={!studyId || logRows.length === 0}
              aria-label="Download inventory log PDF"
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[220px] space-y-1">
            <Label className="text-xs">Study</Label>
            <Select value={studyId || undefined} onValueChange={(v) => setStudyId(v ?? '')}>
              <SelectTrigger className="text-[12px] h-9 min-w-[220px]">
                <SelectValue
                  placeholder="Select a study"
                  getDisplayLabel={(v) => {
                    if (v == null || v === '') return null;
                    const s = studies.find((x) => x.id === v);
                    return s ? `${s.protocol_number} — ${s.title}` : null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-[12px]">
                    {s.protocol_number} — {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] space-y-1">
            <Label className="text-xs">Site</Label>
            <Select value={siteId} onValueChange={setSiteId} disabled={!studyId}>
              <SelectTrigger className="text-[12px] h-9 min-w-[160px]">
                <SelectValue
                  placeholder="All sites"
                  getDisplayLabel={(v) => {
                    if (v == null || v === '' || v === '__all_sites__') return 'All sites';
                    const s = sites.find((x) => x.id === v);
                    return s ? `${s.site_number} — ${s.name}` : null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all_sites__" className="text-[12px]">
                  All sites
                </SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-[12px]">
                    {s.site_number} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={!studyId}>
              <SelectTrigger className="text-[12px] h-9 min-w-[160px]">
                <SelectValue
                  placeholder="All categories"
                  getDisplayLabel={(v) => {
                    if (v == null || v === '' || v === '__all__') return 'All categories';
                    const opt = CATEGORY_FILTER_OPTIONS.find((o) => o.value === v);
                    return opt?.label ?? null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-[12px]">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!studyId ? (
        <Card className="print:hidden">
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a study to view investigational product inventory and logs.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden print:block border-b pb-3 mb-4">
            <h1 className="text-xl font-semibold">Investigational product report</h1>
            <p className="text-sm text-muted-foreground">
              {study?.protocol_number} — {study?.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Printed {new Date().toLocaleString()}
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'summary' | 'logs')} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
              <TabsList>
                <TabsTrigger value="summary">Inventory summary</TabsTrigger>
                <TabsTrigger value="logs">Inventory logs</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary" className="space-y-4">
              <div className="flex flex-wrap justify-end gap-2 print:hidden">
                <Button
                  type="button"
                  onClick={() => {
                    setReceiptItemId(metrics[0]?.item_id ?? '');
                    setReceiptOpen(true);
                  }}
                  disabled={!studyId || metrics.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add inventory
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!studyId || inTransitLines.length === 0}
                  onClick={() => {
                    const first = inTransitLines[0];
                    setReceiveLineKey(first ? `${first.lot_id}::${first.study_site_id}` : '');
                    setReceiveQty(first ? String(first.qty_in_transit) : '1');
                    setReceiveOpen(true);
                  }}
                >
                  Receive at site
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAddItemOpen(true)}>
                  New catalog item
                </Button>
              </div>
              <p className="text-center text-lg font-medium print:block hidden">Inventory summary</p>
              <IpSummaryCharts metrics={metrics} />
              <IpSummaryTable metrics={metrics} breakdown={breakdown} onShipLot={openShipForLot} />
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <IpLogsTable
                rows={logRows}
                onVerify={(row) => void submitVerify(row)}
                onDispense={(row) => {
                  setActiveLogRow(row);
                  setDispenseQty('1');
                  setDispenseSubjectId('');
                  setDispenseOpen(true);
                }}
                onReturn={(row) => {
                  setActiveLogRow(row);
                  setMoveQty('1');
                  setReturnOpen(true);
                }}
                onTransfer={(row) => {
                  setActiveLogRow(row);
                  setMoveQty('1');
                  setTransferToSiteId('');
                  setTransferOpen(true);
                }}
                onDestroy={(row) => {
                  setActiveLogRow(row);
                  setMoveQty('1');
                  setDestroyOpen(true);
                }}
              />

              {flags.some((f) => f.flag_unverified_used || f.flag_quantity_mismatch) && (
                <Card className="border-amber-500/40">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Reconciliation flags</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {flags.filter((f) => f.flag_unverified_used).length > 0 && (
                      <p>
                        {flags.filter((f) => f.flag_unverified_used).length} row(s) with used disposition and no
                        verification timestamp.
                      </p>
                    )}
                    {flags.filter((f) => f.flag_quantity_mismatch).length > 0 && (
                      <p>{flags.filter((f) => f.flag_quantity_mismatch).length} row(s) with inconsistent quantities.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <IpLogsCharts dispositionTotals={dispTotals} compliancePct={compliancePct} />

              <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="print:hidden gap-1">
                    <ChevronDown className={cn('h-4 w-4 transition', metricsOpen && 'rotate-180')} />
                    Metrics and user roster
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Disposition summary</CardTitle>
                        <p className="text-xs text-muted-foreground">Quantity on site locations by disposition.</p>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-3 text-sm">
                        {Object.keys(dispositionWidget).length === 0 ? (
                          <span className="text-muted-foreground">No data</span>
                        ) : (
                          Object.entries(dispositionWidget).map(([k, v]) => (
                            <button
                              key={k}
                              type="button"
                              className="underline-offset-2 hover:underline"
                              onClick={() => {
                                setTab('logs');
                              }}
                            >
                              <span className="font-medium">
                                {IP_DISPOSITION_LABELS[k as IpDisposition] ?? k}
                              </span>
                              : {v}
                            </button>
                          ))
                        )}
                        <span className="text-muted-foreground border-l pl-3 ml-1">
                          Compliance:{' '}
                          {compliancePct != null && Number.isFinite(compliancePct)
                            ? `${compliancePct.toFixed(1)}%`
                            : '—'}
                        </span>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Recent ledger activity</CardTitle>
                      </CardHeader>
                      <CardContent className="max-h-[200px] overflow-y-auto text-sm space-y-2">
                        {roster.length === 0 ? (
                          <p className="text-muted-foreground">No ledger entries yet.</p>
                        ) : (
                          roster.map((r, i) => (
                            <div key={i} className="border-b border-border/60 pb-2 last:border-0">
                              <div className="font-medium">{r.performer_label}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.entry_type.replace(/_/g, ' ')} ·{' '}
                                {new Date(r.performed_at).toLocaleString()}
                                {r.subject_number_snapshot ? ` · Subject ${r.subject_number_snapshot}` : ''}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>
          </Tabs>

          <footer className="flex justify-between text-xs text-muted-foreground border-t pt-4 print:mt-8">
            <span>Investigational product</span>
            <span>Proprietary and confidential</span>
          </footer>
        </>
      )}

      {loading && studyId ? (
        <p className="text-sm text-muted-foreground print:hidden">Loading…</p>
      ) : null}

      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New catalog item</DialogTitle>
            <DialogDescription>Defines what you track (drug, device, equipment, or supplies).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input className="text-[12px] h-9" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={newItemCategory} onValueChange={(v) => setNewItemCategory(v as IpCategory)}>
                <SelectTrigger className="text-[12px] h-9">
                  <SelectValue
                    placeholder="Select category"
                    getDisplayLabel={(v) =>
                      v ? (IP_CATEGORY_LABELS[v as IpCategory] ?? null) : null
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(IP_CATEGORY_LABELS) as [IpCategory, string][]).map(([val, lab]) => (
                    <SelectItem key={val} value={val} className="text-[12px]">
                      {lab}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unit</Label>
              <Input className="text-[12px] h-9" value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setAddItemOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitAddItem()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive into global pool</DialogTitle>
            <DialogDescription>Adds quantity to central inventory for the selected catalog item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Item</Label>
              <Select value={receiptItemId} onValueChange={setReceiptItemId}>
                <SelectTrigger className="text-[12px] h-9">
                  <SelectValue
                    placeholder="Select item"
                    getDisplayLabel={(v) => {
                      if (v == null || v === '') return null;
                      const row = metrics.find((m) => m.item_id === v);
                      return row?.item_name ?? null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map((m) => (
                    <SelectItem key={m.item_id} value={m.item_id} className="text-[12px]">
                      {m.item_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input className="text-[12px] h-9" value={receiptQty} onChange={(e) => setReceiptQty(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lot number (optional)</Label>
              <Input className="text-[12px] h-9" value={receiptLot} onChange={(e) => setReceiptLot(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Serial (optional)</Label>
              <Input className="text-[12px] h-9" value={receiptSerial} onChange={(e) => setReceiptSerial(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setReceiptOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitReceipt()}>
              Record receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shipOpen} onOpenChange={setShipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ship to site</DialogTitle>
            <DialogDescription>
              Removes quantity from the global pool and records an in-transit shipment. Use “Receive at site” when the
              delivery arrives to post stock to the site.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Destination site</Label>
              <Select value={shipSiteId} onValueChange={setShipSiteId}>
                <SelectTrigger className="text-[12px] h-9">
                  <SelectValue
                    placeholder="Select destination site"
                    getDisplayLabel={(v) => {
                      if (v == null || v === '') return null;
                      const s = sites.find((x) => x.id === v);
                      return s ? `${s.site_number} — ${s.name}` : null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-[12px]">
                      {s.site_number} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input className="text-[12px] h-9" value={shipQty} onChange={(e) => setShipQty(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShipOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitShip()}>
              Record shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive at site</DialogTitle>
            <DialogDescription>
              Confirms delivery into site on-hand inventory and records a received-at-site event in the audit trail
              (including site name and number).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Shipment line</Label>
              <Select
                value={receiveLineKey || undefined}
                onValueChange={(v) => {
                  setReceiveLineKey(v);
                  const line = inTransitLines.find((l) => `${l.lot_id}::${l.study_site_id}` === v);
                  if (line) setReceiveQty(String(line.qty_in_transit));
                }}
              >
                <SelectTrigger className="text-[12px] h-9">
                  <SelectValue
                    placeholder="Select shipment"
                    getDisplayLabel={(v) => {
                      if (v == null || v === '') return null;
                      const line = inTransitLines.find((l) => `${l.lot_id}::${l.study_site_id}` === v);
                      if (!line) return null;
                      return `${line.item_name} · Lot ${line.lot_number ?? '—'}${
                        line.serial_number ? ` · ${line.serial_number}` : ''
                      } · ${formatSiteLabel(line.study_site_id)} · ${line.qty_in_transit} in transit`;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {inTransitLines.map((l) => (
                    <SelectItem
                      key={`${l.lot_id}-${l.study_site_id}`}
                      value={`${l.lot_id}::${l.study_site_id}`}
                      className="text-[12px]"
                    >
                      {l.item_name} · Lot {l.lot_number ?? '—'}
                      {l.serial_number ? ` · ${l.serial_number}` : ''} · {formatSiteLabel(l.study_site_id)} ·{' '}
                      {l.qty_in_transit} in transit
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity to receive</Label>
              <Input className="text-[12px] h-9" value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setReceiveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!selectedReceiveLine} onClick={() => void submitReceive()}>
              Record receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dispenseOpen} onOpenChange={setDispenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record dispense</DialogTitle>
            <DialogDescription>Links usage to a subject; creates an immutable ledger entry with snapshots.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input className="text-[12px] h-9" value={dispenseQty} onChange={(e) => setDispenseQty(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Select value={dispenseSubjectId} onValueChange={setDispenseSubjectId}>
                <SelectTrigger className="text-[12px] h-9">
                  <SelectValue
                    placeholder="Select subject"
                    getDisplayLabel={(v) => {
                      if (v == null || v === '') return null;
                      const sub = subjects.find((s) => s.id === v);
                      return sub ? `Subject ${sub.subject_number}` : null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-[12px]">
                      Subject {s.subject_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDispenseOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitDispense()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to global</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label className="text-xs">Quantity</Label>
            <Input className="text-[12px] h-9" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitReturn()}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to site</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Destination site</Label>
              <Select value={transferToSiteId} onValueChange={setTransferToSiteId}>
                <SelectTrigger className="text-[12px] h-9">
                  <SelectValue
                    placeholder="Select destination site"
                    getDisplayLabel={(v) => {
                      if (v == null || v === '') return null;
                      const s = sites.find((x) => x.id === v);
                      return s ? `${s.site_number} — ${s.name}` : null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sites
                    .filter((s) => s.id !== activeLogRow?.study_site_id)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-[12px]">
                        {s.site_number} — {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input className="text-[12px] h-9" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitTransfer()}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={destroyOpen} onOpenChange={setDestroyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Destroy quantity</DialogTitle>
            <DialogDescription>Permanent removal at the selected site.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label className="text-xs">Quantity</Label>
            <Input className="text-[12px] h-9" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDestroyOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void submitDestroy()}>
              Destroy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
