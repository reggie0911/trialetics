'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/client';
import { TRIP_REPORT_APPROVER_ATTESTATION } from '@/lib/visit-report-signature-attestations';
import type { SignatureCaptureConfirmPayload } from '@/components/ctms/trip-reports/signature-capture-modal';

/**
 * Per-row context for the scrollable list rendered above the printed
 * name input. The CPM must be able to verify exactly which records
 * the single credential challenge is going to authorize.
 */
export interface BulkSignatureReportRow {
  reportId: string;
  primary: string;            // e.g. "ACME-001 / Site 12 — SIV"
  secondary?: string | null;  // e.g. "Visit date Apr 12, 2026 · Author Jane Doe"
}

interface BulkSignatureCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: SignatureCaptureConfirmPayload) => void;
  isPending?: boolean;
  reports: BulkSignatureReportRow[];
}

/**
 * Bulk-approve electronic-signature modal. A near-clone of
 * `SignatureCaptureModal` (approver_approve variant) with one
 * change: above the inputs we render the list of N reports the CPM
 * is about to sign. This is required so the per-record manifestation
 * (21 CFR 11.50) is preserved even though the credential challenge
 * is shared per 21 CFR 11.200(a)(1)(ii) (continuous controlled
 * session).
 *
 * The single per-report `SignatureCaptureModal` is intentionally NOT
 * reused here — the body layout, the dialog max-width, and the copy
 * all need to change. We do reuse the `SignatureCaptureConfirmPayload`
 * shape so the upstream `approveReportsBulk` action accepts the same
 * fields the per-report `approveReport` already takes.
 */
export function BulkSignatureCaptureModal({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  reports,
}: BulkSignatureCaptureModalProps) {
  const [printedName, setPrintedName] = useState('');
  const [password, setPassword] = useState('');
  const [attested, setAttested] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const reportCount = reports.length;

  const handleConfirm = async () => {
    if (
      !password.trim() ||
      !printedName.trim() ||
      !attested ||
      isPending ||
      isVerifying ||
      reportCount === 0
    ) {
      return;
    }
    setVerifyError(null);
    setIsVerifying(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.email) {
        setVerifyError('Session expired; refresh the page and try again.');
        return;
      }
      // Client-side reverification for fast feedback only; the
      // server in `approveReportsBulk` re-runs the password check
      // before any side effects.
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password.trim(),
      });
      if (signErr) {
        const raw = (signErr.message || '').toLowerCase();
        if (raw.includes('invalid') || raw.includes('credential')) {
          setVerifyError('Incorrect password.');
        } else {
          setVerifyError(
            'Could not verify with your account password. If you sign in with SSO only, set a password in your account or contact support.'
          );
        }
        return;
      }
      const signedAt = new Date().toISOString();
      const signatureData = JSON.stringify({
        type: 'password_reverified',
        attestedAt: signedAt,
        method: 'supabase_password',
        purpose: 'bulk_approve',
        reportCount,
      });
      onConfirm({
        signatureData,
        signedAt,
        printedName: printedName.trim(),
        attestationText: TRIP_REPORT_APPROVER_ATTESTATION,
        password: password.trim(),
      });
      setPrintedName('');
      setPassword('');
      setAttested(false);
      setVerifyError(null);
      onOpenChange(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPrintedName('');
      setPassword('');
      setAttested(false);
      setVerifyError(null);
      setIsVerifying(false);
    }
    onOpenChange(next);
  };

  const busy = isPending || isVerifying;
  const canConfirm =
    password.trim().length > 0 &&
    printedName.trim().length > 0 &&
    attested &&
    reportCount > 0 &&
    !busy;

  const primaryLabel = isVerifying
    ? 'Verifying…'
    : isPending
      ? `Approving ${reportCount}…`
      : `Approve and Sign ${reportCount} report${reportCount === 1 ? '' : 's'}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Electronic signature — {reportCount} report{reportCount === 1 ? '' : 's'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Re-enter your Trialetics account password and type your full legal name to attest that you have
          reviewed each of the reports listed below and approve them as final. One credential challenge will
          authorize all {reportCount} signatures (21 CFR 11.200(a)(1)(ii) continuous controlled session); a
          separate signature manifestation will be recorded for every report.
        </p>
        <div
          className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 text-xs"
          aria-label="Reports being signed"
        >
          {reportCount === 0 ? (
            <p className="text-muted-foreground">No reports selected.</p>
          ) : (
            <ul className="space-y-1">
              {reports.map((r) => (
                <li key={r.reportId} className="rounded px-2 py-1 hover:bg-background/50">
                  <div className="font-medium text-foreground">{r.primary}</div>
                  {r.secondary ? (
                    <div className="text-[11px] text-muted-foreground">{r.secondary}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-sig-printed-name">Type your full legal name to sign</Label>
            <Input
              id="bulk-sig-printed-name"
              type="text"
              autoComplete="name"
              placeholder="First Last"
              value={printedName}
              onChange={(e) => {
                setPrintedName(e.target.value);
                if (verifyError) setVerifyError(null);
              }}
              disabled={busy}
            />
            <p className="text-[11px] text-muted-foreground">
              Must match the name on your Trialetics account.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-sig-password">Account password</Label>
            <Input
              id="bulk-sig-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (verifyError) setVerifyError(null);
              }}
              disabled={busy}
              aria-invalid={verifyError ? true : undefined}
              aria-describedby={verifyError ? 'bulk-sig-password-error' : undefined}
            />
            {verifyError ? (
              <p id="bulk-sig-password-error" className="text-xs text-destructive" role="alert">
                {verifyError}
              </p>
            ) : null}
          </div>
          <div
            className="rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-snug text-muted-foreground"
            aria-label="Attestation"
          >
            {TRIP_REPORT_APPROVER_ATTESTATION}
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="bulk-sig-attest"
              checked={attested}
              onCheckedChange={(v) => setAttested(v === true)}
              disabled={busy}
            />
            <Label htmlFor="bulk-sig-attest" className="text-sm font-normal cursor-pointer leading-relaxed">
              I attest to the statement above for every report listed.
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!canConfirm}>
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
