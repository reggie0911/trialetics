'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import type { PdfNode, PdfInline } from '@/lib/docs/markdown-to-pdf';

Font.register({
  family: 'Poppins',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.2.7/files/poppins-latin-400-normal.woff',
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: 'Poppins',
    fontSize: 10,
    color: '#111827',
  },
  header: {
    position: 'absolute',
    top: 14,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 9, color: '#6b7280', fontWeight: 700 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTop: '1px solid #e5e7eb',
    paddingTop: 6,
    fontSize: 8,
    color: '#9ca3af',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 8, marginTop: 12, color: '#111827' },
  h2: { fontSize: 14, fontWeight: 700, marginBottom: 6, marginTop: 10, color: '#111827' },
  h3: { fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 8, color: '#374151' },
  h4: { fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 6, color: '#374151' },
  paragraph: { fontSize: 10, lineHeight: 1.5, marginBottom: 6, color: '#374151' },
  listItem: { flexDirection: 'row', marginBottom: 3, paddingLeft: 10 },
  listBullet: { width: 12, fontSize: 10, color: '#6b7280' },
  listContent: { flex: 1, fontSize: 10, lineHeight: 1.5, color: '#374151' },
  blockquote: {
    borderLeft: '3px solid #d1d5db',
    paddingLeft: 10,
    paddingVertical: 4,
    marginBottom: 6,
    backgroundColor: '#f9fafb',
  },
  blockquoteText: { fontSize: 9, color: '#6b7280', fontStyle: 'italic', lineHeight: 1.4 },
  codeBlock: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
    border: '1px solid #e5e7eb',
  },
  codeText: { fontSize: 8, color: '#374151', lineHeight: 1.4 },
  hr: { borderBottom: '1px solid #e5e7eb', marginVertical: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #d1d5db',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderCell: { fontSize: 8, fontWeight: 700, color: '#6b7280', flex: 1 },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCell: { fontSize: 9, color: '#374151', flex: 1 },
  bold: { fontWeight: 700 },
  italic: { fontStyle: 'italic' },
  code: { fontSize: 9, backgroundColor: '#f3f4f6', color: '#111827' },
  image: { maxWidth: '100%', marginBottom: 8 },
});

function RenderInline({ items }: { items: PdfInline[] }) {
  return (
    <Text>
      {items.map((item, i) => {
        if (item.type === 'link') {
          return <Text key={i} style={{ color: '#2563eb' }}>{item.text}</Text>;
        }
        const s: any[] = [];
        if (item.bold) s.push(styles.bold);
        if (item.italic) s.push(styles.italic);
        if (item.code) s.push(styles.code);
        return <Text key={i} style={s.length > 0 ? s : undefined}>{item.text}</Text>;
      })}
    </Text>
  );
}

function RenderNode({ node, index }: { node: PdfNode; index: number }) {
  switch (node.type) {
    case 'heading': {
      const style = node.level === 1 ? styles.h1 : node.level === 2 ? styles.h2 : node.level === 3 ? styles.h3 : styles.h4;
      return <Text key={index} style={style}>{node.text}</Text>;
    }
    case 'paragraph':
      return (
        <View key={index} style={styles.paragraph}>
          <RenderInline items={node.children} />
        </View>
      );
    case 'list':
      return (
        <View key={index} style={{ marginBottom: 6 }}>
          {node.items.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listBullet}>{node.ordered ? `${i + 1}.` : '•'}</Text>
              <View style={styles.listContent}>
                <RenderInline items={item.children} />
              </View>
            </View>
          ))}
        </View>
      );
    case 'table':
      return (
        <View key={index} style={{ marginBottom: 8, border: '1px solid #d1d5db', borderRadius: 4 }}>
          <View style={styles.tableHeader}>
            {node.headers.map((h, i) => (
              <Text key={i} style={styles.tableHeaderCell}>{h}</Text>
            ))}
          </View>
          {node.rows.map((row, ri) => (
            <View key={ri} style={styles.tableRow}>
              {row.map((cell, ci) => (
                <Text key={ci} style={styles.tableCell}>{cell}</Text>
              ))}
            </View>
          ))}
        </View>
      );
    case 'blockquote':
      return (
        <View key={index} style={styles.blockquote}>
          <Text style={styles.blockquoteText}>{node.text}</Text>
        </View>
      );
    case 'codeBlock':
      return (
        <View key={index} style={styles.codeBlock}>
          <Text style={styles.codeText}>{node.text}</Text>
        </View>
      );
    case 'image':
      try {
        return <Image key={index} src={node.src} style={styles.image} />;
      } catch {
        return (
          <View key={index} style={styles.paragraph}>
            <Text style={{ color: '#9ca3af', fontSize: 9 }}>[Image: {node.alt}]</Text>
          </View>
        );
      }
    case 'hr':
      return <View key={index} style={styles.hr} />;
    default:
      return null;
  }
}

interface DocPdfDocumentProps {
  title: string;
  nodes: PdfNode[];
  companyLogo: string | null;
  companyName: string;
}

export function DocPdfDocument({ title, nodes, companyLogo, companyName }: DocPdfDocumentProps) {
  return (
    <Document title={title} author="Trialetics" creationDate={new Date()}>
      <Page size="A4" style={styles.page}>
        <View fixed style={styles.header}>
          <Text style={styles.headerTitle}>{companyName} — {title}</Text>
          {companyLogo ? (
            <Image src={companyLogo} style={{ maxWidth: 60, maxHeight: 30, objectFit: 'contain' }} />
          ) : null}
        </View>

        {nodes.map((node, i) => (
          <RenderNode key={i} node={node} index={i} />
        ))}

        <View fixed style={styles.footer}>
          <Text>{companyName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          <Text>Confidential</Text>
        </View>
      </Page>
    </Document>
  );
}
