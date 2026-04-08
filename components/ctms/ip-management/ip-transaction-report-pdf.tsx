'use client';

import React from 'react';
import { Document, Font, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { IpTransactionReportData } from '@/lib/types/ip-management';
import { labelContainerFillState } from '@/lib/utils/ip-container-fill-state';

Font.register({
  family: 'Poppins',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrFJA.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7V1s.ttf', fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: 'Poppins',
    color: '#111827',
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 4,
    marginBottom: 10,
  },
  reportTitle: { fontSize: 10, fontWeight: 700 },
  reportDate: { fontSize: 8, color: '#6b7280' },

  infoGrid: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 14,
  },
  infoCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  infoCellLast: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  infoLabel: { fontWeight: 700, fontSize: 8, textDecoration: 'underline', marginBottom: 4 },
  infoText: { fontSize: 7.5, lineHeight: 1.5 },
  infoBold: { fontWeight: 700, fontSize: 7.5 },

  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 3,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  colIndex: { width: '3%', textAlign: 'center' as const },
  colSerial: { width: '17%' },
  colCategory: { width: '11%' },
  colUnit: { width: '5%', textAlign: 'center' as const },
  colNum: { width: '5.8%', textAlign: 'center' as const },
  th: { fontWeight: 700, fontSize: 7, color: '#374151' },

  globalHeader: {
    textAlign: 'center' as const,
    fontWeight: 700,
    fontSize: 7,
    color: '#374151',
    width: '16.6%',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 2,
    marginBottom: 2,
  },
  siteHeader: {
    textAlign: 'center' as const,
    fontWeight: 700,
    fontSize: 7,
    color: '#374151',
    width: '46.4%',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 2,
    marginBottom: 2,
  },

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
    paddingTop: 4,
  },
  serialLotSub: { fontSize: 6, color: '#6b7280', marginTop: 1   },
});

function transactionRowContainerFillPdf(row: IpTransactionReportData['rows'][number]) {
  if (row.category !== 'investigational_drug') return null;
  const lines = [
    { k: 'd', title: 'Latest dispense', v: labelContainerFillState(row.latest_dispense_container_fill_state) },
    { k: 'r', title: 'Latest return', v: labelContainerFillState(row.latest_return_container_fill_state) },
    { k: 'x', title: 'Latest destroy', v: labelContainerFillState(row.latest_destroy_container_fill_state) },
  ];
  if (!lines.some((x) => x.v)) return null;
  return lines.map(({ k, title, v }) => (
    <Text key={k} style={s.serialLotSub}>
      {title}: {v}
    </Text>
  ));
}

