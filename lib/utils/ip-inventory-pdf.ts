import { pdf, type DocumentProps } from '@react-pdf/renderer';
import React, { type ReactElement } from 'react';
import {
  IpInventoryPdfDocument,
  type IpInventoryPdfData,
} from '@/components/ctms/ip-management/ip-inventory-pdf-document';

function saveBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadIpInventoryLogPdf(data: IpInventoryPdfData): Promise<void> {
  const doc = React.createElement(IpInventoryPdfDocument, { data });
  const blob = await pdf(doc as ReactElement<DocumentProps>).toBlob();
  const safe = data.studyLabel.replace(/[^a-zA-Z0-9-]+/g, '-').slice(0, 40);
  saveBlobAsFile(blob, `IP-inventory-log-${safe}-${new Date().toISOString().split('T')[0]}.pdf`);
}
