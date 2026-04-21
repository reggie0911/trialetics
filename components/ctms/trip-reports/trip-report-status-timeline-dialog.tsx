'use client';

import { useEffect, useState } from 'react';
import { Loader2, Clock, FileSignature, Ban } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  formatTripReportAuditEventNote,
  formatVisitReportStatusLabel,
  VISIT_REPORT_STATUS_LABELS,
  type VisitReportStatus,
} from '@/lib/types/visit-reports';
import {
  getTripReportAuditTimeline,
  type TripReportAuditTimelineEntry,
  type TripReportSignatureAuditRow,
} from '@/lib/actions/visit-reports';

const SIGNATURE_KIND_LABEL: Record<TripReportSignatureAuditRow['kind'], string> = {
  author_submit: 'Author submission signed',
  approver_approve: 'Approval signed',
  void_approval: 'Approval voided',
};

interface TripReportStatusTimelineDialogProps {
  /** When set, dialog opens and loads the timeline for this trip report id. */
  tripReportId: string | null;
  /** Optional context shown in the header (e.g., visit name + site). */
  contextLabel?: string | null;
  /** Called when the user closes the dialog. */
  onClose: () => void;
}

/**
 * Lightweight, read-only drawer/dialog that shows the full
 * `trip_report_status_events` history for a single report. Drives the
 * row-level status timeline on Summary/Tracker tabs.
 */
export function TripReportStatusTimelineDialog({
  tripReportId,
  contextLabel,
  onClose,
}: TripReportStatusTimelineDialogProps) {
  const open = !!tripReportId;
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<TripReportAuditTimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripReportId) return;
    let cancelled = false;
    setLoading(true);
    setEntries([]);
    setError(null);
    (async () => {
      const res = await getTripReportAuditTimeline(tripReportId);
      if (cancelled) return;
      setEntries(res.entries);
      setError(res.error);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tripReportId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" aria-hidden />
            Status timeline
          </DialogTitle>
          <DialogDescription>
            {contextLabel ?? 'All status transitions and audit notes for this trip report.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading timeline...
            </div>
          ) : error ? (
            <p className="py-4 text-sm text-destructive">{error}</p>
          ) : entries.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No status events recorded for this report yet.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {entries.map((entry) => {
                if (entry.kind === 'status') {
                  const ev = entry.event;
                  return (
                    <li key={`status-${ev.id}`} className="relative">
                      <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border border-border bg-background" />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <time>{new Date(ev.created_at).toLocaleString()}</time>
                        {ev.actor_display_name ? <span>· {ev.actor_display_name}</span> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                        {ev.from_status ? (
                          <>
                            <StatusBadge
                              status={ev.from_status}
                              label={
                                VISIT_REPORT_STATUS_LABELS[ev.from_status as VisitReportStatus] ??
                                formatVisitReportStatusLabel(ev.from_status)
                              }
                              className="text-[10px]"
                            />
                            <span aria-hidden>→</span>
                          </>
                        ) : null}
                        <StatusBadge
                          status={ev.to_status}
                          label={
                            VISIT_REPORT_STATUS_LABELS[ev.to_status as VisitReportStatus] ??
                            formatVisitReportStatusLabel(ev.to_status)
                          }
                          className="text-[10px]"
                        />
                      </div>
                      {ev.metadata ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTripReportAuditEventNote(ev.metadata)}
                        </p>
                      ) : null}
                    </li>
                  );
                }
                const ev = entry.event;
                const Icon = ev.kind === 'void_approval' ? Ban : FileSignature;
                return (
                  <li key={`sig-${ev.id}`} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border border-primary bg-primary" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <time>{new Date(ev.signed_at_db).toLocaleString()}</time>
                      {ev.actor_display_name ? <span>· {ev.actor_display_name}</span> : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                      <span>{SIGNATURE_KIND_LABEL[ev.kind]}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Signed as <span className="font-medium text-foreground">{ev.printed_name}</span>
                    </div>
                    {ev.attestation_text ? (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        &ldquo;{ev.attestation_text}&rdquo;
                      </p>
                    ) : null}
                    {ev.reason ? (
                      <p className="mt-1 text-xs">
                        <span className="text-muted-foreground">Reason: </span>
                        <span className="text-foreground">{ev.reason}</span>
                      </p>
                    ) : null}
                    {ev.content_hash ? (
                      <p
                        className="mt-1 break-all font-mono text-[10px] text-muted-foreground"
                        title="SHA-256 hash of the report content at the moment of signing"
                      >
                        sha256: {ev.content_hash}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
