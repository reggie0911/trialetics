'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import {
  createEisfDocument,
  createEisfDocumentRequest,
  fulfillEisfRequest,
  updateEisfRequestStatus,
} from '@/lib/actions/eisf';
import type { EisfDocument, EisfDocumentCategory, EisfDocumentRequest, EisfSiteFolder } from '@/lib/types/eisf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusLabel: Record<string, string> = {
  missing: 'Missing',
  uploaded: 'Uploaded',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

const requestStatusLabel: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'approved'
      ? 'default'
      : status === 'missing' || status === 'rejected'
        ? 'destructive'
        : 'secondary';
  return (
    <Badge variant={variant as 'default' | 'secondary' | 'destructive'} className="text-[10px] font-normal">
      {statusLabel[status] ?? status}
    </Badge>
  );
}

export function EisfFolderWorkspace({
  folder,
  initialDocuments,
  initialRequests,
  categories,
}: {
  folder: EisfSiteFolder;
  initialDocuments: EisfDocument[];
  initialRequests: EisfDocumentRequest[];
  categories: EisfDocumentCategory[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [docOpen, setDocOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [fulfillOpen, setFulfillOpen] = useState<EisfDocumentRequest | null>(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [reqTitle, setReqTitle] = useState('');
  const [reqInstructions, setReqInstructions] = useState('');
  const [reqDue, setReqDue] = useState('');
  const [autoDoc, setAutoDoc] = useState(true);
  const [fulfillDocId, setFulfillDocId] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const categoryLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) {
      m.set(c.id, c.name);
    }
    return m;
  }, [categories]);

  const docTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of initialDocuments) {
      m.set(d.id, d.title);
    }
    return m;
  }, [initialDocuments]);

  const categorySelectLabel = useCallback(
    (value: string | null) => {
      if (value == null || value === '' || value === '__none__') return 'No Category';
      return categoryLabelById.get(value) ?? 'Category';
    },
    [categoryLabelById]
  );

  const fulfillDocSelectLabel = useCallback(
    (value: string | null) => {
      if (value == null || value === '') return null;
      return docTitleById.get(value) ?? 'Document';
    },
    [docTitleById]
  );

  const createDoc = () => {
    setErr(null);
    if (!title.trim()) {
      setErr('Title is required');
      return;
    }
    startTransition(async () => {
      const res = await createEisfDocument({
        folder_id: folder.id,
        title: title.trim(),
        category_id: categoryId || null,
        tmf_ref_id: null,
        primary_staff_member_id: null,
        primary_site_contact_id: null,
      });
      if (!res.success) {
        setErr(res.error ?? 'Failed');
        return;
      }
      setDocOpen(false);
      setTitle('');
      setCategoryId('');
      router.refresh();
    });
  };

  const submitRequest = () => {
    setErr(null);
    if (!reqTitle.trim()) {
      setErr('Title is required');
      return;
    }
    startTransition(async () => {
      const res = await createEisfDocumentRequest({
        folder_id: folder.id,
        title: reqTitle.trim(),
        instructions: reqInstructions,
        due_date: reqDue || null,
        auto_create_document: autoDoc,
      });
      if (!res.success) {
        setErr(res.error ?? 'Failed');
        return;
      }
      setReqOpen(false);
      setReqTitle('');
      setReqInstructions('');
      setReqDue('');
      router.refresh();
    });
  };

  const submitFulfill = () => {
    if (!fulfillOpen || !fulfillDocId) return;
    const doc = initialDocuments.find((d) => d.id === fulfillDocId);
    if (!doc?.current_version_id) {
      setErr('Choose a document that has an uploaded file');
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await fulfillEisfRequest({
        request_id: fulfillOpen.id,
        document_id: doc.id,
        version_id: doc.current_version_id!,
      });
      if (!res.success) {
        setErr(res.error ?? 'Failed');
        return;
      }
      setFulfillOpen(null);
      setFulfillDocId('');
      router.refresh();
    });
  };

  return (
    <Tabs tabsId="eisf-folder" defaultValue="documents" className="space-y-4">
      <TabsList>
        <TabsTrigger value="documents" className="text-xs">
          Documents
        </TabsTrigger>
        <TabsTrigger value="requests" className="text-xs">
          Document requests
        </TabsTrigger>
      </TabsList>

      <TabsContent value="documents" className="space-y-3">
        <div className="flex justify-end">
          <Button type="button" size="sm" className="text-[12px]" onClick={() => setDocOpen(true)}>
            Add document
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground py-8 text-center">
                    No documents. Add one or apply required-document rules.
                  </TableCell>
                </TableRow>
              ) : (
                initialDocuments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-[12px] font-medium">{d.title}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {(d.category as EisfDocumentCategory | null | undefined)?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm" className="text-[12px]">
                        <Link href={`/protected/eisf/documents/${d.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="requests" className="space-y-3">
        <div className="flex justify-end">
          <Button type="button" size="sm" className="text-[12px]" onClick={() => setReqOpen(true)}>
            Request document from site
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground py-8 text-center">
                    No requests yet.
                  </TableCell>
                </TableRow>
              ) : (
                initialRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-[12px] font-medium">{r.title}</TableCell>
                    <TableCell className="text-[12px]">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {requestStatusLabel[r.status] ?? r.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{r.due_date ?? '—'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {(r.status === 'open' || r.status === 'in_progress') && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-[12px]"
                            disabled={pending}
                            onClick={() => {
                              setFulfillOpen(r);
                              setFulfillDocId('');
                              setErr(null);
                            }}
                          >
                            Fulfill
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-[12px]"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                await updateEisfRequestStatus({ id: r.id, status: 'cancelled' });
                                router.refresh();
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {err && <p className="text-xs text-destructive">{err}</p>}

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Document Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-[12px] h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category (Optional)</Label>
              <Select value={categoryId || '__none__'} onValueChange={(v) => setCategoryId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="text-[12px] h-9 min-w-[200px]">
                  <SelectValue placeholder="Select Category" getDisplayLabel={categorySelectLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-[12px]">
                    No Category
                  </SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-[12px]">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={() => setDocOpen(false)}>
              Close
            </Button>
            <Button type="button" size="sm" className="text-[12px]" disabled={pending} onClick={createDoc}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request document from site</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">What Do You Need?</Label>
              <Input value={reqTitle} onChange={(e) => setReqTitle(e.target.value)} className="text-[12px] h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Instructions for the Site</Label>
              <Textarea
                value={reqInstructions}
                onChange={(e) => setReqInstructions(e.target.value)}
                className="text-[12px] min-h-[80px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date (Optional)</Label>
              <Input type="date" value={reqDue} onChange={(e) => setReqDue(e.target.value)} className="text-[12px] h-9" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="auto" checked={autoDoc} onCheckedChange={setAutoDoc} />
              <Label htmlFor="auto" className="text-xs font-normal">
                Create a matching placeholder document in this folder
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={() => setReqOpen(false)}>
              Close
            </Button>
            <Button type="button" size="sm" className="text-[12px]" disabled={pending} onClick={submitRequest}>
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fulfillOpen} onOpenChange={(o) => !o && setFulfillOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link request to a document</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Choose the site document version that satisfies this request. The document must already have a file
            uploaded.
          </p>
            <div className="space-y-1.5">
            <Label className="text-xs">Document</Label>
            <Select value={fulfillDocId} onValueChange={setFulfillDocId}>
              <SelectTrigger className="text-[12px] h-9 min-w-[200px]">
                <SelectValue placeholder="Select Document" getDisplayLabel={fulfillDocSelectLabel} />
              </SelectTrigger>
              <SelectContent>
                {initialDocuments
                  .filter((d) => d.current_version_id)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-[12px]">
                      {d.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={() => setFulfillOpen(null)}>
              Close
            </Button>
            <Button type="button" size="sm" className="text-[12px]" disabled={pending || !fulfillDocId} onClick={submitFulfill}>
              Mark fulfilled
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
