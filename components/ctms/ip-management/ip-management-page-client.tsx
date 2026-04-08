'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileDown, Loader2, Printer, Plus, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Study } from '@/lib/types/ctms';
import type {
  IpCategory,
  IpInTransitLineRow,
  IpItemSiteMetricRow,
  IpLogRow,
  IpOrderRow,
  IpStudyMetricRow,
} from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, IP_DISPOSITION_LABELS, type IpDisposition } from '@/lib/types/ip-management';
import {
  getIpDispositionTotals,
  getIpInTransitLines,
  getIpLedgerRoster,
  getIpLogRows,
  getIpLotBreakdown,
  getIpReconciliationFlags,
  getIpStudyMetrics,
  getIpTransactionReportData,
} from '@/lib/actions/ip-management';
import { getStudySites } from '@/lib/actions/sites';
import { getStudySubjects } from '@/lib/actions/subjects';
import { IpSummaryTable } from '@/components/ctms/ip-management/ip-summary-table';
import { IpSummaryCharts } from '@/components/ctms/ip-management/ip-summary-charts';
import { IpLogsTable } from '@/components/ctms/ip-management/ip-logs-table';
import { IpLogsVerifyInventoryDialog } from '@/components/ctms/ip-management/ip-logs-verify-inventory-dialog';
import { IpUnverifyInventoryDialog } from '@/components/ctms/ip-management/ip-unverify-inventory-dialog';
import { IpReceiveInventoryDialog } from '@/components/ctms/ip-management/ip-receive-inventory-dialog';
import { IpUnreceiveInventoryDialog } from '@/components/ctms/ip-management/ip-unreceive-inventory-dialog';
import { IpReturnToManufacturerDialog } from '@/components/ctms/ip-management/ip-return-to-manufacturer-dialog';
import { IpTransferSiteDialog } from '@/components/ctms/ip-management/ip-transfer-site-dialog';
import { IpDestroyQuantityDialog } from '@/components/ctms/ip-management/ip-destroy-quantity-dialog';
import { IpChangeDispositionDialog } from '@/components/ctms/ip-management/ip-change-disposition-dialog';
import { IpLogsCharts } from '@/components/ctms/ip-management/ip-logs-charts';
import { IpAddInventoryDialog } from '@/components/ctms/ip-management/ip-add-inventory-dialog';
import { IpAddSiteDialog } from '@/components/ctms/ip-management/ip-add-site-dialog';
import { IpArchiveOrderDialog } from '@/components/ctms/ip-management/ip-archive-order-dialog';
import { IpRestoreOrderDialog } from '@/components/ctms/ip-management/ip-restore-order-dialog';
import { IpAddOrderDialog } from '@/components/ctms/ip-management/ip-add-order-dialog';
import { IpEditOrderDialog } from '@/components/ctms/ip-management/ip-edit-order-dialog';
import { IpEditInventoryDialog } from '@/components/ctms/ip-management/ip-edit-inventory-dialog';
import { IpDeleteEquipmentDialog } from '@/components/ctms/ip-management/ip-delete-equipment-dialog';
import { IpRestoreEquipmentDialog } from '@/components/ctms/ip-management/ip-restore-equipment-dialog';
import { IpDeleteSiteDialog } from '@/components/ctms/ip-management/ip-delete-site-dialog';
import { IpRestoreSiteDialog } from '@/components/ctms/ip-management/ip-restore-site-dialog';
import { IpLotHistoryDialog } from '@/components/ctms/ip-management/ip-lot-history-dialog';
import { IpOrderShippingDocumentsDialog } from '@/components/ctms/ip-management/ip-order-shipping-documents-dialog';
import { useToast } from '@/hooks/use-toast';
import { downloadIpInventoryLogPdf, downloadIpTransactionReportPdf } from '@/lib/utils/ip-inventory-pdf';
import { Input } from '@/components/ui/input';
import { DocsHelpLink } from '@/components/docs/docs-help-link';
import { cn } from '@/lib/utils';
import { getIpInventoryUiContext } from '@/lib/utils/ip-inventory-ui-copy';
import { ipLogRowToOrderRow } from '@/lib/utils/ip-log-row';
import {
  logRowToMovementContext,
  orderToMovementContext,
  type IpMovementLineContext,
} from '@/lib/utils/ip-order-actions';

