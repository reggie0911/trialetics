'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ExternalLink, Loader2, MessageSquare, Paperclip } from 'lucide-react';

import {
  createFinanceEntityComment,
  deleteFinanceEntityAttachment,
  getFinanceDocumentSignedUrl,
  getFinanceEntityAuditLogs,
  listFinanceEntityComments,
  updateFinanceEntityComment,
  uploadFinanceEntityAttachment,
} from '@/lib/actions/study-finance-module';
import type { FmAuditLog, FmEntityComment } from '@/lib/finance-module/types';
import { useFinanceMutation } from '@/hooks/use-finance-mutation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
export type FinanceEntityAttachmentConfig =
  | {
      kind: 'invoice';
      invoiceId: string;
      storagePath: string | null;
      rowUpdatedAt: string;
      allowMutate: boolean;
    }
  | {
      kind: 'contract';
      contractId: string;
      storagePath: string | null;
      rowUpdatedAt: string;
      allowMutate: boolean;
    };

interface FinanceEntityDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  entityType: string;
  entityId: string;
  title: string;
  overview: ReactNode;
  /** Optional tab: linked records, chips, etc. */
  related?: ReactNode;
  /** When set, shows Attachments tab (invoice / contract). */
  attachments?: FinanceEntityAttachmentConfig;
  /** Required for comment author checks and @-mention badge. */
  currentUserId?: string | null;
  onEntityUpdated?: () => void;
}