export function IpTransactionReportPdf({ data }: { data: IpTransactionReportData }) {
  const chunks: IpTransactionReportData['rows'][] = [];
  const size = 22;
  for (let i = 0; i < data.rows.length; i += size) {
    chunks.push(data.rows.slice(i, i + size));
  }
  if (chunks.length === 0) chunks.push([]);

  return (
    <Document>
      {chunks.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="LETTER" orientation="landscape" style={s.page}>
          {/* Title bar */}
          <View style={s.titleBar}>
            <Text style={s.reportTitle}>Report Title: {data.reportTitle}</Text>
            <Text style={s.reportDate}>Report Run Date: {data.reportDate}</Text>
          </View>

          {/* Info grid */}
          {pageIndex === 0 && (
            <View style={s.infoGrid}>
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>Study Information:</Text>
                <Text style={s.infoText}>
                  <Text style={s.infoBold}>Sponsor Name: </Text>
                  {data.studyInfo.sponsorName ?? '—'}
                </Text>
                <Text style={s.infoText}>
                  <Text style={s.infoBold}>Study Name: </Text>
                  {data.studyInfo.studyName}
                </Text>
              </View>
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>Equipment Information:</Text>
                <Text style={s.infoText}>
                  <Text style={s.infoBold}>Equipment Name: </Text>
                  {data.equipmentInfo.equipmentName}
                </Text>
                <Text style={s.infoText}>
                  <Text style={s.infoBold}>Category: </Text>
                  {data.equipmentInfo.category}
                </Text>
                <Text style={s.infoText}>
                  <Text style={s.infoBold}>Part / Material Number: </Text>
                  {data.equipmentInfo.partOrMaterialNumber ?? '—'}
                </Text>
              </View>
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>Site Address:</Text>
                {data.siteInfo ? (
                  <>
                    <Text style={s.infoText}>{data.siteInfo.name}</Text>
                    {data.siteInfo.address && <Text style={s.infoText}>{data.siteInfo.address}</Text>}
                    {data.siteInfo.cityStateZip && <Text style={s.infoText}>{data.siteInfo.cityStateZip}</Text>}
                    {data.siteInfo.country && <Text style={s.infoText}>{data.siteInfo.country}</Text>}
                  </>
                ) : (
                  <Text style={s.infoText}>All sites</Text>
                )}
              </View>
              <View style={s.infoCellLast}>
                <Text style={s.infoLabel}>Principal Investigator</Text>
                <Text style={s.infoText}>
                  {data.siteInfo?.piName ? `${data.siteInfo.piName}, MD` : '—'}
                </Text>
              </View>
            </View>
          )}

          {/* Column group headers */}
          <View style={{ flexDirection: 'row', marginBottom: 0 }}>
            <View style={{ width: '36%' }} />
            <Text style={s.globalHeader}>GLOBAL INVENTORY</Text>
            <Text style={s.siteHeader}>SITE INVENTORY</Text>
          </View>

          {/* Table header */}
          <View style={s.tableHeaderRow}>
            <Text style={[s.colIndex, s.th]} />
            <Text style={[s.colSerial, s.th]}>Serial / Lot Number</Text>
            <Text style={[s.colCategory, s.th]}>Category</Text>
            <Text style={[s.colUnit, s.th]}>Unit</Text>
            <Text style={[s.colNum, s.th]}>In Stock</Text>
            <Text style={[s.colNum, s.th]}>Sent</Text>
            <Text style={[s.colNum, s.th]}>Shipments</Text>
            <Text style={[s.colNum, s.th]}>Returned</Text>
            <Text style={[s.colNum, s.th]}>Used</Text>
            <Text style={[s.colNum, s.th]}>Transfers</Text>
            <Text style={[s.colNum, s.th]}>Destroyed</Text>
            <Text style={[s.colNum, s.th]}>Onsite</Text>
            <Text style={[s.colNum, s.th]}>Available</Text>
          </View>

          {/* Summary row (first page only) */}
          {pageIndex === 0 && (
            <View style={s.summaryRow}>
              <Text style={[s.colIndex, { fontWeight: 700 }]} />
              <Text style={[s.colSerial, { fontWeight: 700, fontSize: 8 }]}>
                Orders: {data.summaryRow.orderCount}
              </Text>
              <Text style={[s.colCategory, { fontSize: 8 }]} />
              <Text style={[s.colUnit, { fontWeight: 700, fontSize: 8 }]}>
                {data.summaryRow.unit}
              </Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.summaryRow.global_in_stock}</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.summaryRow.global_sent}</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.summaryRow.site_shipments}</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.summaryRow.site_returned}</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.summaryRow.site_used}</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.summaryRow.site_transfers}</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.summaryRow.site_destroyed}</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.summaryRow.site_onsite}</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.summaryRow.site_available}</Text>
            </View>
          )}

          {/* Data rows */}
          {chunk.map((row, i) => {
            const globalIdx = pageIndex * size + i + 1;
            return (
              <View key={i} style={s.dataRow} wrap={false}>
                <Text style={s.colIndex}>{globalIdx}</Text>
                <View style={[s.colSerial, { flexDirection: 'column' }]}>
                  <Text style={{ fontWeight: 700, fontSize: 7.5 }}>
                    Serial Number: {row.serial_number ?? ''}
                  </Text>
                  <Text style={{ fontSize: 7.5 }}>
                    Lot Number: {row.lot_number ?? ''}
                  </Text>
                  {transactionRowContainerFillPdf(row)}
                </View>
                <Text style={s.colCategory}>{row.category}</Text>
                <Text style={s.colUnit}>{row.unit}</Text>
                <Text style={s.colNum} />
                <Text style={s.colNum} />
                <Text style={s.colNum}>0</Text>
                <Text style={s.colNum}>0</Text>
                <Text style={s.colNum}>0</Text>
                <Text style={s.colNum}>0</Text>
                <Text style={s.colNum}>0</Text>
                <Text style={s.colNum}>{row.quantity_on_hand}</Text>
                <Text style={s.colNum}>{row.quantity_available}</Text>
              </View>
            );
          })}

          {/* Footer */}
          <View style={s.footer} fixed>
            <Text>Inventory management</Text>
            <Text>Proprietary and confidential</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
