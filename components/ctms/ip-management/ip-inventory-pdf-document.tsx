'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { IpLogRow } from '@/lib/types/ip-management';
import { IP_DISPOSITION_LABELS, type IpDisposition } from '@/lib/types/ip-management';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  title: { fontSize: 14, fontWeight: 700 },
  meta: { fontSize: 8, color: '#6b7280', marginTop: 4 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 4,
  },
  cellItem: { width: '22%' },
  cellLot: { width: '28%' },
  cellDisp: { width: '15%' },
  cellQty: { width: '10%', textAlign: 'right' as const },
  cellSite: { width: '25%' },
  th: { fontWeight: 700, fontSize: 8, color: '#374151' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#6b7280',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
});

export interface IpInventoryPdfData {
  studyLabel: string;
  printedAt: string;
  rows: IpLogRow[];
}

export function IpInventoryPdfDocument({
  data,
}: {
  data: IpInventoryPdfData;
}) {
  const chunks: IpLogRow[][] = [];
  const size = 24;
  for (let i = 0; i < data.rows.length; i += size) {
    chunks.push(data.rows.slice(i, i + size));
  }
  if (chunks.length === 0) chunks.push([]);

  return (
    <Document>
      {chunks.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="LETTER" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Inventory log</Text>
            <Text style={styles.meta}>{data.studyLabel}</Text>
            <Text style={styles.meta}>Printed {data.printedAt}</Text>
            <Text style={styles.meta}>
              Page {pageIndex + 1} of {chunks.length}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cellItem, styles.th]}>Item</Text>
            <Text style={[styles.cellLot, styles.th]}>Lot / serial</Text>
            <Text style={[styles.cellSite, styles.th]}>Site</Text>
            <Text style={[styles.cellDisp, styles.th]}>Disposition</Text>
            <Text style={[styles.cellQty, styles.th]}>Qty</Text>
          </View>
          {chunk.map((r) => (
            <View key={r.location_id} style={styles.row} wrap={false}>
              <Text style={styles.cellItem}>{r.item_name}</Text>
              <Text style={styles.cellLot}>
                {r.lot_number ?? '—'} {r.serial_number ? `/ ${r.serial_number}` : ''}
              </Text>
              <Text style={styles.cellSite}>
                {r.site_number ? `${r.site_number} — ` : ''}
                {r.site_name ?? ''}
              </Text>
              <Text style={styles.cellDisp}>
                {IP_DISPOSITION_LABELS[r.disposition as IpDisposition] ?? r.disposition}
              </Text>
              <Text style={styles.cellQty}>{r.quantity_on_hand}</Text>
            </View>
          ))}
          <View style={styles.footer} fixed>
            <Text>Investigational product</Text>
            <Text>Proprietary and confidential</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
