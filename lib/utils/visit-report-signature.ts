/**
 * Parses stored trip report electronic signature payloads (password re-verification JSON).
 * @see components/ctms/trip-reports/signature-capture-modal.tsx
 */

export type TripReportSignaturePurpose = 'submit_for_review' | string | null;

export type ParsedTripReportSignature = {
  attestedAt: string | null;
  purpose: TripReportSignaturePurpose;
  isPasswordReverified: boolean;
};

export function parseTripReportSignaturePayload(raw: string | null | undefined): ParsedTripReportSignature | null {
  if (raw == null || String(raw).trim() === '') return null;
  try {
    const o = JSON.parse(String(raw)) as Record<string, unknown>;
    if (o.type !== 'password_reverified') return null;
    const attestedAt = typeof o.attestedAt === 'string' ? o.attestedAt : null;
    const purpose = typeof o.purpose === 'string' ? o.purpose : null;
    return { attestedAt, purpose, isPasswordReverified: true };
  } catch {
    return null;
  }
}

/** Date + time for signature UI and PDF (en-GB, 12h with seconds). AM/PM uppercase. */
export function formatSignatureDisplayDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    const s = d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return s.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  } catch {
    return '—';
  }
}

/** Short UI line for signature block (aligned with SignatureCaptureModal attest copy). */
export function tripReportSignatureAttestationLabel(
  purpose: TripReportSignaturePurpose,
  role: 'author' | 'approver'
): string {
  if (role === 'author' && purpose === 'submit_for_review') {
    return 'Electronic signature: submitted for review (password-verified attestation).';
  }
  if (role === 'approver') {
    return 'Electronic signature: final approval (password-verified attestation).';
  }
  if (role === 'author') {
    return 'Electronic signature: author attestation (password-verified).';
  }
  return 'Electronic signature (password-verified attestation).';
}
