'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { IpLotLedgerEntry } from '@/lib/types/ip-management';
import { getIpLotLedgerHistory } from '@/lib/actions/ip-management';
import { labelContainerFillState } from '@/lib/utils/ip-container-fill-state';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  initial_global_receipt: 'Global receipt',
  shipped_to_site: 'Shipped to site',
  received_at_site: 'Received at site',
  dispensed: 'Dispensed',
  verified: 'Verified',
  returned_to_global: 'Returned to global',
  transferred_site: 'Transferred',
  destroyed: 'Destroyed',
  reconcile_adjustment: 'Adjustment',
};

/** Matches SQL checks on ledger metadata (e.g. COALESCE(metadata->>'dispatch_mirror','') <> 'true'). */
function metaTruthy(raw: unknown): boolean {
  if (raw === true) return true;
  const s = String(raw ?? '').trim().toLowerCase();
  return s === 'true' || s === '1';
}

function isDispatchMirrorMetadata(metadata: Record<string, unknown> | null | undefined): boolean {
  if (metadata == null || typeof metadata !== 'object') return false;
  return metaTruthy((metadata as Record<string, unknown>).dispatch_mirror);
}

function isSystemFulfillmentMetadata(metadata: Record<string, unknown> | null | undefined): boolean {
  if (metadata == null || typeof metadata !== 'object') return false;
  return metaTruthy((metadata as Record<string, unknown>).system_fulfillment);
}

function metadataNotesLine(metadata: Record<string, unknown> | null | undefined): string | null {
  if (metadata == null || typeof metadata !== 'object') return null;
  const n = (metadata as Record<string, unknown>).notes;
  if (typeof n !== 'string') return null;
  const t = n.trim();
  return t.length > 0 ? t : null;
}

function ledgerEntryBadgeLabel(e: IpLotLedgerEntry): string {
  const mirror = isDispatchMirrorMetadata(e.metadata);
  const sys = isSystemFulfillmentMetadata(e.metadata);

  if (e.entry_type === 'received_at_site') {
    if (mirror) return 'Ledger mirror (dispatch sync)';
    if (sys) return 'System fulfillment receipt';
    return ENTRY_TYPE_LABELS.received_at_site;
  }
  if (e.entry_type === 'shipped_to_site' && mirror) {
    return 'Ledger mirror (dispatch sync)';
  }
  return ENTRY_TYPE_LABELS[e.entry_type] ?? e.entry_type;
}

function ledgerEntryTypeFootnote(e: IpLotLedgerEntry): string | null {
  const mirror = isDispatchMirrorMetadata(e.metadata);
  const sys = isSystemFulfillmentMetadata(e.metadata);

  if (e.entry_type === 'received_at_site') {
    if (mirror) {
      return 'Not counted as operator receipt. Use Receive inventory if the shipment is still awaiting site acknowledgment.';
    }
    if (sys) {
      return 'Automated ledger entry. Operator receipt rules elsewhere may still apply.';
    }
  }
  if (e.entry_type === 'shipped_to_site' && mirror) {
    return 'Mirrored ship row for dispatch ledger parity; not a separate movement from the central pool by itself.';
  }
  return null;
}

function fmtTs(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface IpLotHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  lotId: string;
  title?: string;
}

export function IpLotHistoryDialog({
  open,
  onOpenChange,
  studyId,
  lotId,
  title,
}: IpLotHistoryDialogProps) {
  const [entries, setEntries] = useState<IpLotLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !lotId) return;
    let cancelled = false;
    setLoading(true);
    getIpLotLedgerHistory({ studyId, lotId })
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, studyId, lotId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? 'Transaction history'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No ledger entries for this lot.
          </p>
        ) : (
          <ol className="relative border-l border-muted ml-3 space-y-4 py-2">
            {entries.map((e) => {
              const typeFootnote = ledgerEntryTypeFootnote(e);
              const notesLine = metadataNotesLine(e.metadata);
              return (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[11px]">
                    {ledgerEntryBadgeLabel(e)}
                  </Badge>
                  {e.quantity_delta !== 0 && (
                    <span className="text-xs font-medium tabular-nums">
                      {e.quantity_delta > 0 ? '+' : ''}
                      {e.quantity_delta}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmtTs(e.performed_at)} &middot; {e.performer_label}
                </p>
                {notesLine ? (
                  <p className="text-xs text-muted-foreground mt-0.5">Notes: {notesLine}</p>
                ) : null}
                {typeFootnote ? (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug italic">
                    {typeFootnote}
                  </p>
                ) : null}
                {e.site_label && (
                  <p className="text-xs text-muted-foreground">Site: {e.site_label}</p>
                )}
                {e.subject_number_snapshot && (
                  <p className="text-xs text-muted-foreground">
                    Subject: {e.subject_number_snapshot}
                  </p>
                )}
                {(() => {
                  const raw = e.metadata?.container_fill_state;
                  const label = labelContainerFillState(
                    raw != null && typeof raw === 'string' ? raw : raw != null ? String(raw) : null
                  );
                  if (!label) return null;
                  return (
                    <p className="text-xs text-muted-foreground">Container condition: {label}</p>
                  );
                })()}
              </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