function extractMentionUserIds(body: string): string[] {
  const re =
    /@([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/gi;
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) ids.add(m[1].toLowerCase());
  return [...ids];
}

/**
 * Right-side drawer: Overview, optional Related, Attachments (when configured),
 * Comments, Audit.
 */
export function FinanceEntityDetailSheet({
  open,
  onOpenChange,
  studyId,
  entityType,
  entityId,
  title,
  overview,
  related,
  attachments,
  currentUserId,
  onEntityUpdated,
}: FinanceEntityDetailSheetProps) {
  const [tab, setTab] = useState('overview');
  const showRelated = related != null;
  const showAttachments = attachments != null;

  useEffect(() => {
    if (!open) setTab('overview');
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(100vw,420px)] gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm">{title}</SheetTitle>
        </SheetHeader>
        <Tabs value={tab} onValueChange={setTab} className="gap-3 px-1">
          <TabsList className="h-auto min-h-8 w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            {showRelated ? (
              <TabsTrigger value="related" className="text-xs">
                Related
              </TabsTrigger>
            ) : null}
            {showAttachments ? (
              <TabsTrigger value="attachments" className="text-xs">
                Files
              </TabsTrigger>
            ) : null}
            <FinanceCommentsTabTrigger studyId={studyId} entityType={entityType} entityId={entityId} currentUserId={currentUserId} />
            <TabsTrigger value="audit" className="text-xs">
              Audit
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-2 text-xs">
            {overview}
          </TabsContent>
          {showRelated ? (
            <TabsContent value="related" className="mt-2 text-xs">
              {related}
            </TabsContent>
          ) : null}
          {showAttachments && attachments ? (
            <TabsContent value="attachments" className="mt-2">
              <FinanceAttachmentsTab
                studyId={studyId}
                config={attachments}
                onEntityUpdated={onEntityUpdated}
              />
            </TabsContent>
          ) : null}
          <TabsContent value="comments" className="mt-2">
            <FinanceCommentsTabBody
              studyId={studyId}
              entityType={entityType}
              entityId={entityId}
              currentUserId={currentUserId}
              onEntityUpdated={onEntityUpdated}
            />
          </TabsContent>
          <TabsContent value="audit" className="mt-2">
            <FinanceAuditTab studyId={studyId} entityType={entityType} entityId={entityId} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function FinanceCommentsTabTrigger({
  studyId,
  entityType,
  entityId,
  currentUserId,
}: {
  studyId: string;
  entityType: string;
  entityId: string;
  currentUserId?: string | null;
}) {
  const q = useQuery({
    queryKey: ['finance-entity-comments', studyId, entityType, entityId],
    queryFn: async () => {
      const r = await listFinanceEntityComments(studyId, entityType, entityId);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
    enabled: Boolean(studyId && entityType && entityId),
  });
  const rows = q.data ?? [];
  const mentionUnread = useMemo(() => {
    if (!currentUserId) return 0;
    const me = currentUserId.toLowerCase();
    return rows.filter(
      (c) =>
        !c.resolved_at &&
        (c.mention_user_ids ?? []).some((id) => id.toLowerCase() === me),
    ).length;
  }, [rows, currentUserId]);

  return (
    <TabsTrigger value="comments" className="gap-1 text-xs">
      <MessageSquare className="size-3 opacity-70" />
      Comments
      {mentionUnread > 0 ? (
        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px] leading-none">
          {mentionUnread > 9 ? '9+' : mentionUnread}
        </Badge>
      ) : null}
    </TabsTrigger>
  );
}

function FinanceCommentsTabBody({
  studyId,
  entityType,
  entityId,
  currentUserId,
  onEntityUpdated,
}: {
  studyId: string;
  entityType: string;
  entityId: string;
  currentUserId?: string | null;
  onEntityUpdated?: () => void;
}) {
  const [draft, setDraft] = useState('');
  const q = useQuery({
    queryKey: ['finance-entity-comments', studyId, entityType, entityId],
    queryFn: async () => {
      const r = await listFinanceEntityComments(studyId, entityType, entityId);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
    enabled: Boolean(studyId && entityType && entityId),
  });

  const createMut = useFinanceMutation(
    (body: string) =>
      createFinanceEntityComment({
        studyId,
        entityType,
        entityId,
        body,
        mentionUserIds: extractMentionUserIds(body),
      }),
    {
      successToast: 'Comment added.',
      invalidateKeys: [['finance-entity-comments', studyId, entityType, entityId]],
      onResult: () => {
        onEntityUpdated?.();
      },
    },
  );

  const toggleResolved = useFinanceMutation(
    (input: { id: string; updatedAt: string; resolved: boolean }) =>
      updateFinanceEntityComment({
        studyId,
        id: input.id,
        updatedAt: input.updatedAt,
        resolved: input.resolved,
      }),
    {
      invalidateKeys: [['finance-entity-comments', studyId, entityType, entityId]],
      onResult: () => onEntityUpdated?.(),
    },
  );

  const post = () => {
    const body = draft.trim();
    if (!body) return;
    createMut.mutate(body, {
      onSuccess: (result) => {
        if (!result.error) setDraft('');
      },
    });
  };

  if (q.isLoading) return <p className="text-[11px] text-muted-foreground">Loading comments…</p>;
  if (q.isError) return <p className="text-[11px] text-destructive">{(q.error as Error).message}</p>;

  const rows = q.data ?? [];

  return (
    <div className="space-y-3">
      <ul className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <li className="text-[11px] text-muted-foreground">No comments yet.</li>
        ) : (
          rows.map((c) => (
            <li key={c.id} className="rounded-md border border-border/80 bg-muted/15 p-2 text-[11px]">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-foreground">{c.body}</p>
                {currentUserId && c.created_by === currentUserId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 px-1.5 text-[10px]"
                    disabled={toggleResolved.isPending}
                    onClick={() =>
                      toggleResolved.mutate({
                        id: c.id,
                        updatedAt: c.updated_at,
                        resolved: !c.resolved_at,
                      })
                    }
                  >
                    {c.resolved_at ? 'Reopen' : 'Resolve'}
                  </Button>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{format(new Date(c.created_at), 'yyyy-MM-dd HH:mm')}</span>
                {c.resolved_at ? <span className="text-emerald-600">Resolved</span> : null}
                {(c.mention_user_ids ?? []).length > 0 ? (
                  <span className="text-muted-foreground">@mentions</span>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
      <div className="space-y-2 border-t border-border/60 pt-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment. Mention someone with @ followed by their user UUID."
          rows={3}
          className="text-[11px]"
          disabled={!currentUserId || createMut.isPending}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            disabled={!currentUserId || createMut.isPending || !draft.trim()}
            onClick={post}
          >
            {createMut.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Post'}
          </Button>
        </div>
        {!currentUserId ? (
          <p className="text-[10px] text-muted-foreground">Sign in to post comments.</p>
        ) : null}
      </div>
    </div>
  );
}

function FinanceAttachmentsTab({
  studyId,
  config,
  onEntityUpdated,
}: {
  studyId: string;
  config: FinanceEntityAttachmentConfig;
  onEntityUpdated?: () => void;
}) {
  const [rowUpdatedAt, setRowUpdatedAt] = useState(config.rowUpdatedAt);
  const [storagePath, setStoragePath] = useState(config.storagePath);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRowUpdatedAt(config.rowUpdatedAt);
    setStoragePath(config.storagePath);
  }, [config.rowUpdatedAt, config.storagePath]);

  const entityKind = config.kind;
  const entityId = config.kind === 'invoice' ? config.invoiceId : config.contractId;

  const signedUrlQ = useQuery({
    queryKey: ['finance-doc-signed', studyId, storagePath],
    queryFn: async () => {
      if (!storagePath) return null;
      const r = await getFinanceDocumentSignedUrl({ studyId, storagePath });
      if (r.error) throw new Error(r.error);
      return r.url;
    },
    enabled: Boolean(storagePath && studyId),
    staleTime: 3000,
  });

  const uploadMut = useFinanceMutation(
    (file: File) => {
      const fd = new FormData();
      fd.append('studyId', studyId);
      fd.append('entityKind', entityKind);
      fd.append('entityId', entityId);
      fd.append('updatedAt', rowUpdatedAt);
      fd.append('file', file);
      return uploadFinanceEntityAttachment(fd);
    },
    {
      successToast: 'File uploaded.',
      onResult: (r) => {
        if (!r.error && r.data) {
          setRowUpdatedAt((r.data as { updated_at: string }).updated_at);
          setStoragePath((r.data as { storage_path: string | null }).storage_path);
        }
        onEntityUpdated?.();
      },
    },
  );

  const deleteMut = useFinanceMutation(
    () =>
      deleteFinanceEntityAttachment({
        studyId,
        entityKind,
        entityId,
        updatedAt: rowUpdatedAt,
      }),
    {
      successToast: 'Attachment removed.',
      onResult: (r) => {
        if (!r.error && r.data) {
          setRowUpdatedAt((r.data as { updated_at: string }).updated_at);
          setStoragePath((r.data as { storage_path: string | null }).storage_path);
        }
        onEntityUpdated?.();
      },
    },
  );

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) uploadMut.mutate(f);
  };

  return (
    <div className="space-y-3 text-[11px]">
      {storagePath ? (
        <div className="flex flex-wrap items-center gap-2">
          {signedUrlQ.data ? (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
              <a href={signedUrlQ.data} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3" />
                Open file
              </a>
            </Button>
          ) : signedUrlQ.isLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <span className="text-destructive">{signedUrlQ.error?.message ?? 'Could not load link.'}</span>
          )}
          {config.allowMutate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate(undefined)}
            >
              Remove
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground">No file attached.</p>
      )}
      {config.allowMutate ? (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={onPickFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={uploadMut.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="size-3" />
            {storagePath ? 'Replace' : 'Upload'}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">
          {entityKind === 'invoice'
            ? 'Switch this invoice to draft to change attachments.'
            : 'You do not have permission to change this file.'}
        </p>
      )}
    </div>
  );
}

function FinanceAuditTab({
  studyId,
  entityType,
  entityId,
}: {
  studyId: string;
  entityType: string;
  entityId: string;
}) {
  const q = useQuery({
    queryKey: ['finance-entity-audit', studyId, entityType, entityId],
    queryFn: async () => {
      const r = await getFinanceEntityAuditLogs(studyId, entityType, entityId, 80);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
    enabled: Boolean(studyId && entityType && entityId),
  });

  if (q.isLoading) return <p className="text-[11px] text-muted-foreground">Loading history…</p>;
  if (q.isError) return <p className="text-[11px] text-destructive">{(q.error as Error).message}</p>;
  const rows = q.data ?? [];
  if (rows.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No audit entries yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((row: FmAuditLog) => (
        <li key={row.id} className="rounded-md border border-border/80 bg-muted/20 p-2 text-[11px]">
          <div className="font-medium text-foreground">{row.action}</div>
          <div className="text-muted-foreground">
            {format(new Date(row.created_at), 'yyyy-MM-dd HH:mm')}
          </div>
        </li>
      ))}
    </ul>
  );
}
