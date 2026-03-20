'use client';

import { Dancing_Script } from 'next/font/google';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatSignatureDisplayDateTime,
  parseTripReportSignaturePayload,
  tripReportSignatureAttestationLabel,
} from '@/lib/utils/visit-report-signature';

const dancingScript = Dancing_Script({ subsets: ['latin'], weight: ['400', '700'] });

export type DigitalSignatureBlockProps = {
  role: 'author' | 'approver';
  displayName: string | null;
  signatureData: string | null | undefined;
  signedAtColumn: string | null | undefined;
};

export function DigitalSignatureBlock({
  role,
  displayName,
  signatureData,
  signedAtColumn,
}: DigitalSignatureBlockProps) {
  const parsed = parseTripReportSignaturePayload(signatureData ?? null);
  const whenIso = signedAtColumn?.trim() || parsed?.attestedAt || null;
  const hasSig = !!(parsed?.isPasswordReverified || whenIso);
  const attestation = tripReportSignatureAttestationLabel(parsed?.purpose ?? null, role);
  const showName = displayName?.trim() || null;

  if (!hasSig) {
    return (
      <div
        className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground"
        aria-label={`${role} signature not recorded`}
      >
        Not signed
      </div>
    );
  }

  return (
    <div
      className="relative rounded-lg border border-border bg-muted/30 px-3 py-3 text-left shadow-sm"
      aria-label={`${role} digital signature`}
    >
      <CheckCircle2
        className="absolute right-2 top-2 size-5 text-emerald-600 dark:text-emerald-500"
        aria-hidden
      />
      <p className={cn(dancingScript.className, 'text-2xl leading-tight text-foreground pr-7')}>{showName ?? '—'}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Signed by:</span> {showName ?? '—'}
      </p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Signing date:</span> {formatSignatureDisplayDateTime(whenIso)}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{attestation}</p>
    </div>
  );
}
