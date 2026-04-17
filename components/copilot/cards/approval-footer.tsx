'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Lock, Pencil, ShieldCheck, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ActionRiskLevel } from '@/lib/ai/types';

/**
 * Shared footer for any structured card that mutates real data. Surfaces:
 *  - Approve / Edit / Discard
 *  - Reason-for-change input (Phase 5 makes this required for write paths)
 *  - Audit-log entry preview (the row that will be written)
 *  - Disabled state when the active study is read-only
 *
 * Phase 2 ships the UI contract; Phase 5 wires e-signature onto Approve and
 * commits to `copilot_actions_audit`. The shape of `onApprove(reason)` is
 * stable across both phases.
 */
export interface ApprovalFooterProps {
  riskLevel: ActionRiskLevel;
  /** Required when `risk = 'reviewable' | 'destructive'` per Phase 5; soft warning until then. */
  reasonForChangeRequired?: boolean;
  /** Phase 5: when true, Approve triggers a password re-auth flow before commit. */
  requiresESignature?: boolean;
  /** Disable Approve when the active study is closed/read-only. */
  readOnly?: boolean;
  /** Short summary of the action for the audit-log preview. */
  auditPreview?: {
    action: string;
    target: string;
    summary: string;
    agentId: string;
    agentVersion?: string;
  };
  onApprove: (reason: string) => Promise<void> | void;
  onEdit?: () => void;
  onDiscard?: () => void;
  className?: string;
}

export function ApprovalFooter({
  riskLevel,
  reasonForChangeRequired = riskLevel !== 'safe',
  requiresESignature,
  readOnly,
  auditPreview,
  onApprove,
  onEdit,
  onDiscard,
  className,
}: ApprovalFooterProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (reasonForChangeRequired && !reason.trim()) {
      setError('Reason-for-change is required before approving.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onApprove(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs',
        className
      )}
    >
      {auditPreview ? (
        <div className="flex items-start gap-2 rounded-sm border border-dashed border-border/70 bg-background px-2 py-1.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Audit log preview
            </p>
            <p className="truncate text-[11px] font-medium">{auditPreview.action}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              Target: <span className="font-mono">{auditPreview.target}</span>
              {' · '}Agent: <span className="font-mono">{auditPreview.agentId}</span>
              {auditPreview.agentVersion ? ` v${auditPreview.agentVersion}` : null}
            </p>
            <p className="text-[10px] text-muted-foreground">{auditPreview.summary}</p>
          </div>
        </div>
      ) : null}

      {reasonForChangeRequired ? (
        <Textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for change (recorded in audit log)"
          className="min-h-[52px] resize-y text-xs"
        />
      ) : null}

      {error ? (
        <p className="flex items-center gap-1 text-[11px] text-red-600">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {requiresESignature ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                    <Lock className="h-2.5 w-2.5" />
                    e-signature required
                  </span>
                }
              />
              <TooltipContent side="top" className="max-w-xs text-xs">
                Approve will prompt for password re-auth (21 CFR Part 11). Wired in Phase 5.
              </TooltipContent>
            </Tooltip>
          ) : null}
          {readOnly ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Lock className="h-2.5 w-2.5" />
              Read-only study
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {onDiscard ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={onDiscard}
              type="button"
            >
              <X className="mr-1 h-3 w-3" />
              Discard
            </Button>
          ) : null}
          {onEdit ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={onEdit}
              type="button"
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          ) : null}
          <Button
            variant="default"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={handleApprove}
            disabled={submitting || readOnly}
            type="button"
          >
            <Check className="mr-1 h-3 w-3" />
            {submitting ? 'Approving…' : 'Approve'}
          </Button>
        </div>
      </div>
    </div>
  );
}