function asIpCategory(value: string): IpCategory | undefined {
  return Object.prototype.hasOwnProperty.call(IP_CATEGORY_LABELS, value) ? (value as IpCategory) : undefined;
}

const CATEGORY_FILTER_OPTIONS: { value: string; label: string }[] = (
  Object.entries(IP_CATEGORY_LABELS) as [IpCategory, string][]
).map(([value, label]) => ({ value, label }));

interface IpManagementPageClientProps {
  studies: Study[];
  isIpAdmin: boolean;
}

export function IpManagementPageClient({ studies, isIpAdmin }: IpManagementPageClientProps) {
  const { toast } = useToast();
  const [studyId, setStudyId] = useState<string>(() => studies[0]?.id ?? '');
  const [siteId, setSiteId] = useState<string>('__all_sites__');
  const [category, setCategory] = useState<string>('investigational_drug');
  const [tab, setTab] = useState<'summary' | 'logs'>('summary');
  const [metrics, setMetrics] = useState<IpStudyMetricRow[]>([]);
  const [breakdown, setBreakdown] = useState<Awaited<ReturnType<typeof getIpLotBreakdown>>>([]);
  const [logRows, setLogRows] = useState<IpLogRow[]>([]);
  const [dispTotals, setDispTotals] = useState<Awaited<ReturnType<typeof getIpDispositionTotals>>>([]);
  const [roster, setRoster] = useState<Awaited<ReturnType<typeof getIpLedgerRoster>>>([]);
  const [flags, setFlags] = useState<Awaited<ReturnType<typeof getIpReconciliationFlags>>>([]);
  const [inTransitLines, setInTransitLines] = useState<IpInTransitLineRow[]>([]);
  const [sites, setSites] = useState<Awaited<ReturnType<typeof getStudySites>>>([]);
  const [loading, setLoading] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [dispositionFilter, setDispositionFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [ordersRefreshNonce, setOrdersRefreshNonce] = useState(0);
  const [siteLinksRefreshNonce, setSiteLinksRefreshNonce] = useState(0);
  const [siteLinksItemId, setSiteLinksItemId] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<IpLogRow | IpOrderRow | null>(null);
  const [unverifyOpen, setUnverifyOpen] = useState(false);
  const [unverifyTarget, setUnverifyTarget] = useState<IpLogRow | IpOrderRow | null>(null);
  const [editInventoryOpen, setEditInventoryOpen] = useState(false);
  const [editInventoryMetric, setEditInventoryMetric] = useState<IpStudyMetricRow | null>(null);
  const [deleteEquipmentOpen, setDeleteEquipmentOpen] = useState(false);
  const [deleteEquipmentMetric, setDeleteEquipmentMetric] = useState<IpStudyMetricRow | null>(null);
  const [restoreEquipmentOpen, setRestoreEquipmentOpen] = useState(false);
  const [restoreEquipmentMetric, setRestoreEquipmentMetric] = useState<IpStudyMetricRow | null>(null);
  const [deleteSiteOpen, setDeleteSiteOpen] = useState(false);
  const [deleteSiteCtx, setDeleteSiteCtx] = useState<{
    item: IpStudyMetricRow;
    site: IpItemSiteMetricRow;
  } | null>(null);
  const [restoreSiteOpen, setRestoreSiteOpen] = useState(false);
  const [restoreSiteCtx, setRestoreSiteCtx] = useState<{
    item: IpStudyMetricRow;
    site: IpItemSiteMetricRow;
  } | null>(null);
  const [addInventoryOpen, setAddInventoryOpen] = useState(false);
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [addSiteMetric, setAddSiteMetric] = useState<IpStudyMetricRow | null>(null);
  const [movementLine, setMovementLine] = useState<IpMovementLineContext | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [unreceiveOpen, setUnreceiveOpen] = useState(false);
  const [returnMfrOpen, setReturnMfrOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [changeDispOpen, setChangeDispOpen] = useState(false);

  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [addOrderCtx, setAddOrderCtx] = useState<{
    metric: IpStudyMetricRow;
    studySiteId: string;
  } | null>(null);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [editOrderData, setEditOrderData] = useState<IpOrderRow | null>(null);
  const [archiveOrderOpen, setArchiveOrderOpen] = useState(false);
  const [archiveOrderData, setArchiveOrderData] = useState<IpOrderRow | null>(null);
  const [restoreOrderOpen, setRestoreOrderOpen] = useState(false);
  const [restoreOrderData, setRestoreOrderData] = useState<IpOrderRow | null>(null);
  const [lotHistoryOpen, setLotHistoryOpen] = useState(false);
  const [lotHistoryLotId, setLotHistoryLotId] = useState('');
  const [lotHistoryTitle, setLotHistoryTitle] = useState<string | undefined>(undefined);
  const [shippingDocsOpen, setShippingDocsOpen] = useState(false);
  const [shippingDocsCtx, setShippingDocsCtx] = useState<{
    studyId: string;
    orderId: string;
    contextLabel: string;
    canUpload: boolean;
  } | null>(null);

  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof getStudySubjects>>>([]);

  const categoryFilter: IpCategory = asIpCategory(category) ?? 'investigational_drug';
  const inventoryUiContext = useMemo(() => getIpInventoryUiContext(categoryFilter), [categoryFilter]);
  /** Category filter always applies; new/edit catalog dialogs match it read-only. */
  const pageCategoryFilterLocked = true;
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
      const [m, b, lr, dt, rs, fl, transit] = await Promise.all([
        getIpStudyMetrics({
          studyId,
          siteId: siteFilter,
          category: categoryFilter,
          includeArchived: false,
        }),
        getIpLotBreakdown({ studyId, siteId: siteFilter, category: categoryFilter }),
        getIpLogRows({
          studyId,
          siteId: siteFilter,
          category: categoryFilter,
          disposition: dispositionFilter,
          includeArchivedOrders: false,
        }),
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
      setInTransitLines(transit);
    } catch (e) {
      toast({
        title: 'Could not load inventory management data',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [studyId, siteFilter, categoryFilter, dispositionFilter, toast]);

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

  const inTransitQtyByLotSite = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of inTransitLines) {
      const k = `${line.lot_id}:${line.study_site_id}`;
      map.set(k, (map.get(k) ?? 0) + line.qty_in_transit);
    }
    return map;
  }, [inTransitLines]);

  const kpiTotals = useMemo(() => {
    const totalItems = metrics.length;
    let inStock = 0;
    let atSites = 0;
    let available = 0;
    for (const m of metrics) {
      inStock += m.global_in_stock;
      atSites += m.site_onsite;
      available += m.site_available;
    }
    return { totalItems, inStock, atSites, available };
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
    if (!searchQuery.trim()) return metrics;
    const q = searchQuery.toLowerCase();
    return metrics.filter((m) => m.item_name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
  }, [metrics, searchQuery]);

  const filteredLogRows = useMemo(() => {
    if (!searchQuery.trim()) return logRows;
    const q = searchQuery.toLowerCase();
    return logRows.filter(
      (r) =>
        r.item_name.toLowerCase().includes(q) ||
        r.serial_number?.toLowerCase().includes(q) ||
        r.lot_number?.toLowerCase().includes(q) ||
        r.batch_number?.toLowerCase().includes(q) ||
        r.site_name?.toLowerCase().includes(q) ||
        r.order_reference?.toLowerCase().includes(q) ||
        r.disposition.toLowerCase().includes(q)
    );
  }, [logRows, searchQuery]);

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ id: s.id, subject_number: s.subject_number })),
    [subjects]
  );

  const siteTransferOptions = useMemo(
    () => sites.map((s) => ({ id: s.id, site_number: s.site_number, name: s.name })),
    [sites]
  );

  const afterMutation = useCallback(async () => {
    await refresh();
    setOrdersRefreshNonce((n) => n + 1);
  }, [refresh]);

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

  const openAddSite = (metric: IpStudyMetricRow) => {
    setAddSiteMetric(metric);
    setAddSiteOpen(true);
  };

  const openEditInventory = (metric: IpStudyMetricRow) => {
    setEditInventoryMetric(metric);
    setEditInventoryOpen(true);
  };

  const openDeleteEquipment = (metric: IpStudyMetricRow) => {
    setDeleteEquipmentMetric(metric);
    setDeleteEquipmentOpen(true);
  };

  const openRestoreEquipment = (metric: IpStudyMetricRow) => {
    setRestoreEquipmentMetric(metric);
    setRestoreEquipmentOpen(true);
  };

  const openDeleteSite = (item: IpStudyMetricRow, site: IpItemSiteMetricRow) => {
    setDeleteSiteCtx({ item, site });
    setDeleteSiteOpen(true);
  };

  const openRestoreSite = (item: IpStudyMetricRow, site: IpItemSiteMetricRow) => {
    setRestoreSiteCtx({ item, site });
    setRestoreSiteOpen(true);
  };

  const siteMetricLabel = (site: IpItemSiteMetricRow) =>
    site.site_number && site.site_name
      ? `${site.site_number} — ${site.site_name}`
      : site.site_name || 'Site';

  const handleViewTransactions = async (itemId: string, studySiteId?: string) => {
    if (!studyId) return;
    try {
      const data = await getIpTransactionReportData({ studyId, itemId, studySiteId });
      await downloadIpTransactionReportPdf(data);
      toast({ title: 'Transaction report downloaded' });
    } catch (e) {
      toast({
        title: 'Failed to generate report',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const openAddOrder = (metric: IpStudyMetricRow, studySiteId: string) => {
    setAddOrderCtx({ metric, studySiteId });
    setAddOrderOpen(true);
  };

  const openEditOrder = (order: IpOrderRow) => {
    setEditOrderData(order);
    setEditOrderOpen(true);
  };

  const openShippingDocsFromOrder = (order: IpOrderRow) => {
    if (!studyId) return;
    setShippingDocsCtx({
      studyId,
      orderId: order.order_id,
      contextLabel: order.order_reference?.trim() ? order.order_reference : order.item_name,
      canUpload: !order.deleted_at,
    });
    setShippingDocsOpen(true);
  };

  const openShippingDocsFromLog = (row: IpLogRow) => {
    if (!studyId || !row.order_id) return;
    setShippingDocsCtx({
      studyId,
      orderId: row.order_id,
      contextLabel: row.order_reference?.trim() ? row.order_reference : row.item_name,
      canUpload: !row.order_deleted_at,
    });
    setShippingDocsOpen(true);
  };

  const openArchiveOrder = (order: IpOrderRow) => {
    if (!isIpAdmin) return;
    setArchiveOrderData(order);
    setArchiveOrderOpen(true);
  };

  const openRestoreOrder = (order: IpOrderRow) => {
    if (!isIpAdmin) return;
    setRestoreOrderData(order);
    setRestoreOrderOpen(true);
  };

  const bumpOrdersCache = useCallback(async () => {
    await refresh();
    setOrdersRefreshNonce((n) => n + 1);
  }, [refresh]);

  const handleAddSiteSuccess = useCallback(
    async ({ itemId }: { itemId: string }) => {
      await refresh();
      setSiteLinksItemId(itemId);
      setSiteLinksRefreshNonce((n) => n + 1);
    },
    [refresh]
  );

  const openLotHistory = (lotId: string, label?: string) => {
    setLotHistoryLotId(lotId);
    setLotHistoryTitle(label ? `History — ${label}` : 'Transaction history');
    setLotHistoryOpen(true);
  };

  const openVerifyFromOrder = (order: IpOrderRow) => {
    setVerifyTarget(order);
    setVerifyOpen(true);
  };

  const openVerifyFromLog = (row: IpLogRow) => {
    setVerifyTarget(row);
    setVerifyOpen(true);
  };

  const openUnverifyFromOrder = (order: IpOrderRow) => {
    if (!isIpAdmin) {
      toast({ title: 'Administrators only', variant: 'destructive' });
      return;
    }
    setUnverifyTarget(order);
    setUnverifyOpen(true);
  };

  const openUnverifyFromLog = (row: IpLogRow) => {
    if (!isIpAdmin) {
      toast({ title: 'Administrators only', variant: 'destructive' });
      return;
    }
    setUnverifyTarget(row);
    setUnverifyOpen(true);
  };

  const transitForLogRow = useCallback(
    (row: IpLogRow) => inTransitQtyByLotSite.get(`${row.lot_id}:${row.study_site_id}`) ?? 0,
    [inTransitQtyByLotSite]
  );

  const openReceiveFromOrder = (order: IpOrderRow) => {
    setMovementLine(orderToMovementContext(studyId, order));
    setReceiveOpen(true);
  };

  const openReceiveFromLog = (row: IpLogRow) => {
    setMovementLine(logRowToMovementContext(studyId, row, transitForLogRow(row)));
    setReceiveOpen(true);
  };

  const openUnreceiveFromOrder = (order: IpOrderRow) => {
    if (!isIpAdmin) {
      toast({ title: 'Administrators only', variant: 'destructive' });
      return;
    }
    setMovementLine(orderToMovementContext(studyId, order));
    setUnreceiveOpen(true);
  };

  const openUnreceiveFromLog = (row: IpLogRow) => {
    if (!isIpAdmin) {
      toast({ title: 'Administrators only', variant: 'destructive' });
      return;
    }
    setMovementLine(logRowToMovementContext(studyId, row, transitForLogRow(row)));
    setUnreceiveOpen(true);
  };

  const openReturnFromOrder = (order: IpOrderRow) => {
    setMovementLine(orderToMovementContext(studyId, order));
    setReturnMfrOpen(true);
  };

  const openReturnFromLog = (row: IpLogRow) => {
    setMovementLine(logRowToMovementContext(studyId, row, transitForLogRow(row)));
    setReturnMfrOpen(true);
  };

  const openTransferFromOrder = (order: IpOrderRow) => {
    setMovementLine(orderToMovementContext(studyId, order));
    setTransferOpen(true);
  };

  const openTransferFromLog = (row: IpLogRow) => {
    setMovementLine(logRowToMovementContext(studyId, row, transitForLogRow(row)));
    setTransferOpen(true);
  };

  const openDestroyFromOrder = (order: IpOrderRow) => {
    setMovementLine(orderToMovementContext(studyId, order));
    setDestroyOpen(true);
  };

  const openDestroyFromLog = (row: IpLogRow) => {
    setMovementLine(logRowToMovementContext(studyId, row, transitForLogRow(row)));
    setDestroyOpen(true);
  };

  const openChangeDispFromOrder = (order: IpOrderRow) => {
    setMovementLine(orderToMovementContext(studyId, order));
    setChangeDispOpen(true);
  };

  const openChangeDispFromLog = (row: IpLogRow) => {
    setMovementLine(logRowToMovementContext(studyId, row, transitForLogRow(row)));
    setChangeDispOpen(true);
  };

  const openViewOrderTransactions = (order: IpOrderRow) => {
    void handleViewTransactions(order.item_id, order.study_site_id);
  };

  const openDeleteLogOrder = (row: IpLogRow) => {
    if (!isIpAdmin) {
      toast({ title: 'Administrators only', variant: 'destructive' });
      return;
    }
    const o = ipLogRowToOrderRow(row);
    if (!o) {
      toast({ title: 'No order is linked to this line', variant: 'destructive' });
      return;
    }
    setArchiveOrderData(o);
    setArchiveOrderOpen(true);
  };

  const openRestoreLogOrder = (row: IpLogRow) => {
    if (!isIpAdmin) {
      toast({ title: 'Administrators only', variant: 'destructive' });
      return;
    }
    const o = ipLogRowToOrderRow(row);
    if (!o) return;
    setRestoreOrderData(o);
    setRestoreOrderOpen(true);
  };

  const logsCategoryFooterLabel = useMemo(
    () => IP_CATEGORY_LABELS[categoryFilter],
    [categoryFilter]
  );

  return (
    <div className="p-6 space-y-6 print:p-4">
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Inventory Management</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Inventory summary, site logs, and audit trail (ledger-backed).
              </p>
            </div>
            <DocsHelpLink
              slug="inventory-management"
              section="6-site-logistics"
              className="mt-1.5 shrink-0"
            />
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
            <Select value={studyId} onValueChange={(v) => setStudyId(v ?? '')}>
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
                  placeholder="Category"
                  getDisplayLabel={(v) => {
                    if (v == null || v === '') return null;
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
            Select a study to view inventory and logs.
          </CardContent>
        </Card>
      ) : (
        <>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 print:hidden">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading inventory data…</span>
            </div>
          )}

          {!loading && metrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
              {([
                { label: 'Total items', value: kpiTotals.totalItems },
                { label: 'In stock (global)', value: kpiTotals.inStock },
                { label: 'At sites', value: kpiTotals.atSites },
                { label: 'Available (site)', value: kpiTotals.available },
              ] as const).map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="py-3 px-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-semibold tabular-nums">{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="hidden print:block border-b pb-3 mb-4">
            <h1 className="text-xl font-semibold">Inventory Management report</h1>
            <p className="text-sm text-muted-foreground">
              {study?.protocol_number} — {study?.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
              Printed {new Date().toLocaleString()}
            </p>
          </div>

          <Tabs
            tabsId="ip-management"
            value={tab}
            onValueChange={(v: string) => setTab(v as 'summary' | 'logs')}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
              <TabsList>
                <TabsTrigger value="summary">Inventory summary</TabsTrigger>
                <TabsTrigger value="logs">Inventory logs</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {tab === 'logs' && dispositionFilter && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDispositionFilter(null)}
                  >
                    Clear filter: {IP_DISPOSITION_LABELS[dispositionFilter as IpDisposition] ?? dispositionFilter}
                  </Button>
                )}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search inventory…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-48 pl-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <TabsContent value="summary" className="space-y-4">
              <div className="flex flex-wrap justify-end gap-2 print:hidden">
                <Button
                  type="button"
                  onClick={() => setAddInventoryOpen(true)}
                  disabled={!studyId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add inventory
                </Button>
              </div>
              <p className="text-center text-lg font-medium print:block hidden">Inventory summary</p>
              <IpSummaryCharts metrics={filteredMetrics} uiContext={inventoryUiContext} />
              <IpSummaryTable
                studyId={studyId}
                metrics={filteredMetrics}
                uiContext={inventoryUiContext}
                archivedView={false}
                archivedSitesView={false}
                showArchivedOrders={false}
                ordersRefreshNonce={ordersRefreshNonce}
                siteLinksRefreshNonce={siteLinksRefreshNonce}
                siteLinksItemId={siteLinksItemId}
                isIpAdmin={isIpAdmin}
                onEditInventory={studyId ? openEditInventory : undefined}
                onDeleteEquipment={studyId ? openDeleteEquipment : undefined}
                onRestoreEquipment={undefined}
                onAddSite={studyId ? openAddSite : undefined}
                onViewTransactions={(itemId, siteId) => void handleViewTransactions(itemId, siteId)}
                onViewOrderTransactions={
                  studyId ? openViewOrderTransactions : undefined
                }
                onAddOrder={studyId ? openAddOrder : undefined}
                onEditOrder={studyId ? openEditOrder : undefined}
                onReceiveInventory={studyId ? openReceiveFromOrder : undefined}
                onReverseReceipt={studyId && isIpAdmin ? openUnreceiveFromOrder : undefined}
                onReturnToManufacturer={studyId ? openReturnFromOrder : undefined}
                onTransferOrder={studyId ? openTransferFromOrder : undefined}
                onDestroyOrderLine={studyId ? openDestroyFromOrder : undefined}
                onChangeDisposition={
                  studyId && isIpAdmin ? openChangeDispFromOrder : undefined
                }
                onDeleteOrder={
                  studyId && isIpAdmin ? openArchiveOrder : undefined
                }
                onVerifyOrder={studyId ? openVerifyFromOrder : undefined}
                onUnverifyOrder={studyId && isIpAdmin ? openUnverifyFromOrder : undefined}
                onRestoreOrder={undefined}
                onDeleteSite={studyId ? openDeleteSite : undefined}
                onRestoreSite={undefined}
                onViewLotHistory={studyId ? openLotHistory : undefined}
                onShippingDocuments={studyId ? openShippingDocsFromOrder : undefined}
              />
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <IpLogsTable
                rows={filteredLogRows}
                studyProtocolNumber={study?.protocol_number}
                studyName={study?.title}
                categoryFooterLabel={logsCategoryFooterLabel}
                uiContext={inventoryUiContext}
                isIpAdmin={isIpAdmin}
                inTransitQtyByLotSite={inTransitQtyByLotSite}
                onViewTransactions={(row) => void handleViewTransactions(row.item_id, row.study_site_id)}
                onViewLotHistory={studyId ? openLotHistory : undefined}
                onShippingDocuments={studyId ? openShippingDocsFromLog : undefined}
                onVerifyInventory={studyId ? openVerifyFromLog : undefined}
                onUnverifyInventory={studyId && isIpAdmin ? openUnverifyFromLog : undefined}
                onDeleteOrder={studyId && isIpAdmin ? openDeleteLogOrder : undefined}
                onRestoreOrder={studyId && isIpAdmin ? openRestoreLogOrder : undefined}
                onReceiveInventory={studyId ? openReceiveFromLog : undefined}
                onReverseReceipt={studyId && isIpAdmin ? openUnreceiveFromLog : undefined}
                onReturnToManufacturer={studyId ? openReturnFromLog : undefined}
                onTransfer={studyId ? openTransferFromLog : undefined}
                onDestroy={studyId ? openDestroyFromLog : undefined}
                onChangeDisposition={
                  studyId && isIpAdmin ? openChangeDispFromLog : undefined
                }
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
                              className={cn(
                                'underline-offset-2 hover:underline',
                                dispositionFilter === k && 'underline font-semibold'
                              )}
                              onClick={() => {
                                setDispositionFilter(dispositionFilter === k ? null : k);
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
            <span>Inventory Management</span>
            <span>Proprietary and confidential</span>
          </footer>
        </>
      )}

      <IpAddInventoryDialog
        open={addInventoryOpen}
        onOpenChange={setAddInventoryOpen}
        studyId={studyId}
        studyLabel={study ? `${study.protocol_number} — ${study.title}` : ''}
        pageCategoryFilterLocked={pageCategoryFilterLocked}
        categoryFilter={categoryFilter}
        onSuccess={refresh}
      />

      <IpAddSiteDialog
        open={addSiteOpen}
        onOpenChange={(o) => {
          setAddSiteOpen(o);
          if (!o) setAddSiteMetric(null);
        }}
        studyId={studyId}
        studyLabel={study ? `${study.protocol_number} — ${study.title}` : ''}
        metric={addSiteMetric}
        sites={sites}
        onSuccess={handleAddSiteSuccess}
      />

      {studyId && editInventoryMetric && (
        <IpEditInventoryDialog
          open={editInventoryOpen}
          onOpenChange={(o) => {
            setEditInventoryOpen(o);
            if (!o) setEditInventoryMetric(null);
          }}
          studyId={studyId}
          studyLabel={study ? `${study.protocol_number} — ${study.title}` : ''}
          itemId={editInventoryMetric.item_id}
          metric={editInventoryMetric}
          pageCategoryFilterLocked={pageCategoryFilterLocked}
          categoryFilter={categoryFilter}
          onSuccess={refresh}
        />
      )}

      {studyId && deleteEquipmentMetric && (
        <IpDeleteEquipmentDialog
          open={deleteEquipmentOpen}
          onOpenChange={(o) => {
            setDeleteEquipmentOpen(o);
            if (!o) setDeleteEquipmentMetric(null);
          }}
          studyId={studyId}
          itemId={deleteEquipmentMetric.item_id}
          itemName={deleteEquipmentMetric.item_name}
          onSuccess={refresh}
        />
      )}

      {studyId && restoreEquipmentMetric && (
        <IpRestoreEquipmentDialog
          open={restoreEquipmentOpen}
          onOpenChange={(o) => {
            setRestoreEquipmentOpen(o);
            if (!o) setRestoreEquipmentMetric(null);
          }}
          studyId={studyId}
          itemId={restoreEquipmentMetric.item_id}
          itemName={restoreEquipmentMetric.item_name}
          onSuccess={refresh}
        />
      )}

      {studyId && deleteSiteCtx && (
        <IpDeleteSiteDialog
          open={deleteSiteOpen}
          onOpenChange={(o) => {
            setDeleteSiteOpen(o);
            if (!o) setDeleteSiteCtx(null);
          }}
          studyId={studyId}
          itemId={deleteSiteCtx.item.item_id}
          studySiteId={deleteSiteCtx.site.study_site_id}
          siteLabel={siteMetricLabel(deleteSiteCtx.site)}
          initialOrderCount={deleteSiteCtx.site.order_count}
          onSuccess={refresh}
        />
      )}

      {studyId && restoreSiteCtx && (
        <IpRestoreSiteDialog
          open={restoreSiteOpen}
          onOpenChange={(o) => {
            setRestoreSiteOpen(o);
            if (!o) setRestoreSiteCtx(null);
          }}
          studyId={studyId}
          itemId={restoreSiteCtx.item.item_id}
          studySiteId={restoreSiteCtx.site.study_site_id}
          siteLabel={siteMetricLabel(restoreSiteCtx.site)}
          initialOrderCount={restoreSiteCtx.site.order_count}
          onSuccess={refresh}
        />
      )}

      {studyId && (
        <IpLotHistoryDialog
          open={lotHistoryOpen}
          onOpenChange={setLotHistoryOpen}
          studyId={studyId}
          lotId={lotHistoryLotId}
          title={lotHistoryTitle}
        />
      )}

      <IpReceiveInventoryDialog
        open={receiveOpen}
        onOpenChange={(o) => {
          setReceiveOpen(o);
          if (!o) setMovementLine(null);
        }}
        line={movementLine}
        onSuccess={afterMutation}
      />

      <IpUnreceiveInventoryDialog
        open={unreceiveOpen}
        onOpenChange={(o) => {
          setUnreceiveOpen(o);
          if (!o) setMovementLine(null);
        }}
        line={movementLine}
        onSuccess={afterMutation}
      />

      <IpReturnToManufacturerDialog
        open={returnMfrOpen}
        onOpenChange={(o) => {
          setReturnMfrOpen(o);
          if (!o) setMovementLine(null);
        }}
        line={movementLine}
        onSuccess={afterMutation}
      />

      <IpTransferSiteDialog
        open={transferOpen}
        onOpenChange={(o) => {
          setTransferOpen(o);
          if (!o) setMovementLine(null);
        }}
        line={movementLine}
        sites={siteTransferOptions}
        onSuccess={afterMutation}
      />

      <IpDestroyQuantityDialog
        open={destroyOpen}
        onOpenChange={(o) => {
          setDestroyOpen(o);
          if (!o) setMovementLine(null);
        }}
        line={movementLine}
        onSuccess={afterMutation}
      />

      <IpChangeDispositionDialog
        open={changeDispOpen}
        onOpenChange={(o) => {
          setChangeDispOpen(o);
          if (!o) setMovementLine(null);
        }}
        line={movementLine}
        isIpAdmin={isIpAdmin}
        subjects={subjectOptions}
        onSuccess={afterMutation}
      />

      <IpAddOrderDialog
        open={addOrderOpen}
        onOpenChange={(o) => {
          if (!o) setAddOrderCtx(null);
          setAddOrderOpen(o);
        }}
        studyId={studyId}
        itemId={addOrderCtx?.metric.item_id ?? ''}
        studySiteId={addOrderCtx?.studySiteId ?? ''}
        itemCategory={addOrderCtx ? asIpCategory(addOrderCtx.metric.category) : undefined}
        catalogUnit={addOrderCtx?.metric.unit}
        onSuccess={refresh}
      />

      <IpEditOrderDialog
        open={editOrderOpen}
        onOpenChange={(o) => {
          setEditOrderOpen(o);
          if (!o) setEditOrderData(null);
        }}
        order={editOrderData}
        onSuccess={refresh}
      />

      <IpArchiveOrderDialog
        open={archiveOrderOpen}
        onOpenChange={(o) => {
          setArchiveOrderOpen(o);
          if (!o) setArchiveOrderData(null);
        }}
        siteLabel={archiveOrderData ? formatSiteLabel(archiveOrderData.study_site_id) : ''}
        order={archiveOrderData}
        onSuccess={() => void bumpOrdersCache()}
      />

      <IpRestoreOrderDialog
        open={restoreOrderOpen}
        onOpenChange={(o) => {
          setRestoreOrderOpen(o);
          if (!o) setRestoreOrderData(null);
        }}
        siteLabel={restoreOrderData ? formatSiteLabel(restoreOrderData.study_site_id) : ''}
        order={restoreOrderData}
        onSuccess={() => void bumpOrdersCache()}
      />

      <IpLogsVerifyInventoryDialog
        open={verifyOpen}
        onOpenChange={(o) => {
          setVerifyOpen(o);
          if (!o) setVerifyTarget(null);
        }}
        studyId={studyId}
        target={verifyTarget}
        onSuccess={async () => {
          await bumpOrdersCache();
        }}
      />

      <IpUnverifyInventoryDialog
        open={unverifyOpen}
        onOpenChange={(o) => {
          setUnverifyOpen(o);
          if (!o) setUnverifyTarget(null);
        }}
        studyId={studyId}
        target={unverifyTarget}
        onSuccess={async () => {
          await bumpOrdersCache();
        }}
      />

      {shippingDocsCtx && (
        <IpOrderShippingDocumentsDialog
          open={shippingDocsOpen}
          onOpenChange={(o) => {
            setShippingDocsOpen(o);
            if (!o) setShippingDocsCtx(null);
          }}
          studyId={shippingDocsCtx.studyId}
          orderId={shippingDocsCtx.orderId}
          contextLabel={shippingDocsCtx.contextLabel}
          canUpload={shippingDocsCtx.canUpload}
          onSuccess={() => void bumpOrdersCache()}
        />
      )}

    </div>
  );
}
