'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadDocPdf } from '@/lib/utils/doc-pdf';
import type { ParsedDoc } from '@/lib/docs/loader';

interface DocsPdfButtonProps {
  title: string;
  parsedDoc: ParsedDoc;
  companyLogo: string | null;
  companyName: string;
}

export function DocsPdfButton({ title, parsedDoc, companyLogo, companyName }: DocsPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      await downloadDocPdf(parsedDoc, companyLogo, companyName, title);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-[11px] h-7 gap-1.5"
      onClick={handleDownload}
      disabled={loading}
    >
      <FileDown className="h-3.5 w-3.5" />
      {loading ? 'Generating...' : 'Download PDF'}
    </Button>
  );
}
