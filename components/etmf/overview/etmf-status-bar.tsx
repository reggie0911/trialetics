'use client';

interface EtmfStatusBarProps {
  approved: number;
  rejected: number;
  qcReview: number;
  placeholders: number;
}

export function EtmfStatusBar({ approved, rejected, qcReview, placeholders }: EtmfStatusBarProps) {
  const total = approved + rejected + qcReview + placeholders;
  const approvedPct = total > 0 ? (approved / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;
  const qcReviewPct = total > 0 ? (qcReview / total) * 100 : 0;
  const placeholdersPct = total > 0 ? (placeholders / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
        {approvedPct > 0 && (
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${approvedPct}%` }}
          />
        )}
        {rejectedPct > 0 && (
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${rejectedPct}%` }}
          />
        )}
        {qcReviewPct > 0 && (
          <div
            className="h-full bg-yellow-500 transition-all"
            style={{ width: `${qcReviewPct}%` }}
          />
        )}
        {placeholdersPct > 0 && (
          <div
            className="h-full bg-gray-400 transition-all"
            style={{ width: `${placeholdersPct}%` }}
          />
        )}
      </div>

      <div className="flex items-center gap-6 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>Approved ({approved})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span>Rejected ({rejected})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-yellow-500" />
          <span>QC Review ({qcReview})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gray-400" />
          <span>Placeholders ({placeholders})</span>
        </div>
      </div>
    </div>
  );
}
