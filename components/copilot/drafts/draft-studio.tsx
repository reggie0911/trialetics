'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  History,
  PenLine,
  ShieldCheck,
  XCircle,
  Save,
  AlertTriangle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DraftRecord, DraftStatus, DraftVersionRecord } from '@/lib/copilot/drafts';

interface Props {
  initialDraft: DraftRecord;
  initialVersions: DraftVersionRecord[];
}

const STATUS_BADGE: Record<DraftStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  in_review: { label: 'In review', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'secondary' },
  signed: { label: 'Signed', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  discarded: { label: 'Discarded', variant: 'outline' },
};

export function DraftStudio({ initialDraft, initialVersions }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftRecord>(initialDraft);
  const [versions, setVersions] = useState<DraftVersionRecord[]>(initialVersions);
  const [editorBody, setEditorBody] = useState<string>(initialVersions[0]?.body ?? '');
  const [editReason, setEditReason] = useState('');
  const [signOpen, setSignOpen] = useState(false);
  const [signReason, setSignReason] = useState('');
  const [signMethod, setSignMethod] = useState<'password' | 'sso' | 'webauthn'>('password');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const latestVersion = versions[0];
  const isSigned = draft.status === 'signed';
  const dirty = (latestVersion?.body ?? '') !== editorBody;

  const compareTo = useMemo(() => versions[1] ?? null, [versions]);

  const refresh = () => {
    startTransition(async () => {
      const res = await fetch(`/api/ai/drafts/${draft.id}`);
      if (!res.ok) return;
      const j = (await res.json()) as { draft: DraftRecord; versions: DraftVersionRecord[] };
      setDraft(j.draft);
      setVersions(j.versions);
      if (j.versions[0]) setEditorBody(j.versions[0].body);
    });
  };

  const saveNewVersion = () => {
    if (!dirty) return;
    if (!editReason.trim()) {
      setError('Reason for change is required (21 CFR Part 11).');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/ai/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editorBody, reason: editReason }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Save failed');
        return;
      }
      setEditReason('');
      refresh();
    });
  };

  const transition = (action: Exclude<DraftStatus, 'signed'>) => {
    startTransition(async () => {
      const res = await fetch(`/api/ai/drafts/${draft.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Action failed');
        return;
      }
      const { draft: updated } = (await res.json()) as { draft: DraftRecord };
      setDraft(updated);
    });
  };

  const sign = () => {
    if (!signReason.trim()) {
      setError('Reason for record is required to e-sign.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/ai/drafts/${draft.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign', reason: signReason, method: signMethod }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Sign failed');
        return;
      }
      setSignOpen(false);
      setSignReason('');
      router.refresh();
      refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_BADGE[draft.status].variant} className="text-[10px]">
            {STATUS_BADGE[draft.status].label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            v{draft.currentVersion} &bull; {draft.kind} &bull; updated {new Date(draft.updatedAt).toLocaleString()}
          </span>
          {draft.signedAt && (
            <span className="text-[11px] text-muted-foreground">
              signed {new Date(draft.signedAt).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!isSigned && draft.status !== 'in_review' && (
            <Button size="sm" variant="outline" onClick={() => transition('in_review')} disabled={isPending}>
              <PenLine className="mr-1.5 h-3.5 w-3.5" /> Send for review
            </Button>
          )}
          {!isSigned && draft.status === 'in_review' && (
            <>
              <Button size="sm" variant="outline" onClick={() => transition('approved')} disabled={isPending}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => transition('rejected')} disabled={isPending}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
          {!isSigned && (
            <Button size="sm" onClick={() => setSignOpen(true)} disabled={isPending || dirty}>
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> E-sign
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="diff">
            <History className="mr-1.5 h-3.5 w-3.5" /> Versions ({versions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-3 pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Original / current saved version */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-xs font-normal text-muted-foreground">
                  <span>Saved (v{latestVersion?.version ?? 1})</span>
                  {latestVersion?.reason && <span className="text-[10px]">{latestVersion.reason}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-xs leading-relaxed">
                  {latestVersion?.body ?? '(no body)'}
                </pre>
              </CardContent>
            </Card>

            {/* Editor */}
            <Card className={dirty ? 'border-[var(--copilot-accent)]' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-xs font-normal text-muted-foreground">
                  <span>Editing</span>
                  {dirty && (
                    <span className="text-[10px]" style={{ color: 'var(--copilot-accent)' }}>
                      Unsaved changes
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={editorBody}
                  onChange={e => setEditorBody(e.target.value)}
                  rows={16}
                  disabled={isSigned}
                  className="font-mono text-xs"
                />
                {!isSigned && (
                  <div className="space-y-2">
                    <Input
                      value={editReason}
                      onChange={e => setEditReason(e.target.value)}
                      placeholder="Reason for change (required)"
                      disabled={!dirty}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={saveNewVersion} disabled={!dirty || isPending}>
                        <Save className="mr-1.5 h-3.5 w-3.5" /> Save new version
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" /> {error}
            </p>
          )}
        </TabsContent>

        <TabsContent value="diff" className="space-y-3 pt-4">
          {compareTo ? (
            <p className="text-xs text-muted-foreground">
              Latest changes vs v{compareTo.version} ({new Date(compareTo.createdAt).toLocaleString()})
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Only one version. Save changes to compare.</p>
          )}

          <ul className="divide-y rounded-md border">
            {versions.map(v => (
              <li key={v.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-normal">
                    v{v.version} &bull; {new Date(v.createdAt).toLocaleString()}
                  </p>
                  {v.reason && (
                    <p className="text-[11px] text-muted-foreground">Reason: {v.reason}</p>
                  )}
                  <details className="text-[11px]">
                    <summary className="cursor-pointer text-muted-foreground">View body</summary>
                    <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px] leading-relaxed">
                      {v.body}
                    </pre>
                  </details>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={isSigned}
                  onClick={() => setEditorBody(v.body)}
                >
                  Restore to editor
                </Button>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      {/* E-sign dialog */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" style={{ color: 'var(--copilot-accent)' }} /> E-sign draft
            </DialogTitle>
            <DialogDescription>
              Signing locks the current version (v{draft.currentVersion}) and creates an immutable audit entry. 21 CFR Part 11 requires a reason for record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Method</label>
              <Select value={signMethod} onValueChange={v => setSignMethod(v as typeof signMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="sso">SSO</SelectItem>
                  <SelectItem value="webauthn">Passkey / WebAuthn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Reason for record</label>
              <Textarea
                value={signReason}
                onChange={e => setSignReason(e.target.value)}
                rows={3}
                placeholder='e.g. "Final review complete; ready to send to PI."'
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSignOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={sign} disabled={!signReason.trim() || isPending}>
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
