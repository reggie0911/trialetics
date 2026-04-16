'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, Loader2, Printer, Plus, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Study } from '@/lib/types/ctms';
import type {
  IpCategory,
  IpInTransitLineRow,
  IpItemSiteMetricRow,
  IpLogRow,
  IpOrderRow,
  IpStudyMetricRow,
} from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, IP_CATEGORY_ORDER } from '@/lib/types/ip-management';
import {
  getIpInTransitLines,
  getIpLogRows,
  getIpLotBreakdown,
  getIpReconciliationFlags,
  getIpStudyCatalogCategories,
  getIpStudyMetrics,
  getIpTransactionReportData,
  getIpItemSiteMetrics,
  getIpSiteOrders,
} from '@/lib/actions/ip-management';
import { getStudySites } from '@/lib/actions/sites';
import { getStudySubjects } from '@/lib/actions/subjects';
import { IpSummaryTable } from '@/components/ctms/ip-management/ip-summary-table';
import { IpSummaryCharts } from '@/components/ctms/ip-management/ip-summary-charts';
import { IpAnalyticsDashboard } from '@/components/ctms/ip-management/ip-analytics-dashboard';
import { IpLogsTable } from '@/components/ctms/ip-management/ip-logs-table';
import { IpLogsVerifyInventoryDialog } from '@/components/ctms/ip-management/ip-logs-verify-inventory-dialog';
import { IpUnverifyInventoryDialog } from '@/components/ctms/ip-management/ip-unverify-inventory-dialog';
import { IpReceiveInventoryDialog } from '@/components/ctms/ip-management/ip-receive-inventory-dialog';
import { IpUnreceiveInventoryDialog } from '@/components/ctms/ip-management/ip-unreceive-inventory-dialog';
import { IpReturnToManufacturerDialog } from '@/components/ctms/ip-management/ip-return-to-manufacturer-dialog';
import { IpTransferSiteDialog } from '@/components/ctms/ip-management/ip-transfer-site-dialog';
import { IpDestroyQuantityDialog } from '@/components/ctms/ip-management/ip-destroy-quantity-dialog';
import { IpChangeDispositionDialog } from '@/components/ctms/ip-management/ip-change-disposition-dialog';
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
import { IpBulkUploadDialog } from '@/components/ctms/ip-management/ip-bulk-upload-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  downloadIpInventoryLogPdf,
  downloadIpSummaryPdf,
  downloadIpTransactionReportPdf,
} from '@/lib/utils/ip-inventory-pdf';
import { buildAnalyticsCsv } from '@/lib/utils/ip-analytics-metrics';
import { triggerCsvDownload } from '@/lib/utils/csv-download';
import { getIpInventoryUiContext } from '@/lib/utils/ip-inventory-ui-copy';
import { ipLogRowToOrderRow } from '@/lib/utils/ip-log-row';
import {
  logRowToMovementContext,
  orderToMovementContext,
  type IpMovementLineContext,
} from '@/lib/utils/ip-order-actions';
import { cn } from '@/lib/utils';
import type { IpPermissions } from '@/lib/types/ip-access';
import { buildIpPermissions } from '@/lib/types/ip-access';
import { getIpPermissionsForStudy } from '@/lib/server/ip-access';

/** Fallback permissions used before a study is selected (no access). */
const NO_PERMISSIONS: IpPermissions = buildIpPermissions('site', []);

function asIpCategory(value: string): IpCategory | undefined {
  return Object.prototype.hasOwnProperty.call(IP_CATEGORY_LABELS, value) ? (value as IpCategory) : undefined;
}

/** Resolves select state when catalog categories are known (empty string = no selection). */
function resolveQueryCategoryFromCatalog(
  categoryState: string,
  catalog: IpCategory[]
): IpCategory | null {
  if (catalog.length === 0) return null;
  const c = asIpCategory(categoryState);
  if (c && catalog.includes(c)) return c;
  return catalog[0];
}

interface IpManagementPageClientProps {
  studies: Study[];
  profileRole: string;
  isPlatformAdmin: boolean;
  /** When opening from a study-scoped route, pre-select this study. */
  initialStudyId?: string;
}

