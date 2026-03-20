import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { VisitReportPdfDocument, type VisitReportPdfData } from '@/components/ctms/trip-reports/visit-report-pdf-document';

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

export async function downloadVisitReportPdf(
  data: VisitReportPdfData,
  options: { filename: string; footerLeft?: string; footerRight?: string }
): Promise<void> {
  const doc = React.createElement(VisitReportPdfDocument, {
    data,
    footerLeft: options.footerLeft,
    footerRight: options.footerRight,
  });
  const blob = await pdf(doc as any).toBlob();
  saveBlobAsFile(blob, options.filename);
}
