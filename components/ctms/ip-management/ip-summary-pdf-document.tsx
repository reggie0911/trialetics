'use client';

import React from 'react';
import { Document, Font, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { IpItemSiteMetricRow, IpOrderRow, IpStudyMetricRow } from '@/lib/types/ip-management';
import {
  IP_CATEGORY_LABELS,
  IP_DISPOSITION_LABELS,
  type IpCategory,
  type IpDisposition,
} from '@/lib/types/ip-management';

Font.register({
  family: 'Poppins',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrFJA.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7V1s.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 44,
    paddingHorizontal: 28,
    fontSize: 7,
    fontFamily: 'Poppins',
    color: '#111827',
  },
  header: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
  },
  title: { fontSize: 13, fontWeight: 700 },
  meta: { fontSize: 7, color: '#6b7280', marginTop: 3 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 3,
    alignItems: 'flex-start',
  },
  th: { fontWeight: 700, fontSize: 6, color: '#374151' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#6b7280',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 5,
  },
  cellItem: { width: '22%' },
  cellCat: { width: '12%' },
  cellUnit: { width: '7%' },
  cellNum: { width: '6.5%', textAlign: 'right' as const },
});

const ROWS_PER_PAGE = 16;

export interface IpSummaryPdfSiteBlock {
  site: IpItemSiteMetricRow;
  orders: IpOrderRow[];
}

export interface IpSummaryPdfItemBlock {
  metric: IpStudyMetricRow;
  sites: IpSummaryPdfSiteBlock[];
}

export interface IpSummaryPdfData {
  studyLabel: string;
  printedAt: string;
  siteScopeLabel?: string;
  categoryScopeLabel?: string;
  /** Top-level rollup rows (for backward compatibility). Prefer itemBlocks when set. */
  metrics: IpStudyMetricRow[];
  /** Expanded hierarchy: sites and orders under each item. When non-empty, replaces flat metrics rendering. */
  itemBlocks?: IpSummaryPdfItemBlock[];
  /** Match Inventory summary: hide global columns for site-only roles. */
  includeGlobalColumns: boolean;
}

function categoryLabel(cat: string): string {
  return IP_CATEGORY_LABELS[cat as IpCategory] ?? cat;
}

function formatExpiry(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return format(parseISO(`${dateStr}T00:00:00`), 'dd-MMM-yyyy', { locale: enUS });
  } catch {
    return null;
  }
}

function formatSent(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'dd-MMM-yyyy', { locale: enUS });
  } catch {
    return null;
  }
}

function siteLabel(site: IpItemSiteMetricRow): string {
  if (site.site_number && site.site_name) return `${site.site_number} — ${site.site_name}`;
  return site.site_name || 'Site';
}

function orderDescription(order: IpOrderRow): string {
  const isDrug = order.category === 'investigational_drug';
  const parts: string[] = [];
  if (isDrug) {
    if (order.lot_number) parts.push(`Lot: ${order.lot_number}`);
    const ex = formatExpiry(order.expiry_date);
    if (ex) parts.push(`Expiry: ${ex}`);
    if (order.serial_number) parts.push(`Serial: ${order.serial_number}`);
  } else {
    if (order.serial_number) parts.push(`Serial: ${order.serial_number}`);
    if (order.lot_number) parts.push(`Lot: ${order.lot_number}`);
  }
  const line1 = parts.length > 0 ? parts.join(' · ') : 'No lot/serial';
  const disp = IP_DISPOSITION_LABELS[order.disposition as IpDisposition] ?? order.disposition;
  const bits = [disp];
  if (order.order_reference) bits.push(`Ref: ${order.order_reference}`);
  const sent = formatSent(order.sent_at);
  if (sent) bits.push(`Sent: ${sent}`);
  return `${line1}\n${bits.join(' · ')}`;
}

type SummaryPdfLine =
  | { k: 'item'; m: IpStudyMetricRow }
  | { k: 'site'; site: IpItemSiteMetricRow }
  | { k: 'order'; order: IpOrderRow };

function buildLines(data: IpSummaryPdfData): SummaryPdfLine[] {
  if (data.itemBlocks && data.itemBlocks.length > 0) {
    const lines: SummaryPdfLine[] = [];
    for (const block of data.itemBlocks) {
      lines.push({ k: 'item', m: block.metric });
      for (const { site, orders } of block.sites) {
        lines.push({ k: 'site', site });
        for (const order of orders) {
          lines.push({ k: 'order', order });
        }
      }
    }
    return lines;
  }
  return data.metrics.map((m) => ({ k: 'item' as const, m }));
}

function NumCell({
  v,
  bold,
  muted,
}: {
  v: string | number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <Text
      style={[
        styles.cellNum,
        bold ? { fontWeight: 700 } : {},
        muted ? { color: '#9ca3af' } : {},
      ]}
    >
      {v}
    </Text>
  );
}