export function IpManagementPageClient({
  studies,
  profileRole,
  isPlatformAdmin,
  initialStudyId,
}: IpManagementPageClientProps) {
  const { toast } = useToast();
  const [studyId, setStudyId] = useState<string>(() => {
    if (initialStudyId && studies.some((s) => s.id === initialStudyId)) return initialStudyId;
    return studies[0]?.id ?? '';
  });
  const [siteId, setSiteId] = useState<string>('__all_sites__');
  const [category, setCategory] = useState<string>('investigational_drug');
  const [tab, setTab] = useState<'summary' | 'logs' | 'analytics'>('summary');
  const [metrics, setMetrics] = useState<IpStudyMetricRow[]>([]);
  const [breakdown, setBreakdown] = useState<Awaited<ReturnType<typeof getIpLotBreakdown>>>([]);
  const [logRows, setLogRows] = useState<IpLogRow[]>([]);
  const [flags, setFlags] = useState<Awaited<ReturnType<typeof getIpReconciliationFlags>>>([]);
  const [inTransitLines, setInTransitLines] = useState<IpInTransitLineRow[]>([]);
  const [sites, setSites] = useState<Awaited<ReturnType<typeof getStudySites>>>([]);
  const [loading, setLoading] = useState(false);
  const [ipPermissions, setIpPermissions] = useState<IpPermissions>(NO_PERMISSIONS);

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
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
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
  const [catalogCategories, setCatalogCategories] = useState<IpCategory[] | null>(null);
  const [printing, setPrinting] = useState(false);
  /** When true, Toolbar Print waits for summary tree prefetch before calling window.print(). */
  const printAfterSummaryExpandRef = useRef(false);

  const handleSummaryExpandForPrintReady = useCallback(() => {
    if (!printAfterSummaryExpandRef.current) return;
    printAfterSummaryExpandRef.current = false;
    requestAnimationFrame(() => window.print());
  }, []);

  const metricsCategory: IpCategory | null = useMemo(() => {
    if (!studyId) return null;
    if (catalogCategories === null) return null;
    if (catalogCategories.length === 0) return null;
    const c = asIpCategory(category);
    if (c && catalogCategories.includes(c)) return c;
    return catalogCategories[0];
  }, [studyId, catalogCategories, category]);

  /** Page filter for edit dialog and typed children; only undefined when no study / empty catalog. */
  const categoryFilter: IpCategory = metricsCategory ?? IP_CATEGORY_ORDER[0];
  const inventoryUiContext = useMemo(() => getIpInventoryUiContext(metricsCategory), [metricsCategory]);
  /** Edit inventory keeps category aligned with the page filter; Add inventory allows any standard category. */
  const pageCategoryFilterLocked = true;
  const siteFilter = siteId === '__all_sites__' ? null : siteId;

  const refresh = useCallback(async () => {
    if (!studyId) {
      setMetrics([]);
      setBreakdown([]);
      setLogRows([]);
      setFlags([]);
      setInTransitLines([]);
      setCatalogCategories(null);
      return;
    }
    setLoading(true);
    try {
      const cats = await getIpStudyCatalogCategories(studyId);
      setCatalogCategories(cats);
      const queryCategory = resolveQueryCategoryFromCatalog(category, cats);
      const [m, b, lr, fl, transit] = await Promise.all([
        getIpStudyMetrics({
          studyId,
          siteId: siteFilter,
          category: queryCategory,
          includeArchived: false,
        }),
        getIpLotBreakdown({ studyId, siteId: siteFilter, category: queryCategory }),
        getIpLogRows({
          studyId,
          siteId: siteFilter,
          category: queryCategory,
          disposition: null,
          includeArchivedOrders: false,
        }),
        getIpReconciliationFlags({ studyId, siteId: siteFilter }),
        getIpInTransitLines({ studyId, siteId: siteFilter }),
      ]);
      setMetrics(m);
      setBreakdown(b);
      setLogRows(lr);
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
  }, [studyId, siteFilter, category, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!studyId) {
      setCatalogCategories(null);
    }
  }, [studyId]);

  useEffect(() => {
    if (!studyId) {
      setIpPermissions(NO_PERMISSIONS);
      return;
    }
    let cancelled = false;
    getIpPermissionsForStudy(studyId)
      .then((p) => {
        if (cancelled) return;
        setIpPermissions(p);
        if (p.restrictedSiteIds && p.restrictedSiteIds.length > 0) {
          setSiteId(p.restrictedSiteIds[0]);
        }
      })
      .catch(() => { if (!cancelled) setIpPermissions(NO_PERMISSIONS); });
    return () => { cancelled = true; };
  }, [studyId]);

  useEffect(() => {
    if (!studyId || catalogCategories === null || catalogCategories.length === 0) return;
    const c = asIpCategory(category);
    if (!c || !catalogCategories.includes(c)) {
      setCategory(catalogCategories[0]);
    }
  }, [studyId, catalogCategories, category]);

  useEffect(() => {
    const onBeforePrint = () => setPrinting(true);
    const onAfterPrint = () => {
      printAfterSummaryExpandRef.current = false;
      setPrinting(false);
    };
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);

  /** If the user leaves the summary tab while we were waiting to expand it for print, print the current tab instead of hanging. */
  useEffect(() => {
    if (!printing || tab === 'summary' || !printAfterSummaryExpandRef.current) return;
    printAfterSummaryExpandRef.current = false;
    requestAnimationFrame(() => window.print());
  }, [tab, printing]);

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

  const printSiteLabel = useMemo(() => {
    if (!studyId) return '—';
    if (siteId === '__all_sites__') return 'All sites';
    const s = sites.find((x) => x.id === siteId);
    return s ? `${s.site_number} — ${s.name}` : 'All sites';
  }, [studyId, siteId, sites]);

  const printCategoryLabel = useMemo(() => {
    if (!studyId) return '—';
    return metricsCategory ? IP_CATEGORY_LABELS[metricsCategory] : 'All categories';
  }, [studyId, metricsCategory]);

  const inTransitQtyByLotSite = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of inTransitLines) {
      const k = `${line.lot_id}:${line.study_site_id}`;
      map.set(k, (map.get(k) ?? 0) + line.qty_in_transit);
    }
    return map;
  }, [inTransitLines]);

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

  const handlePrint = () => {
    if (tab === 'summary') {
      printAfterSummaryExpandRef.current = true;
      setPrinting(true);
      return;
    }
    setPrinting(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  const pdfScopeMeta = useMemo(
    () => ({
      siteScopeLabel: printSiteLabel,
      categoryScopeLabel: printCategoryLabel,
    }),
    [printSiteLabel, printCategoryLabel]
  );

  const handleDownloadInventoryLogPdf = async () => {
    if (!study) return;
    try {
      await downloadIpInventoryLogPdf({
        studyLabel: `${study.protocol_number} — ${study.title}`,
        printedAt: new Date().toLocaleString(),
        rows: logRows,
        ...pdfScopeMeta,
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

  const handleDownloadSummaryPdf = async () => {
    if (!study || !studyId) return;
    try {
      const itemBlocks = await Promise.all(
        metrics.map(async (m) => {
          const siteRows = await getIpItemSiteMetrics({
            studyId,
            itemId: m.item_id,
            includeArchived: false,
          });
          const sites = await Promise.all(
            siteRows.map(async (site) => ({
              site,
              orders: await getIpSiteOrders({
                studyId,
                itemId: m.item_id,
                studySiteId: site.study_site_id,
                includeArchived: false,
              }),
            }))
          );
          return { metric: m, sites };
        })
      );
      await downloadIpSummaryPdf({
        studyLabel: `${study.protocol_number} — ${study.title}`,
        printedAt: new Date().toLocaleString(),
        metrics,
        itemBlocks,
        includeGlobalColumns: ipPermissions.canViewGlobalInventory,
        ...pdfScopeMeta,
      });
      toast({ title: 'Summary PDF downloaded' });
    } catch (e) {
      toast({
        title: 'PDF failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadAnalyticsCsv = () => {
    if (!studyId) return;
    const csv = buildAnalyticsCsv(logRows);
    const safe = `${study?.protocol_number ?? 'study'}`.replace(/[^a-zA-Z0-9-]+/g, '-').slice(0, 40);
    triggerCsvDownload(`inventory-analytics-${safe}-${new Date().toISOString().split('T')[0]}.csv`, csv);
    toast({ title: 'CSV downloaded' });
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
    if (!ipPermissions.canDeleteRecords) return;
    setArchiveOrderData(order);
    setArchiveOrderOpen(true);
  };

  const openRestoreOrder = (order: IpOrderRow) => {
    if (!ipPermissions.canRestoreRecords) return;
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
    if (!ipPermissions.canUnverifyInventory) {
      toast({ title: 'Insufficient permissions', variant: 'destructive' });
      return;
    }
    setUnverifyTarget(order);
    setUnverifyOpen(true);
  };

  const openUnverifyFromLog = (row: IpLogRow) => {
    if (!ipPermissions.canUnverifyInventory) {
      toast({ title: 'Insufficient permissions', variant: 'destructive' });
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
    if (!ipPermissions.canUnreceiveInventory) {
      toast({ title: 'Insufficient permissions', variant: 'destructive' });
      return;
    }
    setMovementLine(orderToMovementContext(studyId, order));
    setUnreceiveOpen(true);
  };

  const openUnreceiveFromLog = (row: IpLogRow) => {
    if (!ipPermissions.canUnreceiveInventory) {
      toast({ title: 'Insufficient permissions', variant: 'destructive' });
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
    if (!ipPermissions.canDeleteRecords) {
      toast({ title: 'Insufficient permissions', variant: 'destructive' });
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
    if (!ipPermissions.canRestoreRecords) {
      toast({ title: 'Insufficient permissions', variant: 'destructive' });
      return;
    }
    const o = ipLogRowToOrderRow(row);
    if (!o) return;
    setRestoreOrderData(o);
    setRestoreOrderOpen(true);
  };

  const logsCategoryFooterLabel = useMemo(
    () => (metricsCategory ? IP_CATEGORY_LABELS[metricsCategory] : 'All categories'),
    [metricsCategory]
  );

  const categoryFilterOptions = useMemo(() => {
    if (catalogCategories === null || catalogCategories.length === 0) return [];
    return catalogCategories.map((value) => ({ value, label: IP_CATEGORY_LABELS[value] }));
  }, [catalogCategories]);

  const categorySelectValue =
    studyId && catalogCategories !== null && catalogCategories.length > 0
      ? (() => {
          const c = asIpCategory(category);
          return c && catalogCategories.includes(c) ? c : catalogCategories[0];
        })()
      : '';

  const categorySelectDisabled =
    !studyId || catalogCategories === null || catalogCategories.length === 0;

  const categoryEmptyHint = useMemo(() => {
    if (!studyId || catalogCategories === null) return null;
    if (catalogCategories.length === 0) {
      return 'No catalog categories yet. Use Add inventory to create an item and choose a category.';
    }
    return null;
  }, [studyId, catalogCategories]);

  return (
    <div className="p-6 space-y-6 print:p-4">
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Inventory summary, site logs, compliance oversight, and audit trail.
            </p>
          </div>
          <TooltipProvider delay={200}>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handlePrint}
                      aria-label="Print"
                    />
                  }
                >
                  <Printer className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Print this page</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={!studyId}
                      aria-label="Download reports"
                      className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
                    >
                      <FileDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[14rem]">
                      <DropdownMenuItem
                        disabled={logRows.length === 0}
                        onClick={() => void handleDownloadInventoryLogPdf()}
                      >
                        Inventory log (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={metrics.length === 0}
                        onClick={() => void handleDownloadSummaryPdf()}
                      >
                        Inventory summary (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={logRows.length === 0}
                        onClick={handleDownloadAnalyticsCsv}
                      >
                        Analytics data (CSV)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {!studyId
                    ? 'Select a study to download reports.'
                    : 'Download inventory log PDF, summary PDF, or analytics CSV for the current filters.'}
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[220px] space-y-1">
            <Label className="text-xs">Study</Label>
            <Select
              value={studyId}
              onValueChange={(v) => {
                setStudyId(v ?? '');
                setCatalogCategories(null);
              }}
            >
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
                  placeholder={ipPermissions.restrictedSiteIds ? 'Select site' : 'All sites'}
                  getDisplayLabel={(v) => {
                    if (v == null || v === '' || v === '__all_sites__') return ipPermissions.restrictedSiteIds ? 'Select site' : 'All sites';
                    const s = sites.find((x) => x.id === v);
                    return s ? `${s.site_number} — ${s.name}` : null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {!ipPermissions.restrictedSiteIds && (
                  <SelectItem value="__all_sites__" className="text-[12px]">
                    All sites
                  </SelectItem>
                )}
                {(ipPermissions.restrictedSiteIds
                  ? sites.filter((s) => ipPermissions.restrictedSiteIds!.includes(s.id))
                  : sites
                ).map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-[12px]">
                    {s.site_number} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] space-y-1">
            <Label className="text-xs">Category</Label>
            <Select
              value={categorySelectValue}
              onValueChange={setCategory}
              disabled={categorySelectDisabled}
            >
              <SelectTrigger className="text-[12px] h-9 min-w-[160px]">
                <SelectValue
                  placeholder={
                    catalogCategories !== null && catalogCategories.length === 0
                      ? 'No catalog categories yet'
                      : 'Category'
                  }
                  getDisplayLabel={(v) => {
                    if (v == null || v === '') return null;
                    const opt = categoryFilterOptions.find((o) => o.value === v);
                    return opt?.label ?? null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {categoryFilterOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-[12px]">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryEmptyHint ? (
              <p className="text-[11px] text-muted-foreground max-w-[280px] leading-snug">{categoryEmptyHint}</p>
            ) : null}
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

          <div className="hidden print:block border-b pb-3 mb-4">
            <h1 className="text-xl font-semibold">Inventory Management report</h1>
            <p className="text-sm text-muted-foreground">
              {study?.protocol_number} — {study?.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Site: {printSiteLabel}</p>
            <p className="text-sm text-muted-foreground">Category: {printCategoryLabel}</p>
            <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
              Printed {new Date().toLocaleString()}
            </p>
          </div>

          <Tabs
            tabsId="ip-management"
            value={tab}
            onValueChange={(v: string) => setTab(v as 'summary' | 'logs' | 'analytics')}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
              <TabsList>
                <TabsTrigger value="summary">Inventory summary</TabsTrigger>
                <TabsTrigger value="logs">Inventory logs</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              {ipPermissions.canAddInventory && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkUploadOpen(true)}
                    disabled={!studyId}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk upload
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setAddInventoryOpen(true)}
                    disabled={!studyId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add inventory
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="summary" className="space-y-4">
              <p className="text-center text-lg font-medium print:block hidden">Inventory summary</p>
              <IpSummaryCharts metrics={metrics} />
              <IpSummaryTable
                studyId={studyId}
                metrics={metrics}
                uiContext={inventoryUiContext}
                archivedView={false}
                archivedSitesView={false}
                showArchivedOrders={false}
                ordersRefreshNonce={ordersRefreshNonce}
                siteLinksRefreshNonce={siteLinksRefreshNonce}
                siteLinksItemId={siteLinksItemId}
                permissions={ipPermissions}
                onEditInventory={studyId && ipPermissions.canEditRecords ? openEditInventory : undefined}
                onDeleteEquipment={studyId && ipPermissions.canDeleteRecords ? openDeleteEquipment : undefined}
                onRestoreEquipment={undefined}
                onAddSite={studyId && ipPermissions.canEditRecords ? openAddSite : undefined}
                onViewTransactions={(itemId, siteId) => void handleViewTransactions(itemId, siteId)}
                onViewOrderTransactions={
                  studyId ? openViewOrderTransactions : undefined
                }
                onAddOrder={studyId && ipPermissions.canCreateShipments ? openAddOrder : undefined}
                onEditOrder={studyId && ipPermissions.canEditRecords ? openEditOrder : undefined}
                onReceiveInventory={studyId && ipPermissions.canReceiveInventory ? openReceiveFromOrder : undefined}
                onReverseReceipt={studyId && ipPermissions.canUnreceiveInventory ? openUnreceiveFromOrder : undefined}
                onReturnToManufacturer={studyId && ipPermissions.canUpdateDisposition ? openReturnFromOrder : undefined}
                onTransferOrder={studyId && ipPermissions.canUpdateDisposition ? openTransferFromOrder : undefined}
                onDestroyOrderLine={studyId && ipPermissions.canUpdateDisposition ? openDestroyFromOrder : undefined}
                onChangeDisposition={
                  studyId && ipPermissions.canChangeDisposition ? openChangeDispFromOrder : undefined
                }
                onDeleteOrder={
                  studyId && ipPermissions.canDeleteRecords ? openArchiveOrder : undefined
                }
                onVerifyOrder={studyId && ipPermissions.canVerifyInventory ? openVerifyFromOrder : undefined}
                onUnverifyOrder={studyId && ipPermissions.canUnverifyInventory ? openUnverifyFromOrder : undefined}
                onRestoreOrder={undefined}
                onDeleteSite={studyId ? openDeleteSite : undefined}
                onRestoreSite={undefined}
                onViewLotHistory={studyId ? openLotHistory : undefined}
                onShippingDocuments={studyId ? openShippingDocsFromOrder : undefined}
                expandForPrint={printing}
                onExpandForPrintReady={handleSummaryExpandForPrintReady}
              />
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <p className="text-center text-lg font-medium print:block hidden">Inventory logs</p>
              <IpLogsTable
                rows={logRows}
                expandForPrint={printing}
                categoryFooterLabel={logsCategoryFooterLabel}
                uiContext={inventoryUiContext}
                permissions={ipPermissions}
                inTransitQtyByLotSite={inTransitQtyByLotSite}
                onViewTransactions={(row) => void handleViewTransactions(row.item_id, row.study_site_id)}
                onViewLotHistory={studyId ? openLotHistory : undefined}
                onShippingDocuments={studyId ? openShippingDocsFromLog : undefined}
                onVerifyInventory={studyId && ipPermissions.canVerifyInventory ? openVerifyFromLog : undefined}
                onUnverifyInventory={studyId && ipPermissions.canUnverifyInventory ? openUnverifyFromLog : undefined}
                onDeleteOrder={studyId && ipPermissions.canDeleteRecords ? openDeleteLogOrder : undefined}
                onRestoreOrder={studyId && ipPermissions.canRestoreRecords ? openRestoreLogOrder : undefined}
                onReceiveInventory={studyId && ipPermissions.canReceiveInventory ? openReceiveFromLog : undefined}
                onReverseReceipt={studyId && ipPermissions.canUnreceiveInventory ? openUnreceiveFromLog : undefined}
                onReturnToManufacturer={studyId && ipPermissions.canUpdateDisposition ? openReturnFromLog : undefined}
                onTransfer={studyId && ipPermissions.canUpdateDisposition ? openTransferFromLog : undefined}
                onDestroy={studyId && ipPermissions.canUpdateDisposition ? openDestroyFromLog : undefined}
                onChangeDisposition={
                  studyId && ipPermissions.canChangeDisposition ? openChangeDispFromLog : undefined
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

            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <h2 className="text-lg font-semibold">Inventory analytics</h2>
              <IpAnalyticsDashboard
                metrics={metrics}
                logRows={logRows}
                flags={flags}
                breakdown={breakdown}
                inTransitLines={inTransitLines}
                loading={loading}
                categoryFilter={categoryFilter}
                uiContext={inventoryUiContext}
                studyName={study?.title}
                protocolNumber={study?.protocol_number}
              />
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
        pageCategoryFilterLocked={false}
        categoryFilter={metricsCategory}
        onSuccess={refresh}
      />

      <IpBulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        studyId={studyId}
        studyLabel={study ? `${study.protocol_number} — ${study.title}` : ''}
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
        permissions={ipPermissions}
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
        globalInStock={addOrderCtx?.metric.global_in_stock ?? 0}
        defaultContentsPerCatalogUnit={addOrderCtx?.metric.default_contents_per_catalog_unit ?? null}
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
