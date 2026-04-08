'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Loader2, MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { IpItemSiteMetricRow, IpOrderRow, IpStudyMetricRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, IP_DISPOSITION_LABELS, type IpCategory, type IpDisposition } from '@/lib/types/ip-management';
import { getIpItemSiteMetrics, getIpSiteOrders } from '@/lib/actions/ip-management';
import { cn } from '@/lib/utils';
import { getSummaryOrderMenuFlags } from '@/lib/utils/ip-order-actions';
import type { IpInventoryUiContext } from '@/lib/utils/ip-inventory-ui-copy';
import { getIpInventorySummaryCopy } from '@/lib/utils/ip-inventory-ui-copy';
import { labelContainerFillState } from '@/lib/utils/ip-container-fill-state';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function expiryStatus(dateStr: string | null): 'expired' | 'near' | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return 'expired';
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  if (d <= thirtyDays) return 'near';
  return null;
}

function formatIpOrderSentDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'dd-MMM-yyyy', { locale: enUS });
  } catch {
    return null;
  }
}

function formatIpLotExpiryDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return format(parseISO(`${dateStr}T00:00:00`), 'dd-MMM-yyyy', { locale: enUS });
  } catch {
    return null;
  }
}

interface IpSummaryTableProps {
  studyId: string;
  metrics: IpStudyMetricRow[];
  /** When true, rows are archived catalog items (restore flow). */
  archivedView?: boolean;
  /** When true, site rows under each item are archived links (restore site flow). */
  archivedSitesView?: boolean;
  /** When true, expanded sites load archived orders only (restore order flow). */
  showArchivedOrders?: boolean;
  /** Bumps when site order lists should refetch (e.g. after archive/restore). */
  ordersRefreshNonce?: number;
  /** Bumps after linking a catalog item to a study site; paired with siteLinksItemId. */
  siteLinksRefreshNonce?: number;
  /** Item whose site list should refetch when siteLinksRefreshNonce changes. */
  siteLinksItemId?: string | null;
  onEditInventory?: (metric: IpStudyMetricRow) => void;
  onDeleteEquipment?: (metric: IpStudyMetricRow) => void;
  onRestoreEquipment?: (metric: IpStudyMetricRow) => void;
  onAddSite?: (metric: IpStudyMetricRow) => void;
  onViewTransactions?: (itemId: string, siteId?: string) => void;
  onAddOrder?: (metric: IpStudyMetricRow, studySiteId: string) => void;
  onEditOrder?: (order: IpOrderRow) => void;
  onDeleteOrder?: (order: IpOrderRow) => void;
  onVerifyOrder?: (order: IpOrderRow) => void;
  onUnverifyOrder?: (order: IpOrderRow) => void;
  onRestoreOrder?: (order: IpOrderRow) => void;
  isIpAdmin?: boolean;
  onViewOrderTransactions?: (order: IpOrderRow) => void;
  onReceiveInventory?: (order: IpOrderRow) => void;
  onReverseReceipt?: (order: IpOrderRow) => void;
  onReturnToManufacturer?: (order: IpOrderRow) => void;
  onTransferOrder?: (order: IpOrderRow) => void;
  onDestroyOrderLine?: (order: IpOrderRow) => void;
  onChangeDisposition?: (order: IpOrderRow) => void;
  onDeleteSite?: (item: IpStudyMetricRow, site: IpItemSiteMetricRow) => void;
  onRestoreSite?: (item: IpStudyMetricRow, site: IpItemSiteMetricRow) => void;
  onViewLotHistory?: (lotId: string, label?: string) => void;
  onShippingDocuments?: (order: IpOrderRow) => void;
  /** Drives labels for investigational drug vs device vs mixed category views. */
  uiContext?: IpInventoryUiContext;
  className?: string;
}

