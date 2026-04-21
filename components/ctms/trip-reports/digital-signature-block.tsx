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
  /** Profile-derived display name; used as a printed-name fallback for legacy reports. */
  displayName: string | null;
  /** Legacy `*_signature_data` JSON blob (back-compat). */
  signatureData: string | null | undefined;
  /** Legacy `*_signed_at` (client-supplied). */
  signedAtColumn: string | null | undefined;
  /** New `*_printed_name` Part 11 column (preferred when set). */
  printedName?: string | null | undefined;
  /** New `*_attestation_text` Part 11 column (preferred when set). */
  attestationText?: string | null | undefined;
  /** New `*_signed_at_db` server-set timestamp (preferred when set). */
  signedAtDbColumn?: string | null | undefined;
  /** New `*_content_hash` Part 11 column for record-signature linking. */
  contentHash?: string | null | undefined;
};

export function DigitalSignatureBlock({
  role,
  displayName,
  signatureData,
  signedAtColumn,
  printedName,
  attestationText,
  signedAtDbColumn,
  contentHash,
}: DigitalSignatureBlockProps) {
  const parsed = parseTripReportSignaturePayload(signatureData ?? null);
  // Prefer the server-set timestamp; fall back to the client-supplied one
  // and finally to whatever the legacy JSON payload reported.
  const whenIso =
    (signedAtDbColumn?.trim() || null) ||
    (signedAtColumn?.trim() || null) ||
    parsed?.attestedAt ||
    null;
  const hasSig = !!(parsed?.isPasswordReverified || whenIso || (printedName && printedName.trim()));
  // New attestation column wins over the short legacy label.
  const attestation =
    (attestationText && attestationText.trim()) ||
    tripReportSignatureAttestationLabel(parsed?.purpose ?? null, role);
  // New printed-name column wins; fall back to the profile-derived display name.
  const showName =
    (printedName && printedName.trim()) ||
    (displayName?.trim() || null);
  const trimmedHash = contentHash?.trim() || null;

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
      {trimmedHash ? (
        <p
          className="mt-1 break-all font-mono text-[10px] leading-snug text-muted-foreground/80"
          title="SHA-256 of the canonical signed payload (21 CFR 11.70 record-signature linking)"
        >
          <span className="font-sans font-medium text-foreground">Content hash:</span> {trimmedHash}
        </p>
      ) : null}
    </div>
  );
}
