import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: 700 },
  meta: { fontSize: 8, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 12, marginBottom: 6, color: '#1f2937' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 3,
  },
  cellLeft: { width: '70%' },
  cellRight: { width: '30%', textAlign: 'right' as const },
  th: { fontWeight: 700, fontSize: 8, color: '#374151' },
  note: { fontSize: 8, color: '#6b7280', marginTop: 8, fontStyle: 'italic' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
});

export type TimeExpenseDashboardPdfInput = {
  printedAt: string;
  dateFrom: string;
  dateTo: string;
  summaryText: string;
  currenciesNote: string;
  billableVsNon: { billable: number; nonBillable: number };
  hoursOverTime: { bucket: string; hours: number }[];
  hoursByStudy: { name: string; value: number }[];
  hoursByActivity: { name: string; value: number }[];
  expensesByCategory: { name: string; value: number }[];
  expensesByStudy: { name: string; value: number }[];
  pipeline: { status: string; timesheets: number; expenses: number }[];
};

function TableSection({
  title,
  rows,
  leftHeader,
  rightHeader,
}: {
  title: string;
  rows: { left: string; right: string }[];
  leftHeader: string;
  rightHeader: string;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.row, styles.th]}>
        <Text style={styles.cellLeft}>{leftHeader}</Text>
        <Text style={styles.cellRight}>{rightHeader}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={styles.row} wrap={false}>
          <Text style={styles.cellLeft}>{r.left}</Text>
          <Text style={styles.cellRight}>{r.right}</Text>
        </View>
      ))}
    </View>
  );
}

export function TimeExpenseDashboardPdfDocument({ data }: { data: TimeExpenseDashboardPdfInput }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Time &amp; expense summary</Text>
          <Text style={styles.meta}>
            Period {data.dateFrom} to {data.dateTo}
          </Text>
          <Text style={styles.meta}>Generated {data.printedAt}</Text>
        </View>
        <Text style={{ fontSize: 10, marginBottom: 8 }}>{data.summaryText}</Text>
        <Text style={styles.meta}>
          Billable hours: {data.billableVsNon.billable.toFixed(1)} · Non-billable:{' '}
          {data.billableVsNon.nonBillable.toFixed(1)}
        </Text>
        <Text style={styles.note}>{data.currenciesNote}</Text>
        <TableSection
          title="Hours by month"
          leftHeader="Month"
          rightHeader="Hours"
          rows={data.hoursOverTime.map((r) => ({
            left: r.bucket,
            right: r.hours.toFixed(1),
          }))}
        />
        <TableSection
          title="Hours by study"
          leftHeader="Study"
          rightHeader="Hours"
          rows={data.hoursByStudy.map((r) => ({
            left: r.name,
            right: r.value.toFixed(1),
          }))}
        />
        <TableSection
          title="Hours by activity"
          leftHeader="Activity"
          rightHeader="Hours"
          rows={data.hoursByActivity.map((r) => ({
            left: r.name,
            right: r.value.toFixed(1),
          }))}
        />
        <Text style={styles.footer}>
          Figures are for operational reporting only; they are not invoiced or paid amounts unless processed separately.
        </Text>
      </Page>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Expenses &amp; pipeline</Text>
          <Text style={styles.meta}>
            Period {data.dateFrom} to {data.dateTo}
          </Text>
        </View>
        <TableSection
          title="Expenses by category"
          leftHeader="Category (currency may be in label)"
          rightHeader="Amount"
          rows={data.expensesByCategory.map((r) => ({
            left: r.name,
            right: r.value.toFixed(2),
          }))}
        />
        <TableSection
          title="Expenses by study"
          leftHeader="Study (currency may be in label)"
          rightHeader="Amount"
          rows={data.expensesByStudy.map((r) => ({
            left: r.name,
            right: r.value.toFixed(2),
          }))}
        />
        <TableSection
          title="Submission pipeline (all company items)"
          leftHeader="Status"
          rightHeader="Timesheets / Expenses"
          rows={data.pipeline.map((r) => ({
            left: r.status.replace(/_/g, ' '),
            right: `${r.timesheets} / ${r.expenses}`,
          }))}
        />
        <Text style={styles.footer}>
          Figures are for operational reporting only; they are not invoiced or paid amounts unless processed separately.
        </Text>
      </Page>
    </Document>
  );
}
