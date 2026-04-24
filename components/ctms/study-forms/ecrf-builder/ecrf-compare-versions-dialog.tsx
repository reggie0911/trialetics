'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { compareTemplateVersions } from '@/lib/actions/study-ecrf-change-log';
import type {
  EcrfTemplateDiff,
  EcrfTemplateDiffCrf,
  EcrfTemplateDiffFieldChange,
  EcrfTemplateDiffQuestion,
  EcrfTemplateDiffVisit,
  EcrfTemplateVersionWithCounts,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

interface EcrfCompareVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  versions: EcrfTemplateVersionWithCounts[];
  /** The version selected on the page when the user opened the dialog. */
  initialLeftVersionId: string | null;
}

type DeltaFilter = 'all' | 'changed';

export function EcrfCompareVersionsDialog({
  open,
  onOpenChange,
  studyId,
  versions,
  initialLeftVersionId,
}: EcrfCompareVersionsDialogProps) {
  const [leftId, setLeftId] = useState<string | null>(initialLeftVersionId);
  const [rightId, setRightId] = useState<string | null>(null);
  const [diff, setDiff] = useState<EcrfTemplateDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DeltaFilter>('changed');

  // Default the right-side selector to the most recent version that's not the
  // left side so the dialog has something to show as soon as it opens.
  useEffect(() => {
    if (!open) return;
    setLeftId(initialLeftVersionId);
    const fallbackRight =
      versions.find((v) => v.id !== initialLeftVersionId)?.id ?? null;
    setRightId(fallbackRight);
  }, [open, initialLeftVersionId, versions]);

  useEffect(() => {
    if (!open || !leftId || !rightId || leftId === rightId) {
      setDiff(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    compareTemplateVersions({
      studyId,
      leftVersionId: leftId,
      rightVersionId: rightId,
    })
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.data) {
          setError(res.error ?? 'Failed to compute diff.');
          setDiff(null);
          return;
        }
        setDiff(res.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to compute diff.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, leftId, rightId, studyId]);

  const filteredVisits = useMemo(() => {
    if (!diff) return [];
    if (filter === 'all') return diff.visits;
    return diff.visits.filter(visitHasDelta);
  }, [diff, filter]);

  const downloadCsv = () => {
    if (!leftId || !rightId) return;
    const url = `/api/studies/${studyId}/ecrf/template?versionId=${leftId}&compareVersionId=${rightId}`;
    if (typeof window !== 'undefined') window.location.href = url;
    toast.success('Compare CSV downloading…');
  };

  const downloadPdf = () => {
    if (!leftId || !rightId) return;
    const url = `/api/studies/${studyId}/ecrf/print?versionId=${leftId}&compareVersionId=${rightId}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const swap = () => {
    setLeftId(rightId);
    setRightId(leftId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compare versions</DialogTitle>
          <DialogDescription>
            See exactly what changed between two template versions before publishing or
            cloning.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <VersionPicker
            label="Left (base)"
            value={leftId}
            onChange={setLeftId}
            options={versions}
          />
          <div className="flex items-end justify-center pb-1">
            <Button variant="ghost" size="sm" onClick={swap} className="h-8">
              ⇄
            </Button>
          </div>
          <VersionPicker
            label="Right (compare)"
            value={rightId}
            onChange={setRightId}
            options={versions}
          />
        </div>

        {leftId && rightId && leftId === rightId && (
          <p className="text-xs text-amber-600">Pick two different versions to compare.</p>
        )}

        {diff && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <DiffSummaryBadge label="Visits" summary={diff.totals.visits} />
              <DiffSummaryBadge label="CRFs" summary={diff.totals.crfs} />
              <DiffSummaryBadge label="Questions" summary={diff.totals.questions} />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as DeltaFilter)}>
              <TabsList className="h-7">
                <TabsTrigger value="changed" className="text-[11px]">
                  Changes only
                </TabsTrigger>
                <TabsTrigger value="all" className="text-[11px]">
                  All rows
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <ScrollArea className="max-h-[55vh] rounded border">
          <div className="divide-y">
            {loading && (
              <div className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Computing diff…
              </div>
            )}
            {!loading && error && (
              <p className="p-4 text-xs text-destructive">{error}</p>
            )}
            {!loading && !error && diff && filteredVisits.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground">
                No structural changes between these versions.
              </p>
            )}
            {!loading &&
              !error &&
              diff &&
              filteredVisits.map((visit) => <VisitDiffRow key={visit.id} visit={visit} />)}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-end gap-2 sm:justify-between">
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            Tip: Compare a Draft against the live version before publishing.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCsv}
              disabled={!leftId || !rightId || leftId === rightId}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Download CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              disabled={!leftId || !rightId || leftId === rightId}
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              Open PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Picker ──────────────────────────────────────────────────────────────────

function VersionPicker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (id: string) => void;
  options: EcrfTemplateVersionWithCounts[];
}) {
  const labelFor = (id: string | null): string | null => {
    if (!id) return null;
    const v = options.find((x) => x.id === id);
    if (!v) return null;
    const status = v.status ? ` (${formatStatus(v.status)})` : '';
    return v.name ? `v${v.version_number} · ${v.name}${status}` : `v${v.version_number}${status}`;
  };

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue placeholder="Select version" getDisplayLabel={labelFor} />
        </SelectTrigger>
        <SelectContent>
          {options.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              <div className="flex items-center gap-2">
                <span>v{v.version_number}</span>
                {v.name && <span className="text-muted-foreground">· {v.name}</span>}
                <Badge variant="outline" className="ml-auto text-[9px] uppercase">
                  {v.status}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatStatus(status: string): string {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

// ─── Summary chips ───────────────────────────────────────────────────────────

function DiffSummaryBadge({
  label,
  summary,
}: {
  label: string;
  summary: { added: number; removed: number; changed: number };
}) {
  const total = summary.added + summary.removed + summary.changed;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-[11px]"
      title={`${summary.added} added · ${summary.removed} removed · ${summary.changed} changed`}
    >
      <span className="font-medium">{label}</span>
      {total === 0 ? (
        <span className="text-muted-foreground">no changes</span>
      ) : (
        <>
          {summary.added > 0 && <span className="text-emerald-600">+{summary.added}</span>}
          {summary.removed > 0 && <span className="text-rose-600">−{summary.removed}</span>}
          {summary.changed > 0 && <span className="text-amber-600">~{summary.changed}</span>}
        </>
      )}
    </span>
  );
}

// ─── Visit / CRF / Question rows ─────────────────────────────────────────────

function visitHasDelta(v: EcrfTemplateDiffVisit): boolean {
  if (v.added || v.removed) return true;
  if (v.changes && v.changes.length > 0) return true;
  return v.crfs.some(crfHasDelta);
}

function crfHasDelta(c: EcrfTemplateDiffCrf): boolean {
  if (c.added || c.removed) return true;
  if (c.changes && c.changes.length > 0) return true;
  return c.questions.some((q) => q.added || q.removed || (q.changes?.length ?? 0) > 0);
}

function VisitDiffRow({ visit }: { visit: EcrfTemplateDiffVisit }) {
  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{visit.visit_name}</p>
        <DeltaPill added={visit.added} removed={visit.removed} changes={visit.changes} />
      </div>
      <FieldChangesList changes={visit.changes} />
      {visit.crfs.length > 0 && (
        <div className="mt-2 space-y-1.5 border-l-2 border-border/60 pl-3">
          {visit.crfs.map((c) => (
            <CrfDiffRow key={c.id} crf={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CrfDiffRow({ crf }: { crf: EcrfTemplateDiffCrf }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs">{crf.name}</p>
        <DeltaPill added={crf.added} removed={crf.removed} changes={crf.changes} />
      </div>
      <FieldChangesList changes={crf.changes} />
      {crf.questions.length > 0 && (
        <ul className="mt-1 space-y-1 border-l-2 border-border/40 pl-3 text-[11px]">
          {crf.questions.map((q) => (
            <QuestionDiffRow key={q.id} question={q} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestionDiffRow({ question }: { question: EcrfTemplateDiffQuestion }) {
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate">{question.label}</p>
        {question.changes && question.changes.length > 0 && (
          <FieldChangesList changes={question.changes} />
        )}
      </div>
      <DeltaPill added={question.added} removed={question.removed} changes={question.changes} />
    </li>
  );
}

function DeltaPill({
  added,
  removed,
  changes,
}: {
  added?: boolean;
  removed?: boolean;
  changes?: EcrfTemplateDiffFieldChange[];
}) {
  if (added)
    return (
      <Badge className="bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
        Added
      </Badge>
    );
  if (removed)
    return (
      <Badge className="bg-rose-100 text-[10px] text-rose-800 hover:bg-rose-100">
        Removed
      </Badge>
    );
  if (changes && changes.length > 0) {
    return (
      <Badge className="bg-amber-100 text-[10px] text-amber-900 hover:bg-amber-100">
        {changes.length} change{changes.length === 1 ? '' : 's'}
      </Badge>
    );
  }
  return (
    <span
      className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground"
      aria-hidden
    >
      no change
    </span>
  );
}

function FieldChangesList({ changes }: { changes?: EcrfTemplateDiffFieldChange[] }) {
  if (!changes || changes.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {changes.map((c) => (
        <li key={c.field} className={cn('text-[10px] text-muted-foreground')}>
          <span className="font-medium text-foreground">{c.field}:</span>{' '}
          <span className="text-rose-600 line-through">{stringify(c.left)}</span> →{' '}
          <span className="text-emerald-700">{stringify(c.right)}</span>
        </li>
      ))}
    </ul>
  );
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'string') return v.length === 0 ? '""' : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
