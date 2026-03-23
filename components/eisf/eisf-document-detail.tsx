'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import {
  addEisfReviewEvent,
  getEisfVersionDownloadUrl,
  promoteEisfDocumentToEtmf,
  updateEisfDocumentStatus,
  uploadEisfDocumentVersion,
} from '@/lib/actions/eisf';
import type { EisfAuditLogRow, EisfDocument, EisfDocumentVersion, EisfReviewEvent } from '@/lib/types/eisf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const EISF_STATUS_OPTIONS = [
  { value: 'missing', label: 'Missing' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
] as const;

const EISF_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  EISF_STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>;

export function EisfDocumentDetail({
  document: doc,
  reviews,
  audit,
}: {
  document: EisfDocument & { versions?: EisfDocumentVersion[] };
  reviews: EisfReviewEvent[];
  audit: EisfAuditLogRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reviewComment, setReviewComment] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const statusDisplayLabel = useCallback((value: string | null) => {
    if (value == null || value === '') return null;
    return EISF_STATUS_LABEL[value] ?? value.replace(/_/g, ' ');
  }, []);

  const versions = doc.versions ?? [];

  const expired =
    doc.expires_on && new Date(doc.expires_on) < new Date(new Date().toDateString()) && doc.status === 'approved';

  const onUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setMsg(null);
    startTransition(async () => {
      const res = await uploadEisfDocumentVersion(doc.id, fd);
      if (!res.success) {
        setMsg(res.error ?? 'Upload failed');
        return;
      }
      form.reset();
      router.refresh();
    });
  };

  const onReview = (decision: 'approved' | 'rejected' | 'request_changes') => {
    if (!doc.current_version_id) {
      setMsg('Upload a version before review');
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await addEisfReviewEvent({
        document_id: doc.id,
        version_id: doc.current_version_id,
        decision,
        comment: reviewComment || null,
      });
      if (!res.success) {
        setMsg(res.error ?? 'Failed');
        return;
      }
      setReviewComment('');
      router.refresh();
    });
  };

  const onPromote = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await promoteEisfDocumentToEtmf(doc.id);
      if (!res.success) {
        setMsg(res.error ?? 'Promote failed');
        return;
      }
      router.refresh();
    });
  };

  const download = (versionId: string) => {
    startTransition(async () => {
      const res = await getEisfVersionDownloadUrl(versionId);
      if (res.url) window.open(res.url, '_blank');
      else setMsg(res.error ?? 'Download failed');
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {doc.status.replace(/_/g, ' ')}
          </Badge>
          {doc.source_request_id && (
            <Badge variant="outline" className="text-[10px] font-normal">
              From sponsor request
            </Badge>
          )}
          {expired && (
            <Badge variant="destructive" className="text-[10px] font-normal">
              Past expiration
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Category: {(doc.category as { name?: string } | null)?.name ?? '—'} · Expires: {doc.expires_on ?? '—'}
        </p>
        {doc.etmf_document_id && (
          <p className="text-xs text-muted-foreground mt-2">
            Linked to eTMF document. Open the{' '}
            <a href={`/protected/etmf/library/${doc.etmf_document_id}`} className="text-primary underline">
              eTMF library
            </a>{' '}
            entry to continue QC there.
          </p>
        )}
      </div>

      {msg && <p className="text-sm text-destructive">{msg}</p>}

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-medium">Upload new version</h2>
        <form onSubmit={onUpload} className="space-y-3 max-w-md">
          <input type="hidden" name="document_id" value={doc.id} />
          <div className="space-y-1.5">
            <Label className="text-xs">File</Label>
            <Input name="file" type="file" required className="text-[12px] h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Version label</Label>
              <Input name="version_label" placeholder="e.g. 2.0" className="text-[12px] h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Effective date</Label>
              <Input name="effective_date" type="date" className="text-[12px] h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Expiration date</Label>
            <Input name="expiration_date" type="date" className="text-[12px] h-9" />
          </div>
          <Button type="submit" size="sm" className="text-[12px]" disabled={pending}>
            Upload
          </Button>
        </form>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-medium">Versions</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-xs text-muted-foreground">
                  No versions yet.
                </TableCell>
              </TableRow>
            ) : (
              versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-[12px]">{v.version_label}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{v.file_name ?? '—'}</TableCell>
                  <TableCell className="text-[12px]">{v.expiration_date ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {v.storage_path && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[12px]"
                        disabled={pending}
                        onClick={() => download(v.id)}
                      >
                        Download
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-medium">QC review</h2>
        <div className="space-y-2 max-w-md">
          <Label className="text-xs">Comment</Label>
          <Textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            className="text-[12px] min-h-[72px]"
            placeholder="Optional notes for the site"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="text-[12px]" disabled={pending} onClick={() => onReview('approved')}>
              Approve
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-[12px]"
              disabled={pending}
              onClick={() => onReview('request_changes')}
            >
              Request changes
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="text-[12px]"
              disabled={pending}
              onClick={() => onReview('rejected')}
            >
              Reject
            </Button>
          </div>
        </div>
        <div className="space-y-1 max-w-xs">
          <Label className="text-xs">Manual Status Override</Label>
          <Select
            value={doc.status}
            onValueChange={(v) =>
              startTransition(async () => {
                await updateEisfDocumentStatus({ document_id: doc.id, status: v });
                router.refresh();
              })
            }
          >
            <SelectTrigger className="text-[12px] h-9 min-w-[200px]">
              <SelectValue getDisplayLabel={statusDisplayLabel} />
            </SelectTrigger>
            <SelectContent>
              {EISF_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-[12px]">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-medium">Promote to eTMF</h2>
        <p className="text-xs text-muted-foreground">
          Copies the current file into your eTMF library as a new document for trial-master-file alignment. Requires
          eTMF to be enabled for your organization.
        </p>
        <Button type="button" variant="outline" size="sm" className="text-[12px]" disabled={pending || !!doc.etmf_document_id} onClick={onPromote}>
          {doc.etmf_document_id ? 'Already in eTMF' : 'Promote current version'}
        </Button>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-medium">Review history</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-xs text-muted-foreground">
                  No reviews yet.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-[12px]">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-[12px]">{r.decision.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{r.comment ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-medium">Audit trail</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-xs text-muted-foreground">
                  No entries.
                </TableCell>
              </TableRow>
            ) : (
              audit.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-[12px]">{new Date(a.performed_at).toLocaleString()}</TableCell>
                  <TableCell className="text-[12px]">{a.action}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
