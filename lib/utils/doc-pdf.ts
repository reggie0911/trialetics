import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { DocPdfDocument } from '@/components/docs/doc-pdf-document';
import { parseMarkdownToPdfNodes } from '@/lib/docs/markdown-to-pdf';
import type { ParsedDoc } from '@/lib/docs/loader';

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

export async function downloadDocPdf(
  parsedDoc: ParsedDoc,
  companyLogo: string | null,
  companyName: string,
  title: string
): Promise<void> {
  const nodes = parseMarkdownToPdfNodes(parsedDoc.content);
  const doc = React.createElement(DocPdfDocument, {
    title,
    nodes,
    companyLogo,
    companyName,
  });
  const blob = await pdf(doc as any).toBlob();
  const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-guide.pdf`;
  saveBlobAsFile(blob, filename);
}