export function IpSummaryTable({
  studyId,
  metrics,
  archivedView = false,
  archivedSitesView = false,
  showArchivedOrders = false,
  ordersRefreshNonce = 0,
  siteLinksRefreshNonce = 0,
  siteLinksItemId = null,
  onEditInventory,
  onDeleteEquipment,
  onRestoreEquipment,
  onAddSite,
  onViewTransactions,
  onAddOrder,
  onEditOrder,
  onDeleteOrder,
  onVerifyOrder,
  onUnverifyOrder,
  onRestoreOrder,
  isIpAdmin = false,
  onViewOrderTransactions,
  onReceiveInventory,
  onReverseReceipt,
  onReturnToManufacturer,
  onTransferOrder,
  onDestroyOrderLine,
  onChangeDisposition,
  onDeleteSite,
  onRestoreSite,
  onViewLotHistory,
  onShippingDocuments,
  uiContext = 'neutral',
  className,
}: IpSummaryTableProps) {
  const summaryCopy = useMemo(() => getIpInventorySummaryCopy(uiContext), [uiContext]);
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set());
  const [openSites, setOpenSites] = useState<Map<string, Set<string>>>(() => new Map());
  const [siteMetrics, setSiteMetrics] = useState<Map<string, IpItemSiteMetricRow[]>>(() => new Map());
  const [siteOrders, setSiteOrders] = useState<Map<string, IpOrderRow[]>>(() => new Map());
  const [loadingItems, setLoadingItems] = useState<Set<string>>(() => new Set());
  const [loadingSites, setLoadingSites] = useState<Set<string>>(() => new Set());

  const toggleItem = useCallback(async (itemId: string) => {
    setOpenItems((prev) => {
      const n = new Set(prev);
      if (n.has(itemId)) {
        n.delete(itemId);
      } else {
        n.add(itemId);
      }
      return n;
    });

    if (!siteMetrics.has(itemId)) {
      setLoadingItems((prev) => new Set(prev).add(itemId));
      try {
        const data = await getIpItemSiteMetrics({ studyId, itemId, includeArchived: archivedSitesView });
        setSiteMetrics((prev) => new Map(prev).set(itemId, data));
      } catch {
        /* fail silently */
      } finally {
        setLoadingItems((prev) => {
          const n = new Set(prev);
          n.delete(itemId);
          return n;
        });
      }
    }
  }, [studyId, siteMetrics, archivedSitesView]);

  const toggleSite = useCallback(async (itemId: string, siteId: string) => {
    const key = `${itemId}::${siteId}`;
    setOpenSites((prev) => {
      const n = new Map(prev);
      const set = new Set(n.get(itemId) ?? []);
      if (set.has(siteId)) {
        set.delete(siteId);
      } else {
        set.add(siteId);
      }
      n.set(itemId, set);
      return n;
    });

    if (!siteOrders.has(key)) {
      setLoadingSites((prev) => new Set(prev).add(key));
      try {
        const data = await getIpSiteOrders({
          studyId,
          itemId,
          studySiteId: siteId,
          includeArchived: showArchivedOrders,
        });
        setSiteOrders((prev) => new Map(prev).set(key, data));
      } catch {
        /* fail silently */
      } finally {
        setLoadingSites((prev) => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
      }
    }
  }, [studyId, siteOrders, showArchivedOrders]);

  const refreshItem = useCallback(async (itemId: string) => {
    try {
      const data = await getIpItemSiteMetrics({ studyId, itemId, includeArchived: archivedSitesView });
      setSiteMetrics((prev) => new Map(prev).set(itemId, data));
    } catch { /* */ }
  }, [studyId, archivedSitesView]);

  const refreshSiteOrders = useCallback(
    async (itemId: string, siteId: string) => {
      const key = `${itemId}::${siteId}`;
      try {
        const data = await getIpSiteOrders({
          studyId,
          itemId,
          studySiteId: siteId,
          includeArchived: showArchivedOrders,
        });
        setSiteOrders((prev) => new Map(prev).set(key, data));
      } catch {
        /* */
      }
    },
    [studyId, showArchivedOrders]
  );

  const openItemsRef = useRef(openItems);
  openItemsRef.current = openItems;
  const openSitesRef = useRef(openSites);
  openSitesRef.current = openSites;

  const metricsSyncKey = useMemo(
    () =>
      metrics
        .map(
          (m) =>
            `${m.item_id}:${m.global_in_stock}:${m.global_sent}:${m.site_onsite}:${m.site_available}:${m.site_shipments}:${m.associated_sites ?? 0}`
        )
        .join('|'),
    [metrics]
  );

  const siteMetricsSyncKey = useMemo(
    () =>
      `${metricsSyncKey}|sites:${archivedSitesView ? '1' : '0'}|ord:${ordersRefreshNonce}`,
    [metricsSyncKey, archivedSitesView, ordersRefreshNonce]
  );

  useEffect(() => {
    for (const itemId of openItemsRef.current) {
      void refreshItem(itemId);
      const sites = openSitesRef.current.get(itemId);
      if (sites) {
        for (const siteId of sites) {
          void refreshSiteOrders(itemId, siteId);
        }
      }
    }
  }, [siteMetricsSyncKey, refreshItem, refreshSiteOrders]);

  useEffect(() => {
    const map = openSitesRef.current;
    const sitesToLoad: { itemId: string; siteId: string; key: string }[] = [];
    map.forEach((set, itemId) => {
      for (const siteId of set) {
        sitesToLoad.push({ itemId, siteId, key: `${itemId}::${siteId}` });
      }
    });
    // Always invalidate cached order rows when study, archive mode, or refresh nonce changes so
    // re-expanding a site (after collapse) refetches instead of reusing stale data.
    setSiteOrders(new Map());
    if (sitesToLoad.length === 0) return;
    for (const { itemId, siteId, key } of sitesToLoad) {
      setLoadingSites((p) => new Set(p).add(key));
      void getIpSiteOrders({
        studyId,
        itemId,
        studySiteId: siteId,
        includeArchived: showArchivedOrders,
      })
        .then((data) => setSiteOrders((p) => new Map(p).set(key, data)))
        .catch(() => {})
        .finally(() =>
          setLoadingSites((p) => {
            const n = new Set(p);
            n.delete(key);
            return n;
          })
        );
    }
  }, [showArchivedOrders, ordersRefreshNonce, studyId]);

  useEffect(() => {
    if (siteLinksRefreshNonce === 0 || !siteLinksItemId) return;
    void refreshItem(siteLinksItemId);
  }, [siteLinksRefreshNonce, siteLinksItemId, refreshItem]);

  return (
    <TooltipProvider>
    <div className={cn('rounded-md border overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead rowSpan={2} className="align-bottom w-10" />
            <TableHead rowSpan={2} className="align-bottom min-w-[160px]">
              Item
            </TableHead>
            <TableHead rowSpan={2} className="align-bottom">
              Category
            </TableHead>
            <TableHead rowSpan={2} className="align-bottom">
              Unit
            </TableHead>
            <TableHead colSpan={3} className="text-center border-l">
              Global inventory
            </TableHead>
            <TableHead colSpan={7} className="text-center border-l">
              Site inventory
            </TableHead>
            <TableHead rowSpan={2} className="w-12" />
          </TableRow>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-center border-l text-xs font-medium">In stock</TableHead>
            <TableHead className="text-center text-xs font-medium">Sent</TableHead>
            <TableHead className="text-center text-xs font-medium">Returns</TableHead>
            <TableHead className="text-center border-l text-xs font-medium p-0">
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="w-full h-10 px-2 inline-flex items-center justify-center cursor-help underline decoration-dotted decoration-muted-foreground underline-offset-2"
                >
                  Received
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-left">
                  Units physically received at sites (inventory ledger: received_at_site).
                </TooltipContent>
              </Tooltip>
            </TableHead>
            <TableHead className="text-center text-xs font-medium">Returned</TableHead>
            <TableHead className="text-center text-xs font-medium p-0">
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="w-full h-10 px-2 inline-flex items-center justify-center cursor-help underline decoration-dotted decoration-muted-foreground underline-offset-2"
                >
                  {summaryCopy.usedHeader}
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-left">
                  {summaryCopy.usedTooltip}
                </TooltipContent>
              </Tooltip>
            </TableHead>
            <TableHead className="text-center text-xs font-medium">Transfers</TableHead>
            <TableHead className="text-center text-xs font-medium">Destroyed</TableHead>
            <TableHead className="text-center text-xs font-medium">Onsite</TableHead>
            <TableHead className="text-center text-xs font-medium">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.length === 0 ? (
            <TableRow className="h-auto hover:bg-transparent">
              <TableCell
                colSpan={15}
                className="text-center py-12 align-middle whitespace-normal break-words"
              >
                {archivedView ? (
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto px-4">
                    {summaryCopy.archivedEmpty}
                  </p>
                ) : (
                  <div className="mx-auto max-w-lg space-y-2 px-4 text-pretty">
                    <p className="text-sm font-medium text-foreground">No inventory catalog for this study yet</p>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-normal">
                      Use <span className="font-medium text-foreground">Add inventory</span> above to create a
                      catalog entry and receive your first quantity into the central pool. After that you can link
                      study sites, ship stock, and track movements on the{' '}
                      <span className="font-medium text-foreground">Inventory logs</span> tab.
                    </p>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            metrics.map((m) => {
              const itemOpen = openItems.has(m.item_id);
              const sites = siteMetrics.get(m.item_id) ?? [];
              const itemLoading = loadingItems.has(m.item_id);
              const distinctSites = itemOpen ? sites.length : (m.associated_sites ?? 0);

              return (
                <Fragment key={m.item_id}>
                  {/* Level 1: Item row */}
                  <TableRow
                    className={cn('bg-primary/5', archivedView && 'opacity-80 bg-muted/40')}
                    data-state={itemOpen ? 'open' : undefined}
                  >
                    <TableCell className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void toggleItem(m.item_id)}
                        aria-expanded={itemOpen}
                      >
                        {itemLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : itemOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{m.item_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <span>Associated sites: {distinctSites}</span>
                        {m.min_stock_threshold != null &&
                          m.global_in_stock + m.site_onsite < m.min_stock_threshold && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] px-1.5 py-0">
                            Low stock
                          </Badge>
                        )}
                        {m.compliance_pct != null && (
                          <span className="tabular-nums">
                            Compliance: {Math.round(m.compliance_pct)}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {IP_CATEGORY_LABELS[m.category as IpCategory] ?? m.category}
                    </TableCell>
                    <TableCell className="text-sm">{m.unit}</TableCell>
                    <TableCell className="text-center border-l tabular-nums">{m.global_in_stock}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.global_sent}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.global_returns}</TableCell>
                    <TableCell className="text-center border-l tabular-nums">{m.site_shipments}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_returned}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_used}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_transfers}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_destroyed}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_onsite}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_available}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                            'h-8 w-8 shrink-0'
                          )}
                          aria-label="Row actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onViewTransactions && (
                            <DropdownMenuItem onClick={() => onViewTransactions(m.item_id)}>
                              View transactions
                            </DropdownMenuItem>
                          )}
                          {!archivedView && onEditInventory && (
                            <DropdownMenuItem onClick={() => onEditInventory(m)}>Edit inventory</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => void toggleItem(m.item_id)}>
                            {itemOpen ? 'Collapse sites' : 'Expand sites'}
                          </DropdownMenuItem>
                          {!archivedView && onAddSite && (
                            <DropdownMenuItem onClick={() => onAddSite(m)}>Add site</DropdownMenuItem>
                          )}
                          {!archivedView && onDeleteEquipment && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDeleteEquipment(m)}
                            >
                              {summaryCopy.deleteCatalog}
                            </DropdownMenuItem>
                          )}
                          {archivedView && onRestoreEquipment && (
                            <DropdownMenuItem onClick={() => onRestoreEquipment(m)}>
                              {summaryCopy.restoreCatalog}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {/* Level 2: Site rows */}
                  {itemOpen && sites.map((site) => {
                    const siteOpen = openSites.get(m.item_id)?.has(site.study_site_id) ?? false;
                    const orderKey = `${m.item_id}::${site.study_site_id}`;
                    const orders = siteOrders.get(orderKey) ?? [];
                    const siteLoading = loadingSites.has(orderKey);
                    const siteLabel = site.site_number && site.site_name
                      ? `${site.site_number} — ${site.site_name}`
                      : site.site_name || 'Site';

                    return (
                      <Fragment key={`${m.item_id}-site-${site.study_site_id}`}>
                        <TableRow className={cn('bg-muted/10', archivedSitesView && 'opacity-80 bg-muted/20')}>
                          <TableCell className="p-1 pl-6">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => void toggleSite(m.item_id, site.study_site_id)}
                              aria-expanded={siteOpen}
                            >
                              {siteLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : siteOpen ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell colSpan={3} className="pl-8 text-sm font-medium">
                            {siteLabel}
                            <div className="text-xs font-normal text-muted-foreground">
                              Associated orders: {site.order_count}
                            </div>
                          </TableCell>
                          <TableCell className="text-center border-l tabular-nums">{site.global_in_stock}</TableCell>
                          <TableCell className="text-center tabular-nums">{site.global_sent}</TableCell>
                          <TableCell className="text-center tabular-nums">{site.global_returns}</TableCell>
                          <TableCell className="text-center border-l tabular-nums">{site.site_shipments}</TableCell>
                          <TableCell className="text-center tabular-nums">{site.site_returned}</TableCell>
                          <TableCell className="text-center tabular-nums">{site.site_used}</TableCell>
                          <TableCell className="text-center tabular-nums">{site.site_transfers}</TableCell>
                          <TableCell className="text-center tabular-nums">{site.site_destroyed}</TableCell>
                          <TableCell className="text-center tabular-nums font-medium">{site.site_onsite}</TableCell>
                          <TableCell className="text-center tabular-nums font-medium">{site.site_available}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className={cn(
                                  buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                                  'h-8 w-8 shrink-0'
                                )}
                                aria-label="Site actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onViewTransactions && (
                                  <DropdownMenuItem onClick={() => onViewTransactions(m.item_id, site.study_site_id)}>
                                    View transactions
                                  </DropdownMenuItem>
                                )}
                                {!archivedView && !archivedSitesView && onAddOrder && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onAddOrder(m, site.study_site_id)}>
                                      Add order
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {!archivedView && !archivedSitesView && onDeleteSite && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => onDeleteSite(m, site)}
                                    >
                                      Delete site
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {archivedSitesView && !archivedView && onRestoreSite && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onRestoreSite(m, site)}>
                                      Restore site
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {/* Level 3: Order/Lot rows */}
                        {siteOpen &&
                          orders.map((order) => {
                            const activeOrderMode =
                              !archivedView && !archivedSitesView && !showArchivedOrders;
                            const menu = getSummaryOrderMenuFlags(order, {
                              isIpAdmin,
                              activeOrderMode,
                              archivedOrdersView: showArchivedOrders,
                            });
                            const sentLabel = formatIpOrderSentDate(order.sent_at);
                            const expiryLabel = formatIpLotExpiryDate(order.expiry_date);

                            return (
                              <TableRow key={order.order_id} className="bg-muted/20">
                                <TableCell />
                                <TableCell colSpan={3} className="pl-14 text-sm">
                                  <div className="text-muted-foreground">
                                    {uiContext === 'ip_drug' ? (
                                      <>
                                        {[
                                          order.lot_number ? `Lot: ${order.lot_number}` : null,
                                          expiryLabel ? `Expiry: ${expiryLabel}` : null,
                                          order.serial_number ? `Serial: ${order.serial_number}` : null,
                                        ]
                                          .filter(Boolean)
                                          .join(' · ') || 'No lot, expiry, or serial'}
                                      </>
                                    ) : (
                                      <>
                                        {order.serial_number ? `Serial: ${order.serial_number}` : ''}
                                        {order.serial_number && order.lot_number ? ' · ' : ''}
                                        {order.lot_number ? `Lot: ${order.lot_number}` : ''}
                                        {!order.serial_number && !order.lot_number ? 'No lot/serial' : ''}
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="text-xs">
                                      {IP_DISPOSITION_LABELS[order.disposition as IpDisposition] ?? order.disposition}
                                    </Badge>
                                    {order.order_reference && (
                                      <span className="text-xs text-muted-foreground">
                                        Ref: {order.order_reference}
                                      </span>
                                    )}
                                    {sentLabel && (
                                      <span className="text-xs text-muted-foreground">Sent: {sentLabel}</span>
                                    )}
                                    {(() => {
                                      const es = expiryStatus(order.expiry_date);
                                      if (es === 'expired')
                                        return (
                                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                            Expired
                                          </Badge>
                                        );
                                      if (es === 'near')
                                        return (
                                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] px-1.5 py-0">
                                            Expires soon
                                          </Badge>
                                        );
                                      return null;
                                    })()}
                                  </div>
                                  {order.category === 'investigational_drug' ? (
                                    (() => {
                                      const d = labelContainerFillState(order.latest_dispense_container_fill_state);
                                      const ret = labelContainerFillState(order.latest_return_container_fill_state);
                                      const des = labelContainerFillState(order.latest_destroy_container_fill_state);
                                      if (!d && !ret && !des) return null;
                                      return (
                                        <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                                          {d ? <div>Latest dispense container: {d}</div> : null}
                                          {ret ? <div>Latest return container: {ret}</div> : null}
                                          {des ? <div>Latest destroy container: {des}</div> : null}
                                        </div>
                                      );
                                    })()
                                  ) : null}
                                </TableCell>
                                <TableCell className="text-center border-l text-muted-foreground">—</TableCell>
                                <TableCell className="text-center text-muted-foreground">—</TableCell>
                                <TableCell className="text-center text-muted-foreground">—</TableCell>
                                <TableCell className="text-center border-l tabular-nums">
                                  {order.operator_received_qty}
                                </TableCell>
                                <TableCell className="text-center tabular-nums">{order.disposition === 'returned' ? 1 : 0}</TableCell>
                                <TableCell className="text-center tabular-nums">{order.disposition === 'used' ? 1 : 0}</TableCell>
                                <TableCell className="text-center tabular-nums">{order.disposition === 'transferred' ? 1 : 0}</TableCell>
                                <TableCell className="text-center tabular-nums">{order.disposition === 'destroyed' ? 1 : 0}</TableCell>
                                <TableCell className="text-center tabular-nums">{order.quantity_on_hand}</TableCell>
                                <TableCell className="text-center tabular-nums">{order.quantity_available}</TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      className={cn(
                                        buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                                        'h-8 w-8 shrink-0'
                                      )}
                                      aria-label="Order actions"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-[12rem]">
                                      {menu.showViewTransactions && onViewOrderTransactions && (
                                        <DropdownMenuItem onClick={() => onViewOrderTransactions(order)}>
                                          View transactions
                                        </DropdownMenuItem>
                                      )}
                                      {onViewLotHistory && order.lot_id && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            onViewLotHistory(
                                              order.lot_id,
                                              uiContext === 'ip_drug'
                                                ? order.lot_number
                                                  ? `Lot ${order.lot_number}`
                                                  : order.serial_number
                                                    ? `Serial ${order.serial_number}`
                                                    : order.item_name
                                                : order.serial_number
                                                  ? `Serial ${order.serial_number}`
                                                  : order.lot_number
                                                    ? `Lot ${order.lot_number}`
                                                    : order.item_name
                                            )
                                          }
                                        >
                                          View history
                                        </DropdownMenuItem>
                                      )}
                                      {onShippingDocuments && (
                                        <DropdownMenuItem onClick={() => onShippingDocuments(order)}>
                                          Shipping documents
                                        </DropdownMenuItem>
                                      )}
                                      {menu.showEditOrder && onEditOrder && (
                                        <DropdownMenuItem onClick={() => onEditOrder(order)}>Edit order</DropdownMenuItem>
                                      )}
                                      {menu.showReceiveInventory && onReceiveInventory && (
                                        <DropdownMenuItem onClick={() => onReceiveInventory(order)}>
                                          Receive inventory
                                        </DropdownMenuItem>
                                      )}
                                      {menu.showReverseReceipt && onReverseReceipt && (
                                        <DropdownMenuItem onClick={() => onReverseReceipt(order)}>
                                          Reverse receipt
                                        </DropdownMenuItem>
                                      )}
                                      {menu.showVerifyInventory && onVerifyOrder && (
                                        <DropdownMenuItem onClick={() => onVerifyOrder(order)}>
                                          Verify inventory
                                        </DropdownMenuItem>
                                      )}
                                      {menu.showUnverifyInventory && onUnverifyOrder && (
                                        <DropdownMenuItem onClick={() => onUnverifyOrder(order)}>
                                          Remove verification
                                        </DropdownMenuItem>
                                      )}
                                      {(menu.showReturnToManufacturer ||
                                        menu.showTransfer ||
                                        menu.showDestroy) &&
                                        (onReturnToManufacturer ||
                                          onTransferOrder ||
                                          onDestroyOrderLine) && <DropdownMenuSeparator />}
                                      {menu.showReturnToManufacturer && onReturnToManufacturer && (
                                        <DropdownMenuItem onClick={() => onReturnToManufacturer(order)}>
                                          Returns
                                        </DropdownMenuItem>
                                      )}
                                      {menu.showTransfer && onTransferOrder && (
                                        <DropdownMenuItem onClick={() => onTransferOrder(order)}>
                                          Transfer
                                        </DropdownMenuItem>
                                      )}
                                      {menu.showDestroy && onDestroyOrderLine && (
                                        <DropdownMenuItem onClick={() => onDestroyOrderLine(order)}>
                                          Destroy quantity
                                        </DropdownMenuItem>
                                      )}
                                      {menu.showChangeDisposition && onChangeDisposition && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => onChangeDisposition(order)}>
                                            Change disposition
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {(menu.showDeleteOrder || menu.showRestoreOrder) && (
                                        <DropdownMenuSeparator />
                                      )}
                                      {menu.showDeleteOrder && onDeleteOrder && (
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => onDeleteOrder(order)}
                                        >
                                          Delete order
                                        </DropdownMenuItem>
                                      )}
                                      {menu.showRestoreOrder && onRestoreOrder && (
                                        <DropdownMenuItem onClick={() => onRestoreOrder(order)}>
                                          Restore order
                                        </DropdownMenuItem>
                                      )}
                                      {menu.showNoActionsDisabled && (
                                        <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}

                        {siteOpen && siteLoading && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={15} className="text-center py-3">
                              <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                              <span className="text-sm text-muted-foreground">Loading orders…</span>
                            </TableCell>
                          </TableRow>
                        )}

                        {siteOpen && !siteLoading && orders.length === 0 && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={15} className="text-center text-muted-foreground py-3 text-sm">
                              No orders at this site yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}

                  {itemOpen && itemLoading && (
                    <TableRow className="bg-muted/10">
                      <TableCell colSpan={15} className="text-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                        <span className="text-sm text-muted-foreground">Loading sites…</span>
                      </TableCell>
                    </TableRow>
                  )}

                  {itemOpen && !itemLoading && sites.length === 0 && (
                    <TableRow className="bg-muted/10">
                      <TableCell colSpan={15} className="text-center text-muted-foreground py-3 text-sm">
                        No sites linked to this item. Use &quot;Add site&quot; to associate one.
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  );
}
