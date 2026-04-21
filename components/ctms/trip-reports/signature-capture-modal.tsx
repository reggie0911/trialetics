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
import {
  TRIP_REPORT_APPROVER_ATTESTATION,
  TRIP_REPORT_AUTHOR_ATTESTATION,
} from '@/lib/visit-report-signature-attestations';

export type SignatureCaptureVariant = 'approver_approve' | 'author_submit';

/**
 * Payload sent to the parent's `onConfirm`. Shape mirrors what the
 * server actions in `lib/actions/visit-reports.ts` expect:
 *
 * - `signatureData` is the legacy JSON blob the server still persists
 *   on `*_signature_data` for back-compat through one release.
 * - `signedAt` is advisory; the server overrides with `NOW()` and
 *   stores the authoritative value on `*_signed_at_db`.
 * - `printedName`, `attestationText`, `password` drive Part 11
 *   manifestation (printed name, meaning of signature) and the 11.300
 *   re-authentication round-trip.
 */
export interface SignatureCaptureConfirmPayload {
  signatureData: string;
  signedAt: string;
  printedName: string;
  attestationText: string;
  password: string;
}

interface SignatureCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: SignatureCaptureConfirmPayload) => void;
  isPending?: boolean;
  /** CRA submit vs CPM final approval — affects copy, button labels, and stored JSON `purpose`. */
  variant?: SignatureCaptureVariant;
}

const COPY: Record<
  SignatureCaptureVariant,
  { description: string; attestation: string; confirmIdle: string; pending: string }
> = {
  approver_approve: {
    description:
      'Re-enter your Trialetics account password and type your full legal name to attest that you have reviewed this report and approve it as final.',
    attestation: TRIP_REPORT_APPROVER_ATTESTATION,
    confirmIdle: 'Approve and Sign',
    pending: 'Approving…',
  },
  author_submit: {
    description:
      'Re-enter your Trialetics account password and type your full legal name to attest that this report is complete and ready to send for CPM review.',
    attestation: TRIP_REPORT_AUTHOR_ATTESTATION,
    confirmIdle: 'Submit for review',
    pending: 'Submitting…',
  },
};

export function SignatureCaptureModal({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  variant = 'approver_approve',
}: SignatureCaptureModalProps) {
  const copy = COPY[variant];
  const fieldSuffix = variant === 'author_submit' ? 'submit' : 'approve';

  const [printedName, setPrintedName] = useState('');
  const [password, setPassword] = useState('');
  const [attested, setAttested] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim() || !printedName.trim() || !attested || isPending || isVerifying) return;
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
      // Client-side reverification kept as a UX nicety (fast feedback);
      // the server in lib/actions/visit-reports.ts is the source of
      // truth and re-runs `signInWithPassword` itself.
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
      const payload: Record<string, string> = {
        type: 'password_reverified',
        attestedAt: signedAt,
        method: 'supabase_password',
      };
      if (variant === 'author_submit') {
        payload.purpose = 'submit_for_review';
      }
      const signatureData = JSON.stringify(payload);
      onConfirm({
        signatureData,
        signedAt,
        printedName: printedName.trim(),
        attestationText: copy.attestation,
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
    password.trim().length > 0 && printedName.trim().length > 0 && attested && !busy;

  const primaryLabel = isVerifying
    ? 'Verifying…'
    : isPending
      ? copy.pending
      : copy.confirmIdle;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Electronic signature</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`sig-printed-name-${fieldSuffix}`}>
              Type your full legal name to sign
            </Label>
            <Input
              id={`sig-printed-name-${fieldSuffix}`}
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
            <Label htmlFor={`sig-password-${fieldSuffix}`}>Account password</Label>
            <Input
              id={`sig-password-${fieldSuffix}`}
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
              aria-describedby={verifyError ? `sig-password-error-${fieldSuffix}` : undefined}
            />
            {verifyError ? (
              <p id={`sig-password-error-${fieldSuffix}`} className="text-xs text-destructive" role="alert">
                {verifyError}
              </p>
            ) : null}
          </div>
          <div
            className="rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-snug text-muted-foreground"
            aria-label="Attestation"
          >
            {copy.attestation}
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id={`sig-attest-${fieldSuffix}`}
              checked={attested}
              onCheckedChange={(v) => setAttested(v === true)}
              disabled={busy}
            />
            <Label
              htmlFor={`sig-attest-${fieldSuffix}`}
              className="text-sm font-normal cursor-pointer leading-relaxed"
            >
              I attest to the statement above.
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
