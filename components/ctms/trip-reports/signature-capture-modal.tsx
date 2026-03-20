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

export type SignatureCaptureVariant = 'approver_approve' | 'author_submit';

interface SignatureCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (signatureData: string, signedAt: string) => void;
  isPending?: boolean;
  /** CRA submit vs CPM final approval — affects copy, button labels, and stored JSON `purpose`. */
  variant?: SignatureCaptureVariant;
}

const COPY: Record<
  SignatureCaptureVariant,
  { description: string; attest: string; confirmIdle: string; pending: string }
> = {
  approver_approve: {
    description:
      'Re-enter your Trialetics account password to attest that you have reviewed this report and approve it.',
    attest:
      'I attest that I have reviewed this visit report for accuracy, completeness, and appropriate documentation of findings and action items, and I approve it as final.',
    confirmIdle: 'Approve and Sign',
    pending: 'Approving…',
  },
  author_submit: {
    description:
      'Re-enter your Trialetics account password to attest that this report is complete and ready to send for CPM review.',
    attest:
      'I attest that I have completed this visit report to the best of my knowledge, that responses and notes reflect the monitoring visit, and I am submitting it for review.',
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

  const [password, setPassword] = useState('');
  const [attested, setAttested] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim() || !attested || isPending || isVerifying) return;
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
      onConfirm(signatureData, signedAt);
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
      setPassword('');
      setAttested(false);
      setVerifyError(null);
      setIsVerifying(false);
    }
    onOpenChange(next);
  };

  const busy = isPending || isVerifying;
  const canConfirm = password.trim().length > 0 && attested && !busy;

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
              {copy.attest}
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