export function IpSummaryPdfDocument({ data }: { data: IpSummaryPdfData }) {
  const lines = buildLines(data);
  const showGlobal = data.includeGlobalColumns;

  const chunks: SummaryPdfLine[][] = [];
  for (let i = 0; i < lines.length; i += ROWS_PER_PAGE) {
    chunks.push(lines.slice(i, i + ROWS_PER_PAGE));
  }
  if (chunks.length === 0) chunks.push([]);

  const headerRow = (
    <View style={styles.row} wrap={false}>
      <Text style={[styles.cellItem, styles.th]}>Item / site / order</Text>
      <Text style={[styles.cellCat, styles.th]}>Category</Text>
      <Text style={[styles.cellUnit, styles.th]}>Unit</Text>
      {showGlobal ? (
        <>
          <Text style={[styles.cellNum, styles.th]}>G stock</Text>
          <Text style={[styles.cellNum, styles.th]}>G sent</Text>
          <Text style={[styles.cellNum, styles.th]}>G ret</Text>
        </>
      ) : null}
      <Text style={[styles.cellNum, styles.th]}>Rcvd</Text>
      <Text style={[styles.cellNum, styles.th]}>Used</Text>
      <Text style={[styles.cellNum, styles.th]}>Onsite</Text>
      <Text style={[styles.cellNum, styles.th]}>Avail</Text>
      <Text style={[styles.cellNum, styles.th]}>Sites</Text>
    </View>
  );

  const renderLine = (line: SummaryPdfLine, idx: number) => {
    if (line.k === 'item') {
      const m = line.m;
      return (
        <View key={`i-${m.item_id}-${idx}`} style={styles.row} wrap={false}>
          <View style={styles.cellItem}>
            <Text style={{ fontWeight: 700 }}>{m.item_name}</Text>
            <Text style={{ fontSize: 6, color: '#6b7280', marginTop: 2 }}>
              Associated sites: {m.associated_sites}
            </Text>
          </View>
          <Text style={[styles.cellCat]}>{categoryLabel(m.category)}</Text>
          <Text style={styles.cellUnit}>{m.unit}</Text>
          {showGlobal ? (
            <>
              <NumCell v={m.global_in_stock} bold />
              <NumCell v={m.global_sent} bold />
              <NumCell v={m.global_returns} bold />
            </>
          ) : null}
          <NumCell v={m.site_shipments} bold />
          <NumCell v={m.site_used} bold />
          <NumCell v={m.site_onsite} bold />
          <NumCell v={m.site_available} bold />
          <NumCell v={m.associated_sites} bold />
        </View>
      );
    }
    if (line.k === 'site') {
      const s = line.site;
      return (
        <View key={`s-${s.study_site_id}-${idx}`} style={styles.row} wrap={false}>
          <View style={styles.cellItem}>
            <Text style={{ fontWeight: 700, paddingLeft: 8 }}>{siteLabel(s)}</Text>
            <Text style={{ fontSize: 6, color: '#6b7280', marginTop: 2, paddingLeft: 8 }}>
              Associated orders: {s.order_count}
            </Text>
          </View>
          <Text style={[styles.cellCat, { color: '#9ca3af' }]}>—</Text>
          <Text style={[styles.cellUnit, { color: '#9ca3af' }]}>—</Text>
          {showGlobal ? (
            <>
              <NumCell v={s.global_in_stock} />
              <NumCell v={s.global_sent} />
              <NumCell v={s.global_returns} />
            </>
          ) : null}
          <NumCell v={s.site_shipments} />
          <NumCell v={s.site_used} />
          <NumCell v={s.site_onsite} />
          <NumCell v={s.site_available} />
          <NumCell v={s.order_count} />
        </View>
      );
    }
    const o = line.order;
    const dash = '—';
    return (
      <View key={`o-${o.order_id}-${idx}`} style={styles.row} wrap={false}>
        <View style={styles.cellItem}>
          <Text style={{ fontSize: 6.5, paddingLeft: 14, color: '#374151' }}>{orderDescription(o)}</Text>
        </View>
        <Text style={[styles.cellCat, { color: '#9ca3af' }]}>—</Text>
        <Text style={[styles.cellUnit, { color: '#9ca3af' }]}>—</Text>
        {showGlobal ? (
          <>
            <NumCell v={dash} muted />
            <NumCell v={dash} muted />
            <NumCell v={dash} muted />
          </>
        ) : null}
        <NumCell v={o.operator_received_qty} />
        <NumCell v={o.disposition === 'used' ? 1 : 0} />
        <NumCell v={o.quantity_on_hand} />
        <NumCell v={o.quantity_available} />
        <NumCell v={dash} muted />
      </View>
    );
  };

  return (
    <Document>
      {chunks.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="LETTER" orientation="landscape" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Inventory summary</Text>
            <Text style={styles.meta}>{data.studyLabel}</Text>
            {data.siteScopeLabel ? <Text style={styles.meta}>Site: {data.siteScopeLabel}</Text> : null}
            {data.categoryScopeLabel ? <Text style={styles.meta}>Category: {data.categoryScopeLabel}</Text> : null}
            <Text style={styles.meta}>Printed {data.printedAt}</Text>
            <Text style={styles.meta}>
              Page {pageIndex + 1} of {chunks.length}
            </Text>
          </View>
          {headerRow}
          {chunk.map((line, i) => renderLine(line, i))}
          <View style={styles.footer} fixed>
            <Text>Inventory management</Text>
            <Text>Proprietary and confidential</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
