'use client';

import { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Send, Download, MessageSquareOff, Plus, Trash2, CheckCircle2, Circle, AlertTriangle, Loader2, Upload, ChevronDown, Undo2, XCircle, ShieldAlert, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  SUBJECT_CRF_METRICS,
  SUBJECT_CRF_METRIC_LABELS,
  SUBJECT_CRF_METRIC_SHORT_LABELS,
  SUBJECT_CRF_QUERY_STATUS_LABELS,
  type SubjectCrfMetricKey,
  type SubjectCrfPercentages,
} from '@/lib/types/ctms';
import {
  ATTACHMENT_LIMITS_HELPER_TEXT,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_REPORT,
  isDeclaredTypeAllowed,
} from '@/lib/visit-report-attachments-policy';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  saveReportDraft,
  submitReport,
  recallReport,
  voidApproval,
  startReview,
  returnReport,
  approveReport,
  saveReviewerComments,
  type TripReportSectionReviewerComments,
  linkReportToTemplate,
  addAttendee,
  removeAttendee,
  removeCrfEntry,
  addActionItem,
  updateActionItem,
  uploadVisitReportAttachment,
  deleteVisitReportAttachment,
  getAttachmentDownloadUrl,
  markDocumentNotAvailable,
  type DocAvailabilityKey,
  type DocReasonKey,
} from '@/lib/actions/visit-reports';
import type {
  TripReportAttendee,
  TripReportCrfEntry,
  TripReportActionItem,
  TripReportAttachment,
  TripReportStatusEventRow,
  TemplateWithQuestionCount,
} from '@/lib/actions/visit-reports';
import type { VisitReportTemplate, VisitReportTemplateQuestion } from '@/lib/types/visit-reports';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  QUESTION_RESPONSE_LABELS,
  VISIT_REPORT_TYPE_LABELS,
  formatVisitReportStatusLabel,
  formatTripReportAuditEventNote,
} from '@/lib/types/visit-reports';
import { formatSignatureDisplayDateTime } from '@/lib/utils/visit-report-signature';
import { studySelectLabel } from '@/lib/ctms/study-display';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SITE_ATTENDEE_ROLE_OPTIONS, SPONSOR_ATTENDEE_ROLE_OPTIONS, SECTION_HEADER_STYLE } from '@/lib/constants/visit-reports';
import { MonitoredCrfsPicker } from './monitored-crfs-picker';

/** Visit row from trip report details (monitoring_visits + study/site joins). */
type VisitReportAuthoringVisit = {
  visit_type?: string | null;
  visit_name?: string | null;
  site_id?: string | null;
  study_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  planned_date?: string | null;
  studies?: { id?: string; title?: string; study_name?: string | null; protocol_number?: string } | null;
  study_sites?: {
    name?: string;
    site_number?: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    pi_name?: string | null;
    pi_email?: string | null;
    study_countries?: { country_name?: string } | null;
  } | null;
};

/** Trip report row passed from getTripReportWithDetails (fields used in this UI). */
type VisitReportAuthoringReport = {
  id: string;
  narrative?: string | null;
  report_status?: string | null;
  status?: string | null;
  reviewer_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  template_id?: string | null;
  author_submission_signature_data?: string | null;
  author_submission_signed_at?: string | null;
  author_submission_printed_name?: string | null;
  author_submission_attestation_text?: string | null;
  author_submission_signed_at_db?: string | null;
  author_submission_content_hash?: string | null;
  submitted_date?: string | null;
  approval_signature_data?: string | null;
  approval_signed_at?: string | null;
  approval_printed_name?: string | null;
  approval_attestation_text?: string | null;
  approval_signed_at_db?: string | null;
  approval_content_hash?: string | null;
  approved_date?: string | null;
  reviewer_comments_site_attendees?: string | null;
  reviewer_comments_sponsor_attendees?: string | null;
  reviewer_comments_monitored_crfs?: string | null;
  reviewer_comments_narrative?: string | null;
  reviewer_comments_open_actions?: string | null;
  reviewer_comments_attachments?: string | null;
  monitoring_visit_log_available?: 'yes' | 'no' | null;
  visit_confirmation_letter_available?: 'yes' | 'no' | null;
  visit_followup_letter_available?: 'yes' | 'no' | null;
  monitoring_visit_log_unavailable_reason?: string | null;
  visit_confirmation_letter_unavailable_reason?: string | null;
  visit_followup_letter_unavailable_reason?: string | null;
};

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SignatureCaptureModal } from '@/components/ctms/trip-reports/signature-capture-modal';
import { DigitalSignatureBlock } from '@/components/ctms/trip-reports/digital-signature-block';
import { downloadVisitReportPdf } from '@/lib/utils/visit-report-pdf';
import {
  sectionReviewerStateFromReport,
  groupQuestionsIntoOrderedSections,
  buildVisitReportPdfData,
  type SectionReviewerCommentsState,
} from '@/lib/utils/build-visit-report-pdf-data';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '—';
  }
}

/**
 * Split a free-text "Full Name" into first / last for the
 * `trip_report_attendees` schema. Requires at least two tokens; the last
 * whitespace-separated token becomes `last_name`, everything before it
 * becomes `first_name` (so "Mary Anne Smith" → `Mary Anne` / `Smith`).
 */
function splitFullName(raw: string): { first_name: string; last_name: string } | null {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const last_name = parts.pop() as string;
  const first_name = parts.join(' ');
  return { first_name, last_name };
}

type AttendeesSectionProps = {
  title: string;
  attendees: TripReportAttendee[];
  roleOptions: readonly string[];
  canEdit: boolean;
  isPending: boolean;
  /** Returns true when the underlying add succeeded (so the editor can collapse). */
  onAdd: (input: { first_name: string; last_name: string; role: string }) => Promise<boolean>;
  onRemove: (id: string) => void;
  reviewerNotesSlot: React.ReactNode;
};

/**
 * Shared Site / Sponsor attendees card. Renders a single-line `Name — Role`
 * list with a header `+ Add attendee` trigger that swaps to `Cancel` while an
 * inline editor (Full Name + Role + Save) is open. Save closes the editor on
 * success; Esc / Cancel discards the draft. No data sources beyond free text.
 */
function AttendeesSection({
  title,
  attendees,
  roleOptions,
  canEdit,
  isPending,
  onAdd,
  onRemove,
  reviewerNotesSlot,
}: AttendeesSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const fullNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const t = window.setTimeout(() => fullNameInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isEditing]);

  const openEditor = () => {
    setFullName('');
    setRole('');
    setIsEditing(true);
  };

  const closeEditor = () => {
    setFullName('');
    setRole('');
    setIsEditing(false);
  };

  const submit = async () => {
    const split = splitFullName(fullName);
    if (!split) {
      toast.error('Enter a first and last name.');
      return;
    }
    const ok = await onAdd({ ...split, role: role.trim() });
    if (ok) closeEditor();
  };

  const emptyLabel = `No ${title.toLowerCase()} added.`;

  return (
    <Card className="py-2">
      <CardHeader className={cn(SECTION_HEADER_STYLE, 'flex flex-row items-center justify-between gap-2')}>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground dark:text-white">{title}</h2>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{attendees.length}</Badge>
        </div>
        {canEdit ? (
          isEditing ? (
            <Button variant="ghost" size="sm" onClick={closeEditor} disabled={isPending}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={openEditor}>
              <Plus className="mr-1.5 h-4 w-4" /> Add attendee
            </Button>
          )
        ) : null}
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {attendees.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )}
        {attendees.map((a) => (
          <div
            key={a.id}
            className="group flex items-center gap-2 rounded border p-2 text-sm"
          >
            <div className="min-w-0 flex-1 truncate">
              <span className="font-medium">
                {a.first_name} {a.last_name}
              </span>
              {a.role ? (
                <span className="text-muted-foreground"> — {a.role}</span>
              ) : null}
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-60 group-hover:opacity-100"
                onClick={() => onRemove(a.id)}
                aria-label="Remove attendee"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {canEdit && isEditing && (
          <div className="rounded-md border border-dashed border-border p-3">
            <p className="pb-2 text-xs font-medium text-muted-foreground">New attendee</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                ref={fullNameInputRef}
                className="h-9 flex-1 text-xs"
                placeholder="Full Name (e.g. John Doe)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void submit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeEditor();
                  }
                }}
              />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 w-full text-xs sm:w-56">
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => void submit()}
                disabled={isPending || !fullName.trim()}
                className="sm:shrink-0"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Save
              </Button>
            </div>
          </div>
        )}
        {reviewerNotesSlot}
      </CardContent>
    </Card>
  );
}

type OpenActionItemDraft = { description: string; due_date: string };
type OpenActionEditingId = 'new' | string | null;
type PendingDiscardAction =
  | { kind: 'cancelEditor' }
  | { kind: 'switchTo'; targetId: 'new' | string };

const EMPTY_ACTION_ITEM_DRAFT: OpenActionItemDraft = { description: '', due_date: '' };

type OpenActionItemsSectionProps = {
  items: TripReportActionItem[];
  canEdit: boolean;
  isPending: boolean;
  /** Returns true when the underlying add succeeded (so the editor can collapse). */
  onAdd: (input: OpenActionItemDraft) => Promise<boolean>;
  /** Returns true when the underlying update succeeded (so the editor can collapse). */
  onUpdate: (itemId: string, input: OpenActionItemDraft) => Promise<boolean>;
  onClose: (itemId: string) => void;
  /** When non-null, prefills and opens the New editor (e.g. from a question's "Create action item"). */
  pendingDescription: string | null;
  onConsumePendingDescription: () => void;
  reviewerNotesSlot: React.ReactNode;
};

/**
 * Open Action Items card with a header Add toggle, hover-revealed Edit (pencil)
 * and Close buttons per row, and a single inline editor (Description + required
 * Due Date) used for both new and existing items. Switching editors or
 * cancelling with unsaved changes triggers a confirm-discard AlertDialog.
 */
function OpenActionItemsSection({
  items,
  canEdit,
  isPending,
  onAdd,
  onUpdate,
  onClose,
  pendingDescription,
  onConsumePendingDescription,
  reviewerNotesSlot,
}: OpenActionItemsSectionProps) {
  const [editingId, setEditingId] = useState<OpenActionEditingId>(null);
  const [draft, setDraft] = useState<OpenActionItemDraft>(EMPTY_ACTION_ITEM_DRAFT);
  const [originalDraft, setOriginalDraft] = useState<OpenActionItemDraft>(EMPTY_ACTION_ITEM_DRAFT);
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscardAction | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = useMemo(
    () => draft.description !== originalDraft.description || draft.due_date !== originalDraft.due_date,
    [draft, originalDraft]
  );

  // Seed editor from a "Create action item from question" trigger.
  useEffect(() => {
    if (pendingDescription == null) return;
    setDraft({ description: pendingDescription, due_date: '' });
    setOriginalDraft(EMPTY_ACTION_ITEM_DRAFT);
    setEditingId('new');
    onConsumePendingDescription();
  }, [pendingDescription, onConsumePendingDescription]);

  useEffect(() => {
    if (editingId === null) return;
    const t = window.setTimeout(() => descriptionInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [editingId]);

  const openNewEditor = () => {
    setDraft(EMPTY_ACTION_ITEM_DRAFT);
    setOriginalDraft(EMPTY_ACTION_ITEM_DRAFT);
    setEditingId('new');
  };

  const openEditEditorFor = (item: TripReportActionItem) => {
    const seed: OpenActionItemDraft = {
      description: item.description ?? '',
      due_date: item.due_date ?? '',
    };
    setDraft(seed);
    setOriginalDraft(seed);
    setEditingId(item.id);
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft(EMPTY_ACTION_ITEM_DRAFT);
    setOriginalDraft(EMPTY_ACTION_ITEM_DRAFT);
  };

  const requestSwitchTo = (target: 'new' | string) => {
    if (editingId === target) return;
    if (editingId !== null && isDirty) {
      setPendingDiscard({ kind: 'switchTo', targetId: target });
      return;
    }
    if (target === 'new') {
      openNewEditor();
    } else {
      const it = items.find((i) => i.id === target);
      if (it) openEditEditorFor(it);
    }
  };

  const requestCancel = () => {
    if (editingId === null) return;
    if (isDirty) {
      setPendingDiscard({ kind: 'cancelEditor' });
      return;
    }
    closeEditor();
  };

  const confirmDiscard = () => {
    const action = pendingDiscard;
    setPendingDiscard(null);
    if (!action) return;
    if (action.kind === 'cancelEditor') {
      closeEditor();
      return;
    }
    if (action.targetId === 'new') {
      openNewEditor();
    } else {
      const it = items.find((i) => i.id === action.targetId);
      if (it) openEditEditorFor(it);
      else closeEditor();
    }
  };

  const cancelDiscard = () => setPendingDiscard(null);

  const submit = async () => {
    if (editingId === null) return;
    const description = draft.description.trim();
    if (!description) {
      toast.error('Description is required.');
      return;
    }
    if (!draft.due_date) {
      toast.error('Due date is required.');
      return;
    }
    const ok =
      editingId === 'new'
        ? await onAdd({ description, due_date: draft.due_date })
        : await onUpdate(editingId, { description, due_date: draft.due_date });
    if (ok) closeEditor();
  };

  const renderEditor = (label: string) => (
    <div className="rounded-md border border-dashed border-border p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1">
        <Label htmlFor="open-action-item-description" className="text-xs font-normal text-muted-foreground">
          Description <span className="text-red-600">*</span>
        </Label>
        <Textarea
          id="open-action-item-description"
          ref={descriptionInputRef}
          rows={3}
          className="text-xs"
          placeholder="Describe the action item..."
          value={draft.description}
          onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              requestCancel();
            }
          }}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Label htmlFor="open-action-item-due-date" className="text-xs font-normal text-muted-foreground">
            Due Date <span className="text-red-600">*</span>
          </Label>
          <Input
            id="open-action-item-due-date"
            type="date"
            className="h-9 w-40 text-xs"
            value={draft.due_date}
            onChange={(e) => setDraft((s) => ({ ...s, due_date: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button variant="ghost" size="sm" onClick={requestCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={isPending || !draft.description.trim() || !draft.due_date}
          >
            {editingId === 'new' ? 'Save action item' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="py-2">
      <CardHeader className={cn(SECTION_HEADER_STYLE, 'flex flex-row items-center justify-between gap-2')}>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Open Action Items</h2>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{items.length}</Badge>
        </div>
        {canEdit ? (
          editingId !== null ? (
            <Button variant="ghost" size="sm" onClick={requestCancel} disabled={isPending}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => requestSwitchTo('new')}>
              <Plus className="mr-1.5 h-4 w-4" /> Add action item
            </Button>
          )
        ) : null}
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {editingId === 'new' && renderEditor('New action item')}
        {items.length === 0 && editingId !== 'new' && (
          <p className="text-sm text-muted-foreground">No Action Items Open.</p>
        )}
        {items.map((item) =>
          editingId === item.id ? (
            <div key={item.id}>{renderEditor('Edit action item')}</div>
          ) : (
            <div
              key={item.id}
              className="group flex items-start justify-between gap-2 rounded border p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words">{item.description}</p>
                <p className="text-muted-foreground text-xs">
                  Due: {item.due_date ? formatDate(item.due_date) : '—'} · Open for {daysOpen(item.created_at)} day(s)
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-60 group-hover:opacity-100"
                    onClick={() => requestSwitchTo(item.id)}
                    disabled={isPending}
                    aria-label="Edit action item"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onClose(item.id)}
                    disabled={isPending}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          )
        )}
        {reviewerNotesSlot}
        <AlertDialog
          open={pendingDiscard !== null}
          onOpenChange={(open) => {
            if (!open) cancelDiscard();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes to this action item. If you continue, your edits will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDiscard}>Keep editing</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDiscard}>Discard</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Document checklist (Attachments card)
// =====================================================

type DocQuestion = {
  key: DocAvailabilityKey;
  label: string;
  category: string;
  reasonKey: DocReasonKey;
};

const DOC_QUESTIONS: DocQuestion[] = [
  {
    key: 'monitoring_visit_log_available',
    label: 'Monitoring Visit Log',
    category: 'Monitoring Visit Log',
    reasonKey: 'monitoring_visit_log_unavailable_reason',
  },
  {
    key: 'visit_confirmation_letter_available',
    label: 'Visit Confirmation Letter',
    category: 'Visit Confirmation Letter',
    reasonKey: 'visit_confirmation_letter_unavailable_reason',
  },
  {
    key: 'visit_followup_letter_available',
    label: 'Visit Follow-up Letter',
    category: 'Visit Follow-up Letter',
    reasonKey: 'visit_followup_letter_unavailable_reason',
  },
];

type DocStatus = 'pending' | 'uploaded' | 'unavailable';

function deriveDocStatus(answer: 'yes' | 'no' | null | undefined, attachment: TripReportAttachment | null): DocStatus {
  if (attachment) return 'uploaded';
  if (answer === 'no') return 'unavailable';
  return 'pending';
}

function DocStatusPill({ status }: { status: DocStatus }) {
  if (status === 'uploaded') return <Badge variant="success">Uploaded</Badge>;
  if (status === 'unavailable') return <Badge variant="secondary">Not available</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

type DocumentQuestionRowProps = {
  question: DocQuestion;
  status: DocStatus;
  attachment: TripReportAttachment | null;
  unavailableReason: string | null;
  canEdit: boolean;
  isUploading: boolean;
  isPending: boolean;
  onUploadClick(): void;
  onReplaceClick(): void;
  onDeleteAttachment(): void;
  onSaveUnavailable(reason: string): Promise<boolean>;
  onDownload(): void;
};

function DocumentQuestionRow({
  question,
  status,
  attachment,
  unavailableReason,
  canEdit,
  isUploading,
  isPending,
  onUploadClick,
  onReplaceClick,
  onDeleteAttachment,
  onSaveUnavailable,
  onDownload,
}: DocumentQuestionRowProps) {
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [reasonDraft, setReasonDraft] = useState(unavailableReason ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the textarea draft in sync when the persisted reason changes (e.g.
  // after a successful save) and the form is closed. While editing, the
  // draft is the user's typed text.
  useEffect(() => {
    if (!showReasonForm) {
      setReasonDraft(unavailableReason ?? '');
    }
  }, [unavailableReason, showReasonForm]);

  const openReasonForm = () => {
    setReasonDraft(unavailableReason ?? '');
    setShowReasonForm(true);
    setTimeout(() => reasonInputRef.current?.focus(), 0);
  };

  const requestMarkUnavailable = () => {
    openReasonForm();
  };

  const handleSaveReason = async () => {
    const ok = await onSaveUnavailable(reasonDraft);
    if (ok) setShowReasonForm(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 min-w-0">
        <p className="text-sm font-medium shrink-0 whitespace-nowrap">{question.label}</p>
        <DocStatusPill status={status} />
      </div>

      {/* Inline reason form takes priority over the status body when open */}
      {showReasonForm ? (
        <div className="ml-4 space-y-2 rounded border border-dashed p-3">
          <Label htmlFor={`${question.key}-reason`} className="text-xs text-muted-foreground">
            Reason this document is not available (optional)
          </Label>
          <Textarea
            id={`${question.key}-reason`}
            ref={reasonInputRef}
            value={reasonDraft}
            onChange={(e) => setReasonDraft(e.target.value)}
            placeholder="e.g. Sent via secure portal — not retained locally"
            className="min-h-[64px] text-sm"
            disabled={isPending}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowReasonForm(false);
                setReasonDraft(unavailableReason ?? '');
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveReason} disabled={isPending}>
              Save
            </Button>
          </div>
        </div>
      ) : status === 'uploaded' && attachment ? (
        <div className="ml-4 space-y-1">
          <div className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {attachment.file_size != null ? `${(attachment.file_size / 1024).toFixed(1)} KB` : ''}
                {attachment.file_size != null ? ' · ' : ''}
                {formatDate(attachment.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={onDownload} disabled={isPending || isUploading}>
                Download
              </Button>
              {canEdit && (
                <>
                  <Button variant="ghost" size="sm" onClick={onReplaceClick} disabled={isPending || isUploading}>
                    Replace
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isPending || isUploading}
                    aria-label="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : status === 'unavailable' ? (
        <div className="ml-4 space-y-1">
          {unavailableReason ? (
            <p className="text-sm italic text-muted-foreground">&ldquo;{unavailableReason}&rdquo;</p>
          ) : (
            <p className="text-sm text-muted-foreground">No reason provided.</p>
          )}
          {canEdit && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                onClick={openReasonForm}
                disabled={isPending || isUploading}
              >
                Edit reason
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                onClick={onUploadClick}
                disabled={isPending || isUploading}
              >
                Upload file instead
              </button>
            </div>
          )}
        </div>
      ) : (
        // Pending
        <div className="ml-4 space-y-1">
          {canEdit ? (
            <div className="flex items-center gap-3 rounded border border-dashed p-3">
              <Button variant="outline" size="sm" onClick={onUploadClick} disabled={isPending || isUploading}>
                {isUploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Upload File
              </Button>
              <span className="text-xs text-muted-foreground">·</span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                onClick={requestMarkUnavailable}
                disabled={isPending || isUploading}
              >
                Mark as Not available
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No answer yet.</p>
          )}
        </div>
      )}

      {/* Confirm delete (Uploaded -> Pending) */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete uploaded document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the uploaded file and reset this question to Pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false);
                onDeleteAttachment();
              }}
            >
              Delete document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

type DocumentChecklistSectionProps = {
  reportId: string;
  report: VisitReportAuthoringReport;
  attachments: TripReportAttachment[];
  canEdit: boolean;
  isUploading: boolean;
  isPending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  pendingCategoryRef: React.MutableRefObject<string | null>;
  onDeleteAttachment(id: string): void;
  onDownloadAttachment(id: string): void;
  onMarkUnavailable(key: DocAvailabilityKey, reason: string): Promise<boolean>;
};

function DocumentChecklistSection({
  report,
  attachments,
  canEdit,
  isUploading,
  isPending,
  fileInputRef,
  pendingCategoryRef,
  onDeleteAttachment,
  onDownloadAttachment,
  onMarkUnavailable,
}: DocumentChecklistSectionProps) {
  const [otherOpen, setOtherOpen] = useState(false);

  const CHECKLIST_CATEGORIES = new Set(DOC_QUESTIONS.map((q) => q.category));

  const checklistAttachments = attachments.filter((a) => a.category && CHECKLIST_CATEGORIES.has(a.category));
  const otherAttachments = attachments.filter((a) => !a.category || !CHECKLIST_CATEGORIES.has(a.category));

  const attachmentByCategory: Record<string, TripReportAttachment> = {};
  checklistAttachments.forEach((a) => {
    if (!a.category) return;
    if (!attachmentByCategory[a.category] || new Date(a.created_at ?? 0) > new Date(attachmentByCategory[a.category].created_at ?? 0)) {
      attachmentByCategory[a.category] = a;
    }
  });

  return (
    <div className="space-y-4">
      {DOC_QUESTIONS.map((q, idx) => {
        const answer = (report[q.key] ?? null) as 'yes' | 'no' | null;
        const attachment = attachmentByCategory[q.category] ?? null;
        const status = deriveDocStatus(answer, attachment);
        const reason = (report[q.reasonKey] ?? null) as string | null;
        return (
          <div key={q.key} className={cn(idx > 0 && 'mt-4 border-t border-border/60 pt-4')}>
            <DocumentQuestionRow
              question={q}
              status={status}
              attachment={attachment}
              unavailableReason={reason}
              canEdit={canEdit}
              isUploading={isUploading}
              isPending={isPending}
              onUploadClick={() => {
                pendingCategoryRef.current = q.category;
                fileInputRef.current?.click();
              }}
              onReplaceClick={() => {
                pendingCategoryRef.current = q.category;
                fileInputRef.current?.click();
              }}
              onDeleteAttachment={() => {
                if (attachment) onDeleteAttachment(attachment.id);
              }}
              onSaveUnavailable={(r) => onMarkUnavailable(q.key, r)}
              onDownload={() => {
                if (attachment) onDownloadAttachment(attachment.id);
              }}
            />
          </div>
        );
      })}

      {otherAttachments.length > 0 && (
        <div className="border-t border-border/60 pt-3">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOtherOpen((v) => !v)}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', otherOpen && 'rotate-180')} />
            Other attachments ({otherAttachments.length})
          </button>
          {otherOpen && (
            <div className="mt-2 space-y-1.5">
              {otherAttachments.map((a) => {
                const isInfected = a.scan_status === 'infected';
                const isErrored = a.scan_status === 'error';
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate">{a.file_name}</p>
                        {isInfected && (
                          <Badge variant="destructive" className="gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Quarantined
                          </Badge>
                        )}
                        {isErrored && (
                          <Badge variant="warning" className="gap-1" title="Virus scan failed. Contact your administrator.">
                            <AlertTriangle className="h-3 w-3" />
                            Scan error
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.file_size != null ? `${(a.file_size / 1024).toFixed(1)} KB` : ''}
                        {a.file_size != null ? ' · ' : ''}
                        {formatDate(a.created_at)}
                        {a.category ? ` · ${a.category}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isInfected && (
                        <Button variant="ghost" size="sm" onClick={() => onDownloadAttachment(a.id)} disabled={isPending}>
                          Download
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDeleteAttachment(a.id)}
                          aria-label="Remove attachment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const AUDIT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Audit table: `dd-MMM-yyyy` (local) + same time style as `toLocaleString` (12h, seconds). */
function formatAuditEventWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = AUDIT_MONTHS[d.getMonth()];
    const yyyy = d.getFullYear();
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return `${dd}-${mmm}-${yyyy}, ${time}`;
  } catch {
    return '—';
  }
}

function visitLengthDays(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  try {
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return '—';
    const days = Math.round((b - a) / (24 * 60 * 60 * 1000));
    return days >= 0 ? `${Math.max(1, days)}` : '—';
  } catch {
    return '—';
  }
}

function daysOpen(createdAt: string | null): string {
  if (!createdAt) return '—';
  try {
    const created = new Date(createdAt);
    const today = new Date();
    created.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.floor((today.getTime() - created.getTime()) / msPerDay);
    if (days < 0) return '0';
    return days === 1 ? '1' : `${days}`;
  } catch {
    return '—';
  }
}

interface VisitReportAuthoringProps {
  visitId: string;
  /** Matches `TripReportWithDetailsResult['visit']` from the server loader. */
  visit: Record<string, unknown>;
  /** Matches `TripReportWithDetailsResult['report']` from the server loader. */
  report: Record<string, unknown> | null;
  template: VisitReportTemplate | null;
  questions: VisitReportTemplateQuestion[];
  initialResponses: Record<string, { response: string | null; comments: string | null; reviewer_comments: string | null }>;
  attendees: TripReportAttendee[];
  crfEntries: TripReportCrfEntry[];
  actionItems: TripReportActionItem[];
  attachments?: TripReportAttachment[];
  /** Subjects on the visit's site, used by the Monitored CRFs picker. */
  siteSubjects?: { id: string; subject_number: string; status: string | null }[];
  /**
   * Per-subject_visit DE/SDV/Lock rollups, keyed by `subject_visit_id`.
   * Surfaced from `getTripReportWithDetails` and used by the recorded
   * Monitored CRF(s) groups to render the SDV% chip in each visit header.
   */
  visitTotalsBySubjectVisitId?: Record<string, SubjectCrfPercentages>;
  templates?: TemplateWithQuestionCount[];
  logoUrl?: string | null;
  visitSequenceNumber?: number | null;
  lastApprovedVisitDate?: string | null;
  currentUserProfileId?: string | null;
  /** Company app admin (`profiles.role === 'admin'`). */
  userIsAppAdmin?: boolean;
  userIsStudyCra?: boolean;
  userIsStudyCpm?: boolean;
  accessDenied?: boolean;
  accessDeniedMessage?: string | null;
  auditEvents?: TripReportStatusEventRow[];
  reportSignerNames?: { author: string | null; approver: string | null };
  /**
   * Primary site contact phone from `getTripReportWithDetails` (for Site Details
   * display; site phone is edited on the site record’s Contacts tab).
   */
  primarySitePhone?: string | null;
  /** Set when opening for review failed (from author page redirect). */
  claimReviewError?: string | null;
  /** List + navigation base, e.g. `/protected/studies/{id}/trip-reports`. */
  tripReportsBasePath?: string;
}

const RESPONSE_OPTIONS = ['yes', 'no', 'na'] as const;

/** Must match server `VOID_APPROVAL_REASON_*` in visit-reports action. */
const VOID_APPROVAL_REASON_MIN_LEN = 15;
const VOID_APPROVAL_REASON_MAX_LEN = 2000;

function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function VisitReportAuthoring({
  visitId,
  visit: visitProp,
  report: reportProp,
  template,
  questions,
  initialResponses,
  attendees,
  crfEntries,
  actionItems,
  attachments = [],
  siteSubjects = [],
  visitTotalsBySubjectVisitId = {},
  templates = [],
  logoUrl,
  visitSequenceNumber,
  lastApprovedVisitDate,
  currentUserProfileId = null,
  userIsAppAdmin = false,
  userIsStudyCra = false,
  userIsStudyCpm = false,
  accessDenied = false,
  accessDeniedMessage = null,
  auditEvents = [],
  reportSignerNames = { author: null, approver: null },
  primarySitePhone = null,
  claimReviewError = null,
  tripReportsBasePath = '/protected/studies',
}: VisitReportAuthoringProps) {
  const visit = visitProp as VisitReportAuthoringVisit;
  const report = reportProp as VisitReportAuthoringReport | null;

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('study');
  const [responses, setResponses] = useState(initialResponses);
  const [narrative, setNarrative] = useState<string>(report?.narrative ?? '');
  const [sectionReviewerComments, setSectionReviewerComments] = useState<SectionReviewerCommentsState>(() =>
    sectionReviewerStateFromReport(report)
  );
  const [hideComments, setHideComments] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingActionItemDescription, setPendingActionItemDescription] = useState<string | null>(null);
  const [linkTemplateId, setLinkTemplateId] = useState('');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [submitSignatureModalOpen, setSubmitSignatureModalOpen] = useState(false);
  const [voidApprovalDialogOpen, setVoidApprovalDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidPassword, setVoidPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visitTypeLabel = VISIT_REPORT_TYPE_LABELS[visit?.visit_type as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? visit?.visit_type ?? '—';
  const studyTitle = visit?.studies
    ? studySelectLabel({
        study_name: visit.studies.study_name ?? null,
        protocol_number: visit.studies.protocol_number ?? '',
        title: visit.studies.title ?? '—',
      })
    : '—';
  const protocolNumber = visit?.studies?.protocol_number ?? '—';
  const siteName = visit?.study_sites?.name ?? '—';
  const siteNumber = visit?.study_sites?.site_number ?? '—';
  const visitName = visit?.visit_name ?? null;
  const visitType = visit?.visit_type ?? '—';
  const startDate = visit?.start_date ?? visit?.planned_date ?? null;
  const endDate = visit?.end_date ?? visit?.planned_date ?? null;
  const reportStatus = report?.report_status ?? report?.status ?? 'report_pending';
  const isAssignedReviewer =
    !!report?.reviewer_id && !!currentUserProfileId && report.reviewer_id === currentUserProfileId;
  const canEditAsCra =
    userIsStudyCra &&
    (reportStatus === 'report_pending' || reportStatus === 'authoring' || reportStatus === 'returned');
  const canEdit = canEditAsCra;
  const canReviewWorkflow =
    reportStatus === 'under_review' &&
    !!currentUserProfileId &&
    (isAssignedReviewer || userIsStudyCpm);
  const canEditReviewerComments = canReviewWorkflow;
  const canSubmit = canEditAsCra;
  const canStartReview = userIsStudyCpm && reportStatus === 'submitted' && !!currentUserProfileId;
  const isAuthor = report?.created_by && currentUserProfileId && report.created_by === currentUserProfileId;
  const canRecallSubmitted =
    userIsStudyCra && reportStatus === 'submitted' && !!currentUserProfileId && !!isAuthor;
  const canVoidApproval = reportStatus === 'approved_and_signed' && userIsAppAdmin;
  const siteId = visit?.site_id ?? null;

  const siteAttendees = attendees.filter((a) => a.attendee_type === 'site');
  const sponsorAttendees = attendees.filter((a) => a.attendee_type === 'sponsor');
  const openActionItems = actionItems.filter((a) => a.status === 'open');
  const closedActionItems = actionItems.filter((a) => a.status === 'closed');

  const setResponse = (questionId: string, field: 'response' | 'comments' | 'reviewer_comments', value: string | null) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] ?? { response: null, comments: null, reviewer_comments: null }),
        [field]: value,
      },
    }));
  };

  const buildDraftPayload = () =>
    questions.map((q) => ({
      template_question_id: q.id,
      response: responses[q.id]?.response ?? null,
      comments: responses[q.id]?.comments ?? null,
      reviewer_comments: responses[q.id]?.reviewer_comments ?? null,
    }));

  /** Stable snapshot so we resync local answers after router.refresh() without resetting on every parent re-render. */
  const initialResponsesSnapshot = useMemo(() => JSON.stringify(initialResponses), [initialResponses]);

  useEffect(() => {
    setResponses(JSON.parse(initialResponsesSnapshot) as VisitReportAuthoringProps['initialResponses']);
  }, [initialResponsesSnapshot]);

  useEffect(() => {
    setNarrative(report?.narrative ?? '');
  }, [report?.narrative]);

  useEffect(() => {
    setSectionReviewerComments(sectionReviewerStateFromReport(report));
  }, [
    report?.id,
    (report as { reviewer_comments_site_attendees?: string | null } | null | undefined)?.reviewer_comments_site_attendees,
    (report as { reviewer_comments_sponsor_attendees?: string | null } | null | undefined)?.reviewer_comments_sponsor_attendees,
    (report as { reviewer_comments_monitored_crfs?: string | null } | null | undefined)?.reviewer_comments_monitored_crfs,
    (report as { reviewer_comments_narrative?: string | null } | null | undefined)?.reviewer_comments_narrative,
    (report as { reviewer_comments_open_actions?: string | null } | null | undefined)?.reviewer_comments_open_actions,
    (report as { reviewer_comments_attachments?: string | null } | null | undefined)?.reviewer_comments_attachments,
  ]);

  useEffect(() => {
    if (!voidApprovalDialogOpen) {
      setVoidReason('');
      setVoidPassword('');
    }
  }, [voidApprovalDialogOpen]);

  const handleSaveDraft = () => {
    if (!report?.id) return;
    startTransition(async () => {
      const { error } = await saveReportDraft(report.id, buildDraftPayload(), narrative);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Draft saved.');
      router.refresh();
    });
  };

  const openSubmitSignatureModal = () => {
    if (!report?.id) return;
    setSubmitSignatureModalOpen(true);
  };

  const handleSubmitSignatureConfirm = (payload: {
    signatureData: string;
    signedAt: string;
    printedName: string;
    attestationText: string;
    password: string;
  }) => {
    if (!report?.id) return;
    startTransition(async () => {
      const { error: draftError } = await saveReportDraft(report.id, buildDraftPayload(), narrative);
      if (draftError) {
        toast.error(draftError);
        return;
      }
      const { error } = await submitReport(report.id, payload);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Report submitted.');
      router.refresh();
    });
  };

  const handleRecall = () => {
    if (!report?.id) return;
    startTransition(async () => {
      const { error } = await recallReport(report.id);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Report recalled. You can edit and resubmit.');
      router.refresh();
    });
  };

  const handleVoidApproval = () => {
    if (!report?.id) return;
    const reason = voidReason.trim();
    if (reason.length < VOID_APPROVAL_REASON_MIN_LEN) {
      toast.error(`Reason must be at least ${VOID_APPROVAL_REASON_MIN_LEN} characters.`);
      return;
    }
    if (!voidPassword) {
      toast.error('Password is required.');
      return;
    }
    startTransition(async () => {
      const { error } = await voidApproval(report.id, { reason, password: voidPassword });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Approval voided. Report returned for corrections.');
      setVoidApprovalDialogOpen(false);
      setVoidReason('');
      setVoidPassword('');
      router.refresh();
    });
  };

  const handleStartReview = () => {
    if (!report?.id) return;
    startTransition(async () => {
      const { error } = await startReview(report.id);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Review started.');
      router.refresh();
    });
  };

  const handleReturnReport = () => {
    if (!report?.id) return;
    startTransition(async () => {
      const payload = questions.map((q) => ({
        template_question_id: q.id,
        reviewer_comments: responses[q.id]?.reviewer_comments ?? null,
      }));
      const { error } = await returnReport(report.id, payload);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Report returned to CRA.');
      router.refresh();
    });
  };

  const handleSaveReviewerCommentsOnly = () => {
    if (!report?.id) return;
    startTransition(async () => {
      const payload = questions.map((q) => ({
        template_question_id: q.id,
        response: responses[q.id]?.response ?? null,
        comments: responses[q.id]?.comments ?? null,
        reviewer_comments: responses[q.id]?.reviewer_comments ?? null,
      }));
      const trimOrNull = (s: string) => (s.trim() === '' ? null : s.trim());
      const sectionPayload: TripReportSectionReviewerComments = {
        reviewer_comments_site_attendees: trimOrNull(sectionReviewerComments.reviewer_comments_site_attendees),
        reviewer_comments_sponsor_attendees: trimOrNull(sectionReviewerComments.reviewer_comments_sponsor_attendees),
        reviewer_comments_monitored_crfs: trimOrNull(sectionReviewerComments.reviewer_comments_monitored_crfs),
        reviewer_comments_narrative: trimOrNull(sectionReviewerComments.reviewer_comments_narrative),
        reviewer_comments_open_actions: trimOrNull(sectionReviewerComments.reviewer_comments_open_actions),
        reviewer_comments_attachments: trimOrNull(sectionReviewerComments.reviewer_comments_attachments),
      };
      const { error } = await saveReviewerComments(report.id, payload, sectionPayload);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Reviewer comments saved.');
      router.refresh();
    });
  };

  useEffect(() => {
    if (!claimReviewError) return;
    toast.error(claimReviewError);
    router.replace(`${tripReportsBasePath}/${visitId}/author`);
  }, [claimReviewError, visitId, router]);

  const handleApproveReport = () => {
    setSignatureModalOpen(true);
  };

  const handleSignatureConfirm = (payload: {
    signatureData: string;
    signedAt: string;
    printedName: string;
    attestationText: string;
    password: string;
  }) => {
    if (!report?.id) return;
    startTransition(async () => {
      const { error } = await approveReport(report.id, payload);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Report approved.');
      router.refresh();
    });
  };

  const orderedSections = useMemo(() => groupQuestionsIntoOrderedSections(questions), [questions]);

  const hasUnsavedReviewerComments = useMemo(() => {
    const norm = (v: string | null | undefined) => (v ?? '').trim();
    const questionDirty = questions.some((q) => {
      const local = norm(responses[q.id]?.reviewer_comments);
      const baseline = norm(initialResponses[q.id]?.reviewer_comments);
      return local !== baseline;
    });
    const r = report as Record<string, unknown> | null | undefined;
    const sectionDirty =
      norm(sectionReviewerComments.reviewer_comments_site_attendees) !== norm(String(r?.reviewer_comments_site_attendees ?? '')) ||
      norm(sectionReviewerComments.reviewer_comments_sponsor_attendees) !== norm(String(r?.reviewer_comments_sponsor_attendees ?? '')) ||
      norm(sectionReviewerComments.reviewer_comments_monitored_crfs) !== norm(String(r?.reviewer_comments_monitored_crfs ?? '')) ||
      norm(sectionReviewerComments.reviewer_comments_narrative) !== norm(String(r?.reviewer_comments_narrative ?? '')) ||
      norm(sectionReviewerComments.reviewer_comments_open_actions) !== norm(String(r?.reviewer_comments_open_actions ?? '')) ||
      norm(sectionReviewerComments.reviewer_comments_attachments) !== norm(String(r?.reviewer_comments_attachments ?? ''));
    return questionDirty || sectionDirty;
  }, [questions, responses, initialResponses, sectionReviewerComments, report]);

  /** Matches payload of saveReportDraft: question responses + narrative only. */
  const hasUnsavedDraft = useMemo(() => {
    const norm = (v: string | null | undefined) => (v ?? '').trim();
    const narrativeBaseline = norm(String((report as { narrative?: string | null } | null)?.narrative ?? ''));
    if (norm(narrative) !== narrativeBaseline) return true;
    return questions.some((q) => {
      const loc = responses[q.id] ?? { response: null, comments: null, reviewer_comments: null };
      const base = initialResponses[q.id] ?? { response: null, comments: null, reviewer_comments: null };
      return (
        norm(loc.response) !== norm(base.response) ||
        norm(loc.comments) !== norm(base.comments) ||
        norm(loc.reviewer_comments) !== norm(base.reviewer_comments)
      );
    });
  }, [questions, responses, initialResponses, narrative, report]);

  const renderSectionReviewerNotes = (field: keyof SectionReviewerCommentsState, idSuffix: string) => {
    const value = sectionReviewerComments[field];
    const showBlock = !hideComments && (canEditReviewerComments || value.trim().length > 0);
    if (!showBlock) return null;
    const notesLabel = canEditReviewerComments ? 'Your notes (reviewer)' : 'Reviewer notes';
    return (
      <div className="mt-3 max-w-full space-y-1.5 border-t border-border/50 pt-3">
        <Label htmlFor={`section-reviewer-${idSuffix}`} className="text-xs font-medium text-muted-foreground">
          {notesLabel}
        </Label>
        <Textarea
          id={`section-reviewer-${idSuffix}`}
          className={cn(
            'min-h-[4rem] resize-y text-[12px] text-red-600 dark:text-red-400',
            !canEditReviewerComments && 'cursor-default bg-muted/50'
          )}
          placeholder={canEditReviewerComments ? 'Feedback for the CRA on this section (optional).' : ''}
          value={value}
          onChange={(e) =>
            setSectionReviewerComments((prev) => ({ ...prev, [field]: e.target.value }))
          }
          readOnly={!canEditReviewerComments}
        />
      </div>
    );
  };

  const handleDownloadPdf = async () => {
    if (isPdfGenerating) return;
    setIsPdfGenerating(true);
    const loadingToast = toast.loading('Generating PDF...');
    try {
      const pdfData = buildVisitReportPdfData({
        visitId,
        visit,
        report: report as Record<string, unknown> | null | undefined,
        questions,
        responses,
        attendees,
        crfEntries,
        actionItems,
        attachments,
        narrative,
        visitSequenceNumber: visitSequenceNumber ?? null,
        lastApprovedVisitDate: lastApprovedVisitDate ?? null,
        logoUrl,
        reportSignerNames,
        includeReviewerComments: !hideComments,
        sectionReviewerComments,
        visitTotalsBySubjectVisitId,
      });

      await downloadVisitReportPdf(pdfData, {
        filename: `Visit-Report-${String(pdfData.visitTypeLabel).replace(/[^a-zA-Z0-9-]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
        footerLeft: `${pdfData.studyTitle} | ${pdfData.siteName} | ${pdfData.visitTypeLabel}`,
        footerRight: `Printed: ${new Date().toLocaleDateString('en-US')}`,
      });
      toast.success('PDF downloaded.', { id: loadingToast });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('PDF generation failed:', err);
      toast.error(`PDF error: ${msg}`, { id: loadingToast });
    } finally {
      setIsPdfGenerating(false);
    }
  };

  /**
   * Returns `true` when the attendee was persisted successfully so the
   * `AttendeesSection` editor can collapse on success and stay open on error.
   */
  const handleAddAttendee = (
    attendeeType: 'site' | 'sponsor',
    input: { first_name: string; last_name: string; role: string }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!report?.id) {
        resolve(false);
        return;
      }
      if (!input.first_name.trim() || !input.last_name.trim()) {
        toast.error('First name and last name are required.');
        resolve(false);
        return;
      }
      startTransition(async () => {
        const { error } = await addAttendee(report.id, {
          first_name: input.first_name.trim(),
          last_name: input.last_name.trim(),
          role: input.role.trim() || null,
          attendee_type: attendeeType,
        });
        if (error) {
          toast.error(error);
          resolve(false);
          return;
        }
        toast.success('Attendee added.');
        router.refresh();
        resolve(true);
      });
    });
  };

  const handleRemoveAttendee = (attendeeId: string) => {
    startTransition(async () => {
      const { error } = await removeAttendee(attendeeId);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Attendee removed.');
      router.refresh();
    });
  };

  const handleRemoveCrfEntry = (entryId: string) => {
    startTransition(async () => {
      const { error } = await removeCrfEntry(entryId);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('CRF entry removed.');
      router.refresh();
    });
  };

  /**
   * Group recorded `trip_report_crf_entries` by (`subject_number`, `subject_visit_id`)
   * so the Monitored CRF(s) tab renders one card per Subject + Visit. Legacy
   * free-text rows (no `subject_crf_id`) collect into a single "Unlinked entries"
   * bucket. Group order matches the order CRAs added rows.
   */
  const { linkedCrfGroups, unlinkedCrfEntries } = useMemo(() => {
    type CrfGroup = {
      key: string;
      subject_number: string | null;
      subject_visit_id: string | null;
      visit_name: string | null;
      entries: TripReportCrfEntry[];
    };
    const linked: CrfGroup[] = [];
    const byKey = new Map<string, CrfGroup>();
    const unlinked: TripReportCrfEntry[] = [];
    for (const e of crfEntries) {
      if (!e.subject_crf_id) {
        unlinked.push(e);
        continue;
      }
      const key = `${e.subject_number ?? '?'}__${e.subject_visit_id ?? e.linked?.visit_name ?? ''}`;
      let g = byKey.get(key);
      if (!g) {
        g = {
          key,
          subject_number: e.subject_number,
          subject_visit_id: e.subject_visit_id,
          visit_name: e.linked?.visit_name ?? null,
          entries: [],
        };
        byKey.set(key, g);
        linked.push(g);
      }
      g.entries.push(e);
    }
    return { linkedCrfGroups: linked, unlinkedCrfEntries: unlinked };
  }, [crfEntries]);

  const handleAddActionItem = (input: { description: string; due_date: string }): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!report?.id) {
        resolve(false);
        return;
      }
      if (!input.description.trim()) {
        toast.error('Description is required.');
        resolve(false);
        return;
      }
      if (!input.due_date) {
        toast.error('Due date is required.');
        resolve(false);
        return;
      }
      startTransition(async () => {
        const { error } = await addActionItem(report.id, {
          description: input.description.trim(),
          due_date: input.due_date,
        });
        if (error) {
          toast.error(error);
          resolve(false);
          return;
        }
        toast.success('Action item added.');
        router.refresh();
        resolve(true);
      });
    });
  };

  const handleEditActionItem = (
    itemId: string,
    input: { description: string; due_date: string }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!input.description.trim()) {
        toast.error('Description is required.');
        resolve(false);
        return;
      }
      if (!input.due_date) {
        toast.error('Due date is required.');
        resolve(false);
        return;
      }
      startTransition(async () => {
        const { error } = await updateActionItem(itemId, {
          description: input.description.trim(),
          due_date: input.due_date,
        });
        if (error) {
          toast.error(error);
          resolve(false);
          return;
        }
        toast.success('Action item updated.');
        router.refresh();
        resolve(true);
      });
    });
  };

  const handleCloseActionItem = (itemId: string) => {
    startTransition(async () => {
      const { error } = await updateActionItem(itemId, { status: 'closed', resolution_date: new Date().toISOString().split('T')[0] });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Action item closed.');
      router.refresh();
    });
  };

  const filteredTemplates = useMemo(() => {
    const active = templates.filter((t) => t.template_status === 'active' && (t.question_count ?? 0) > 0);
    return active.filter((t) => {
      if (t.visit_report_type !== visitType) return false;
      const tStudyId = (t as { study_id?: string | null }).study_id ?? null;
      const studyId = visit?.studies?.id ?? null;
      if (tStudyId && studyId && tStudyId !== studyId) return false;
      return true;
    });
  }, [templates, visitType, visit?.studies?.id]);

  const handleLinkTemplate = () => {
    if (!report?.id || !linkTemplateId) {
      toast.error('Select a template to link.');
      return;
    }
    startTransition(async () => {
      const { error } = await linkReportToTemplate(report.id, linkTemplateId);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Template linked. Reloading...');
      router.refresh();
    });
  };

  const handleCreateActionItemFromQuestion = (questionText: string) => {
    setPendingActionItemDescription(questionText);
    setActiveTab('open-actions');
  };

  const handleConsumePendingActionItemDescription = () => {
    setPendingActionItemDescription(null);
  };

  const pendingCategoryRef = useRef<string | null>(null);

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!report?.id || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const category = pendingCategoryRef.current;
    pendingCategoryRef.current = null;

    // Pre-flight client checks. Server re-validates these with a magic-byte
    // sniff; this just gives the user immediate feedback for obvious cases.
    if (attachments.length >= MAX_ATTACHMENTS_PER_REPORT) {
      toast.error(`Maximum ${MAX_ATTACHMENTS_PER_REPORT} attachments per report.`);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error('File is too large. Max 10 MB.');
      e.target.value = '';
      return;
    }
    if (!isDeclaredTypeAllowed(file.type, file.name)) {
      toast.error('This file type is not allowed.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { error } = await uploadVisitReportAttachment(report.id, formData, category);
      if (error) toast.error(error);
      else {
        toast.success('File uploaded.');
        router.refresh();
      }
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    startTransition(async () => {
      const { error } = await deleteVisitReportAttachment(attachmentId);
      if (error) toast.error(error);
      else {
        toast.success('Attachment removed.');
        router.refresh();
      }
    });
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    const { url, error } = await getAttachmentDownloadUrl(attachmentId);
    if (error) toast.error(error);
    else if (url) window.open(url, '_blank');
  };

  const handleMarkUnavailable = async (key: DocAvailabilityKey, reason: string): Promise<boolean> => {
    if (!report?.id) return false;
    const { error } = await markDocumentNotAvailable(report.id, key, reason);
    if (error) {
      toast.error(error);
      return false;
    }
    toast.success('Marked as Not available.');
    router.refresh();
    return true;
  };

  // Quick-action deep link: when the Tracker dropdown navigates here with
  // `#submit`, auto-open the submit signature modal once the report is fully
  // answered and the user is allowed to submit. Only fires once per mount and
  // clears the hash so a back-nav or refresh does not re-trigger it. Hooks
  // must run before the early `!report` return below.
  const submitHashHandledRef = useRef(false);
  const submitHashPercent =
    questions.length > 0
      ? Math.round((questions.filter((q) => responses[q.id]?.response != null).length / questions.length) * 100)
      : 0;
  useEffect(() => {
    if (submitHashHandledRef.current) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#submit') return;
    if (!template || questions.length === 0 || !canSubmit || submitHashPercent !== 100) return;
    submitHashHandledRef.current = true;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    setSubmitSignatureModalOpen(true);
  }, [template, questions.length, canSubmit, submitHashPercent]);

  if (!report) {
    return (
      <div className="space-y-6">
        <Link href={tripReportsBasePath} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Trip Report Summary
        </Link>
        <p className="text-muted-foreground">No report found for this visit.</p>
      </div>
    );
  }

  const visitNumber = visitSequenceNumber != null ? String(visitSequenceNumber) : (visitName || visitTypeLabel || '—');
  const streetParts = [
    visit?.study_sites?.address,
    [visit?.study_sites?.city, visit?.study_sites?.state].filter(Boolean).join(', '),
    visit?.study_sites?.postal_code,
  ].filter(Boolean);
  const streetAddress = streetParts.length ? streetParts.join(', ') : '—';
  const country = visit?.study_sites?.study_countries?.country_name ?? '—';
  const piName = visit?.study_sites?.pi_name ?? '—';
  const piEmail = visit?.study_sites?.pi_email ?? '—';

  const sectionStyle = SECTION_HEADER_STYLE;
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => responses[q.id]?.response != null).length;
  const overallPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const navItems: { value: string; label: string; description: string }[] = [
    {
      value: 'study',
      label: 'Study Info',
      description: 'Protocol, sponsor, and visit metadata for this trip report.',
    },
    {
      value: 'site',
      label: 'Site Details',
      description: 'Site name, number, address, country, primary contact phone, and principal investigator.',
    },
    {
      value: 'site-attendees',
      label: 'Site Attendees',
      description: 'Site staff present during this monitoring visit.',
    },
    {
      value: 'sponsor-attendees',
      label: 'Sponsor Attendees',
      description: 'Sponsor or CRO personnel who attended this visit.',
    },
    {
      value: 'crfs',
      label: 'Monitored CRFs',
      description: 'Subjects and case report forms reviewed during the visit.',
    },
    {
      value: 'questions',
      label: 'Visit Questions',
      description: 'Required template questions — must all be answered before submitting.',
    },
    {
      value: 'narrative',
      label: 'Narrative',
      description: 'Free-text summary of activities, findings, and discussions.',
    },
    {
      value: 'open-actions',
      label: 'Open Action Items',
      description: 'Outstanding follow-ups still requiring resolution.',
    },
    {
      value: 'closed-actions',
      label: 'Closed Action Items',
      description: 'Action items that have been resolved or completed.',
    },
    {
      value: 'attachments',
      label: 'Attachments',
      description: 'Supporting files, signed documents, and screenshots.',
    },
    {
      value: 'audit',
      label: 'Approval Audit',
      description: 'Submission, review, and approval history with signatures.',
    },
  ];

  return (
    <div className="flex gap-6">
      {/* Merged sidebar: actions + metrics + navigation */}
      {report && (() => {
        const hasWorkflowGroup =
          canEdit ||
          (!!template && questions.length > 0 && canSubmit) ||
          canStartReview ||
          canRecallSubmitted ||
          canVoidApproval ||
          canReviewWorkflow;
        const allQuestionsAnswered =
          orderedSections.length > 0 &&
          orderedSections.every((s) => s.questions.every((q) => responses[q.id]?.response != null));
        const someQuestionsAnswered =
          orderedSections.length > 0 &&
          orderedSections.some((s) => s.questions.every((q) => responses[q.id]?.response != null));
        const questionsStatusLabel = allQuestionsAnswered
          ? `All ${totalQuestions} visit questions answered — ready to submit.`
          : someQuestionsAnswered
            ? `${answeredCount} of ${totalQuestions} questions answered — ${totalQuestions - answeredCount} still need responses.`
            : `No visit questions answered yet — ${totalQuestions} required before submitting.`;
        const sendToReviewLabel = reportStatus === 'returned' ? 'Resubmit' : 'Send to Review';
        const sendToReviewTip =
          overallPercent < 100
            ? 'Answer all visit questions before submitting.'
            : reportStatus === 'returned'
              ? 'Resubmit this report to the reviewer.'
              : 'Submit this report for reviewer approval.';
        return (
        <aside className="hidden xl:block w-[220px] shrink-0 print:hidden" aria-label="Report actions and navigation">
          <TooltipProvider delay={200}>
          <div className="sticky top-20 flex flex-col gap-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {/* Actions */}
            <SidebarGroupLabel>Actions</SidebarGroupLabel>
            <div className="flex flex-col gap-1.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href={tripReportsBasePath}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start text-xs')}
                    >
                      <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                      Trip Report Summary
                    </Link>
                  }
                />
                <TooltipContent side="right" className="max-w-[260px] text-xs">
                  Back to the Trip Reports list for this study.
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-8 justify-start text-xs transition-colors',
                        hideComments && 'bg-muted text-foreground border-input'
                      )}
                      onClick={() => setHideComments((v) => !v)}
                      aria-label={hideComments ? 'Show comments' : 'Hide comments'}
                      aria-pressed={hideComments}
                    >
                      <MessageSquareOff className="h-3.5 w-3.5 mr-1.5" />
                      {hideComments ? 'Show Comments' : 'Hide Comments'}
                    </Button>
                  }
                />
                <TooltipContent side="right" className="max-w-[260px] text-xs">
                  {hideComments
                    ? 'Show reviewer comments again.'
                    : 'Hide all reviewer comments while you author.'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 justify-start text-xs transition-colors"
                      onClick={handleDownloadPdf}
                      disabled={isPdfGenerating}
                      aria-label="Download PDF"
                      aria-busy={isPdfGenerating}
                    >
                      {isPdfGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isPdfGenerating ? 'Generating PDF…' : 'Download PDF'}
                    </Button>
                  }
                />
                <TooltipContent side="right" className="max-w-[260px] text-xs">
                  {isPdfGenerating
                    ? 'Generating the PDF — this can take a few seconds.'
                    : 'Generate and download a PDF copy of this report.'}
                </TooltipContent>
              </Tooltip>
            </div>
            {/* Metrics + progress (when questions exist) */}
            {template && questions.length > 0 && (
              <>
                <SidebarGroupLabel>Progress</SidebarGroupLabel>
                <div className="space-y-1.5">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <p className="text-xs text-muted-foreground truncate font-medium cursor-default">
                          {studyTitle}
                        </p>
                      }
                    />
                    <TooltipContent side="right" className="max-w-[260px] text-xs">
                      {studyTitle}
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {overallPercent === 100 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      )}
                      <span className="font-medium">{overallPercent}%</span>
                    </div>
                    <span className="text-muted-foreground">{answeredCount}/{totalQuestions}</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <div
                          className="h-2 w-full rounded-full bg-muted overflow-hidden cursor-default"
                          role="progressbar"
                          aria-valuenow={overallPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label="Question completion progress"
                        >
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              overallPercent === 100
                                ? 'bg-emerald-600'
                                : overallPercent > 0
                                  ? 'bg-emerald-500'
                                  : 'bg-muted-foreground/20'
                            )}
                            style={{ width: `${overallPercent}%` }}
                          />
                        </div>
                      }
                    />
                    <TooltipContent side="right" className="max-w-[260px] text-xs">
                      {answeredCount} of {totalQuestions} questions answered ({overallPercent}%)
                    </TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}
            {/* Section navigation */}
            <SidebarGroupLabel>Sections</SidebarGroupLabel>
            <nav className="flex flex-col gap-0.5 min-h-0 flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = activeTab === item.value;
                const isQuestionsRow =
                  !!template && item.value === 'questions' && orderedSections.length > 0;
                return (
                  <Tooltip key={item.value}>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className={cn(
                            'group relative w-full flex items-center gap-2 py-1.5 pl-3 pr-2 text-xs text-left rounded',
                            'transition-all duration-150 cursor-pointer',
                            'hover:bg-muted/50 hover:pl-3.5',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isActive
                              ? 'bg-muted font-medium text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                          onClick={() => setActiveTab(item.value)}
                          aria-label={`Go to ${item.label}`}
                          aria-current={isActive ? 'true' : undefined}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-opacity',
                              isActive ? 'bg-primary opacity-100' : 'opacity-0'
                            )}
                          />
                          {isQuestionsRow ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <span className="inline-flex shrink-0">
                                      {allQuestionsAnswered ? (
                                        <CheckCircle2
                                          className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                                          aria-hidden
                                        />
                                      ) : someQuestionsAnswered ? (
                                        <AlertTriangle
                                          className="h-3.5 w-3.5 text-amber-500 shrink-0"
                                          aria-hidden
                                        />
                                      ) : (
                                        <Circle
                                          className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                                          aria-hidden
                                        />
                                      )}
                                    </span>
                                  }
                                />
                                <TooltipContent side="right" className="max-w-[240px] text-xs">
                                  {questionsStatusLabel}
                                </TooltipContent>
                              </Tooltip>
                              <span className="truncate">{item.label}</span>
                            </>
                          ) : (
                            <span className="truncate">{item.label}</span>
                          )}
                        </button>
                      }
                    />
                    <TooltipContent side="right" className="max-w-[260px] text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold">{item.label}</span>
                        <span className="text-background/80">{item.description}</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
            {/* Workflow buttons */}
            {hasWorkflowGroup && <SidebarGroupLabel>Workflow</SidebarGroupLabel>}
            {/* Save draft stacked above submit for review */}
            <div className="flex flex-col gap-1.5">
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-8 justify-center text-xs w-full',
                          hasUnsavedDraft &&
                            !isPending &&
                            'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200/90 dark:bg-amber-950/45 dark:border-amber-700 dark:text-amber-50 dark:hover:bg-amber-900/55'
                        )}
                        onClick={handleSaveDraft}
                        disabled={isPending}
                        aria-label={hasUnsavedDraft && !isPending ? 'Save draft (unsaved changes)' : 'Save draft'}
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save Draft
                      </Button>
                    }
                  />
                  <TooltipContent side="right" className="max-w-[260px] text-xs">
                    {hasUnsavedDraft && !isPending
                      ? 'You have unsaved changes — click to save.'
                      : 'Save your in-progress edits without submitting.'}
                  </TooltipContent>
                </Tooltip>
              )}
              {template && questions.length > 0 && canSubmit && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs border-transparent bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        onClick={openSubmitSignatureModal}
                        disabled={!(overallPercent === 100) || isPending}
                        aria-label={overallPercent === 100 ? 'Send to review' : 'Complete all questions to submit'}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {sendToReviewLabel}
                      </Button>
                    }
                  />
                  <TooltipContent side="right" className="max-w-[260px] text-xs">
                    {sendToReviewTip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {/* Start Review (for submitted reports) */}
            {canStartReview && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={handleStartReview}
                      disabled={isPending}
                      aria-label="Start review"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Start Review
                    </Button>
                  }
                />
                <TooltipContent side="right" className="max-w-[260px] text-xs">
                  Take ownership of this submitted report and begin reviewing.
                </TooltipContent>
              </Tooltip>
            )}
            {/* Recall (author withdraws submitted report) */}
            {canRecallSubmitted && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      onClick={handleRecall}
                      disabled={isPending}
                      aria-label="Recall submitted report"
                    >
                      <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                      Recall
                    </Button>
                  }
                />
                <TooltipContent side="right" className="max-w-[260px] text-xs">
                  Withdraw your submitted report so you can edit and resubmit.
                </TooltipContent>
              </Tooltip>
            )}
            {/* Void Approval (company admin only) */}
            {canVoidApproval && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => setVoidApprovalDialogOpen(true)}
                      disabled={isPending}
                      aria-label="Void approval"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Void Approval
                    </Button>
                  }
                />
                <TooltipContent side="right" className="max-w-[260px] text-xs">
                  Reopen an already-approved report. Requires a reason.
                </TooltipContent>
              </Tooltip>
            )}
            {/* Return / Approve (for reviewer) */}
            {canReviewWorkflow && (
              <div className="flex flex-col gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'w-full h-8 text-xs',
                          hasUnsavedReviewerComments &&
                            !isPending &&
                            'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200/90 dark:bg-amber-950/45 dark:border-amber-700 dark:text-amber-50 dark:hover:bg-amber-900/55'
                        )}
                        onClick={handleSaveReviewerCommentsOnly}
                        disabled={isPending}
                        aria-label={
                          hasUnsavedReviewerComments && !isPending
                            ? 'Save reviewer comments (unsaved changes)'
                            : 'Save reviewer comments'
                        }
                      >
                        Save review comments
                      </Button>
                    }
                  />
                  <TooltipContent side="right" className="max-w-[260px] text-xs">
                    {hasUnsavedReviewerComments && !isPending
                      ? 'You have unsaved reviewer comments — click to save.'
                      : 'Save your reviewer comments without changing report status.'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                        onClick={handleReturnReport}
                        disabled={isPending}
                        aria-label="Return to CRA"
                      >
                        Return to CRA
                      </Button>
                    }
                  />
                  <TooltipContent side="right" className="max-w-[260px] text-xs">
                    Send this report back to the CRA with your comments.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs border-transparent bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        onClick={handleApproveReport}
                        disabled={isPending}
                        aria-label="Approve report"
                      >
                        Approve
                      </Button>
                    }
                  />
                  <TooltipContent side="right" className="max-w-[260px] text-xs">
                    Approve this report and lock it for the audit trail.
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            <SignatureCaptureModal
              variant="approver_approve"
              open={signatureModalOpen}
              onOpenChange={setSignatureModalOpen}
              onConfirm={handleSignatureConfirm}
              isPending={isPending}
            />
            <SignatureCaptureModal
              variant="author_submit"
              open={submitSignatureModalOpen}
              onOpenChange={setSubmitSignatureModalOpen}
              onConfirm={handleSubmitSignatureConfirm}
              isPending={isPending}
            />
            <AlertDialog open={voidApprovalDialogOpen} onOpenChange={setVoidApprovalDialogOpen}>
              <AlertDialogContent className="sm:max-w-lg gap-4">
                <AlertDialogHeader>
                  <AlertDialogTitle>Void approval?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will return the report to the CRA for corrections. The report will need to be resubmitted and
                    approved again. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <Label htmlFor="void-approval-reason">Reason for voiding (required)</Label>
                    <Textarea
                      id="void-approval-reason"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder={`At least ${VOID_APPROVAL_REASON_MIN_LEN} characters`}
                      disabled={isPending}
                      rows={4}
                      maxLength={VOID_APPROVAL_REASON_MAX_LEN}
                      className="resize-y min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      {voidReason.trim().length}/{VOID_APPROVAL_REASON_MAX_LEN} · minimum {VOID_APPROVAL_REASON_MIN_LEN}{' '}
                      characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="void-approval-password">Confirm your password</Label>
                    <Input
                      id="void-approval-password"
                      type="password"
                      autoComplete="current-password"
                      value={voidPassword}
                      onChange={(e) => setVoidPassword(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={
                      isPending ||
                      voidReason.trim().length < VOID_APPROVAL_REASON_MIN_LEN ||
                      !voidPassword.trim()
                    }
                    onClick={handleVoidApproval}
                  >
                    Void Approval
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          </TooltipProvider>
        </aside>
        );
      })()}

      {/* Center content */}
      <div className="flex-1 min-w-0 space-y-4 [--border:oklch(0.46_0_0)] [--input:oklch(0.46_0_0)] dark:[--border:oklch(0.4_0_0)] dark:[--input:oklch(0.4_0_0)]">
        {/* Responsive action bar (visible when sidebars hidden) */}
        <div className="xl:hidden flex flex-wrap items-center gap-2 pb-4 print:hidden" aria-label="Report actions">
          <Link href={tripReportsBasePath} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Trip Report Summary
          </Link>
          <Button variant="outline" size="sm" onClick={() => setHideComments((v) => !v)}>
            <MessageSquareOff className="h-4 w-4 mr-1.5" />
            {hideComments ? 'Show Comments' : 'Hide Comments'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating}
            aria-label="Download PDF"
            aria-busy={isPdfGenerating}
          >
            {isPdfGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1.5" />
                Download PDF
              </>
            )}
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                hasUnsavedDraft &&
                  !isPending &&
                  'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200/90 dark:bg-amber-950/45 dark:border-amber-700 dark:text-amber-50 dark:hover:bg-amber-900/55'
              )}
              onClick={handleSaveDraft}
              disabled={isPending}
              aria-label={hasUnsavedDraft && !isPending ? 'Save draft (unsaved changes)' : 'Save draft'}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save Draft
            </Button>
          )}
          {template && questions.length > 0 && canSubmit && (
            <Button
              size="sm"
              className="border-transparent bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              onClick={openSubmitSignatureModal}
              disabled={!(overallPercent === 100) || isPending}
              aria-label={overallPercent === 100 ? 'Send to review' : 'Complete all questions to submit'}
              title={overallPercent < 100 ? 'Complete all questions to submit' : undefined}
            >
              <Send className="h-4 w-4 mr-1.5" />
              {reportStatus === 'returned' ? 'Resubmit' : 'Send to Review'}
            </Button>
          )}
          {canStartReview && (
            <Button size="sm" onClick={handleStartReview} disabled={isPending}>
              Start Review
            </Button>
          )}
          {canRecallSubmitted && (
            <Button variant="outline" size="sm" onClick={handleRecall} disabled={isPending}>
              <Undo2 className="h-4 w-4 mr-1.5" />
              Recall
            </Button>
          )}
          {canVoidApproval && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setVoidApprovalDialogOpen(true)}
              disabled={isPending}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Void Approval
            </Button>
          )}
          {canReviewWorkflow && (
            <>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  hasUnsavedReviewerComments &&
                    !isPending &&
                    'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200/90 dark:bg-amber-950/45 dark:border-amber-700 dark:text-amber-50 dark:hover:bg-amber-900/55'
                )}
                onClick={handleSaveReviewerCommentsOnly}
                disabled={isPending}
                aria-label={
                  hasUnsavedReviewerComments && !isPending
                    ? 'Save reviewer comments (unsaved changes)'
                    : 'Save reviewer comments'
                }
              >
                Save review comments
              </Button>
              <Button
                size="sm"
                className="border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                onClick={handleReturnReport}
                disabled={isPending}
              >
                Return to CRA
              </Button>
              <Button
                size="sm"
                className="border-transparent bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                onClick={handleApproveReport}
                disabled={isPending}
              >
                Approve
              </Button>
            </>
          )}
        </div>
        {/* Report content for PDF capture */}
        <div className="print-pdf-source space-y-4">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{visitTypeLabel}</h1>
            <p className="text-sm text-muted-foreground">
              Visit ID: {visitId.slice(0, 8)}… | Status: <StatusBadge status={reportStatus} />
            </p>
          </div>

          <Tabs tabsId="visit-report-authoring" value={activeTab} onValueChange={setActiveTab} className="print:hidden">
            <TabsList className="w-full flex-wrap h-auto gap-1 overflow-x-auto border-b rounded-none bg-transparent p-0">
              <TabsTrigger value="study" className="rounded-b-none">Study Info</TabsTrigger>
              <TabsTrigger value="site">Site Details</TabsTrigger>
              <TabsTrigger value="site-attendees">Site Attendees ({siteAttendees.length})</TabsTrigger>
              <TabsTrigger value="sponsor-attendees">Sponsor Attendees ({sponsorAttendees.length})</TabsTrigger>
              <TabsTrigger value="crfs">Monitored CRFs ({crfEntries.length})</TabsTrigger>
              <TabsTrigger value="questions">Visit Questions</TabsTrigger>
              <TabsTrigger value="narrative">Narrative</TabsTrigger>
              <TabsTrigger value="open-actions">Open Action Items ({openActionItems.length})</TabsTrigger>
              <TabsTrigger value="closed-actions">Closed Action Items ({closedActionItems.length})</TabsTrigger>
              <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
              <TabsTrigger value="audit">Approval Audit</TabsTrigger>
            </TabsList>

      <TabsContent value="study" className="mt-4">
      {/* 1. Study Information */}
      <Card className="py-2">
        <CardHeader className={sectionStyle}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Study Information</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 py-2 text-sm">
          <p><span className="font-medium">Study Name:</span> {studyTitle}</p>
          <p><span className="font-medium">Study Number:</span> {protocolNumber}</p>
          <p><span className="font-medium">Visit Number:</span> {visitNumber}</p>
          <p><span className="font-medium">Visit Type:</span> {visitTypeLabel}</p>
          <p><span className="font-medium">Visit Start Date:</span> {formatDate(startDate)}</p>
          <p><span className="font-medium">Visit End Date:</span> {formatDate(endDate)}</p>
          <p><span className="font-medium">Visit Length:</span> {visitLengthDays(startDate, endDate)} day(s)</p>
          <p><span className="font-medium">Date of Last Visit:</span> {lastApprovedVisitDate ? formatDate(lastApprovedVisitDate) : 'N/A'}</p>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="site" className="mt-4">
      {/* 2. Site Details */}
      <Card className="py-2">
        <CardHeader className={cn(sectionStyle, 'flex flex-row items-center justify-between gap-2')}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Site Details</h2>
          {siteId && visit?.study_id && (
            <Link
              href={`/protected/studies/${visit.study_id}/sites/${siteId}`}
              className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'h-auto shrink-0 p-0 text-xs')}
            >
              Manage site
            </Link>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 py-2 text-sm">
          <p><span className="font-medium">Site Name:</span> {siteName}</p>
          <p><span className="font-medium">Site Number:</span> {siteNumber}</p>
          <p><span className="font-medium">Street Address:</span> {streetAddress}</p>
          <p><span className="font-medium">Country:</span> {country}</p>
          <p>
            <span className="font-medium">Site Phone Number:</span>{' '}
            {primarySitePhone && primarySitePhone.trim() ? primarySitePhone.trim() : '—'}
          </p>
          <p><span className="font-medium">Principal Investigator:</span> {piName}{piEmail !== '—' ? ` (${piEmail})` : ''}</p>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="site-attendees" className="mt-4">
      {/* 3. Site Attendees */}
      <AttendeesSection
        title="Site Attendees"
        attendees={siteAttendees}
        roleOptions={SITE_ATTENDEE_ROLE_OPTIONS}
        canEdit={canEdit}
        isPending={isPending}
        onAdd={(payload) => handleAddAttendee('site', payload)}
        onRemove={handleRemoveAttendee}
        reviewerNotesSlot={renderSectionReviewerNotes('reviewer_comments_site_attendees', 'site-attendees')}
      />
      </TabsContent>

      <TabsContent value="sponsor-attendees" className="mt-4">
      {/* 4. Sponsor Attendees */}
      <AttendeesSection
        title="Sponsor Attendees"
        attendees={sponsorAttendees}
        roleOptions={SPONSOR_ATTENDEE_ROLE_OPTIONS}
        canEdit={canEdit}
        isPending={isPending}
        onAdd={(payload) => handleAddAttendee('sponsor', payload)}
        onRemove={handleRemoveAttendee}
        reviewerNotesSlot={renderSectionReviewerNotes('reviewer_comments_sponsor_attendees', 'sponsor-attendees')}
      />
      </TabsContent>

      <TabsContent value="crfs" className="mt-4">
      {/* 5. Monitored CRFs / SDV — picker driven by the eCRF Tracking matrix.
          Selecting CRFs snapshots them into trip_report_crf_entries with
          a back-link (subject_crf_id) so the recorded list can render the
          live DE/SDV/LOCK/Query state and stay deduped via the partial
          unique index added by 20260606000000. */}
      <Card className="py-2">
        <CardHeader className={sectionStyle}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Monitored CRF(s) ({crfEntries.length})</h2>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          {crfEntries.length === 0 && <p className="text-sm text-muted-foreground">No CRF entries.</p>}
          {crfEntries.length > 0 && <CrfMetricLegend />}
          {linkedCrfGroups.map((group) => {
            const totals = group.subject_visit_id
              ? visitTotalsBySubjectVisitId[group.subject_visit_id] ?? null
              : null;
            return (
              <div key={group.key} className="rounded-md border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                    <span className="truncate">Subject {group.subject_number ?? '—'}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate">{group.visit_name ?? 'Unspecified visit'}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      ({group.entries.length} CRF{group.entries.length === 1 ? '' : 's'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="uppercase tracking-wide">SDV</span>
                    <SdvPctChip totals={totals} />
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {group.entries.map((entry) => (
                    <RecordedCrfRow
                      key={entry.id}
                      entry={entry}
                      canEdit={canEdit}
                      onRemove={handleRemoveCrfEntry}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {unlinkedCrfEntries.length > 0 && (
            <div className="rounded-md border border-dashed border-border">
              <div className="border-b border-border bg-muted/20 px-3 py-2 text-sm font-medium text-muted-foreground">
                Unlinked entries
                <span className="ml-2 text-xs font-normal">
                  ({unlinkedCrfEntries.length} entr{unlinkedCrfEntries.length === 1 ? 'y' : 'ies'})
                </span>
              </div>
              <div className="divide-y divide-border">
                {unlinkedCrfEntries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{e.subject_number ?? '—'}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate">{e.crf_name ?? '—'}</span>
                      {e.sdv_status && (
                        <Badge variant="outline" className="text-[10px]">
                          {e.sdv_status}
                        </Badge>
                      )}
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleRemoveCrfEntry(e.id)}
                        aria-label="Remove CRF entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {report?.id && (
            <MonitoredCrfsPicker
              reportId={report.id}
              siteId={siteId}
              siteSubjects={siteSubjects}
              recordedEntries={crfEntries}
              defaultVisitName={visit?.visit_name ?? null}
              canEdit={canEdit}
              onAdded={() => router.refresh()}
            />
          )}
          {renderSectionReviewerNotes('reviewer_comments_monitored_crfs', 'crfs')}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="questions" className="mt-4">
      {/* Dynamic question sections (between CRFs and Narrative per plan) */}
      {template && orderedSections.length > 0 && (
        <div className="flex flex-col gap-4">
      {orderedSections.map((section, sectionIndex) => (
        <Collapsible key={section.name} defaultOpen>
          <Card id={`section-${sectionIndex}`} className="py-1.5 border-border/50">
            <CollapsibleTrigger className="w-full block text-left border-0 bg-transparent p-0 m-0 min-h-0 font-inherit focus:outline-none focus:ring-0">
              <CardHeader className={cn(sectionStyle, 'border-b border-border/60 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30')}>
                <h2 className="text-sm font-semibold text-foreground dark:text-white">{sectionIndex + 1}. {section.name.toUpperCase()} (Count={section.questions.length})</h2>
                <ChevronDown className="h-4 w-4 shrink-0 data-[state=open]:rotate-180 transition-transform" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="py-1.5 space-y-2">
              {section.questions.map((q, qIdx) => {
                const resp = responses[q.id]?.response;
                const authorComment = (responses[q.id]?.comments ?? '').trim();
                const reviewerComment = (responses[q.id]?.reviewer_comments ?? '').trim();
                const showAuthorCommentBlock = !hideComments && (canEdit || authorComment.length > 0);
                const showReviewerCommentBlock =
                  !hideComments &&
                  (canEditReviewerComments || reviewerComment.length > 0);
                const authorNotesLabel = canEdit ? 'Your notes (CRA)' : 'CRA notes';
                const reviewerNotesLabel = canEditReviewerComments ? 'Your notes (reviewer)' : 'Reviewer notes';
                return (
                  <div key={q.id} className="border-b border-border/60 last:border-b-0 pb-3 last:pb-0">
                    <div
                      className={cn(
                        'grid gap-x-3 gap-y-2 items-start py-1.5',
                        'grid-cols-[24px_minmax(0,1fr)_auto]'
                      )}
                    >
                      <span className="text-sm shrink-0 pt-0.5">{qIdx + 1}.</span>
                      <p className="text-sm min-w-0 text-foreground">{q.question_text}</p>
                      <RadioGroup
                        value={resp ?? ''}
                        onValueChange={(v) => setResponse(q.id, 'response', typeof v === 'string' ? v || null : null)}
                        className="flex gap-2 shrink-0 flex-wrap pt-0.5"
                        disabled={!canEdit}
                      >
                        {RESPONSE_OPTIONS.map((opt) => (
                          <div key={opt} className="flex items-center space-x-1.5">
                            <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                            <Label htmlFor={`${q.id}-${opt}`} className="text-xs font-normal cursor-pointer">
                              {QUESTION_RESPONSE_LABELS[opt as keyof typeof QUESTION_RESPONSE_LABELS]}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    {showAuthorCommentBlock && (
                      <div className="mt-3 pl-7 max-w-full space-y-1.5">
                        <Label htmlFor={`${q.id}-author-comments`} className="text-xs font-medium text-muted-foreground">
                          {authorNotesLabel}
                        </Label>
                        <Textarea
                          id={`${q.id}-author-comments`}
                          className={cn(
                            'min-h-[4rem] resize-y text-[12px]',
                            !canEdit && 'cursor-default bg-muted/50 text-foreground'
                          )}
                          placeholder={canEdit ? 'Add context for this response (optional).' : ''}
                          value={responses[q.id]?.comments ?? ''}
                          onChange={(e) => setResponse(q.id, 'comments', e.target.value || null)}
                          readOnly={!canEdit}
                        />
                      </div>
                    )}
                    {showReviewerCommentBlock && (
                      <div
                        className={cn(
                          'mt-3 pl-7 max-w-full space-y-1.5',
                          showAuthorCommentBlock && 'border-border/50 border-t pt-3'
                        )}
                      >
                        <Label htmlFor={`${q.id}-reviewer-comments`} className="text-xs font-medium text-muted-foreground">
                          {reviewerNotesLabel}
                        </Label>
                        <Textarea
                          id={`${q.id}-reviewer-comments`}
                          className={cn(
                            'min-h-[4rem] resize-y text-[12px] text-red-600 dark:text-red-400',
                            !canEditReviewerComments && 'cursor-default bg-muted/50'
                          )}
                          placeholder={canEditReviewerComments ? 'Feedback for the CRA on this item (optional).' : ''}
                          value={responses[q.id]?.reviewer_comments ?? ''}
                          onChange={(e) => setResponse(q.id, 'reviewer_comments', e.target.value || null)}
                          readOnly={!canEditReviewerComments}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
        </div>
      )}

      {(!template || questions.length === 0) && report && (
        <Card>
          <CardContent className="py-6">
            {canEdit && filteredTemplates.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  No template linked to this report. Select a template below to add the questions section.
                </p>
                <div className="flex flex-wrap items-end gap-2 justify-center">
                  <Select value={linkTemplateId} onValueChange={setLinkTemplateId}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.question_count} questions)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleLinkTemplate}
                    disabled={!linkTemplateId || isPending}
                  >
                    Link Template
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                {canEdit
                  ? 'No template or questions linked to this report. Create active templates with questions in the Admin tab, then link one here or when creating a visit.'
                  : 'No template or questions linked to this report.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      </TabsContent>

      <TabsContent value="narrative" className="mt-4">
      {/* 6. Narrative */}
      <Card className="py-2">
        <CardHeader className={sectionStyle}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Narrative</h2>
        </CardHeader>
        <CardContent className="py-2">
          <Textarea
            className="min-h-[120px] text-[12px]"
            placeholder="Enter Narrative..."
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            readOnly={!canEdit}
          />
          {renderSectionReviewerNotes('reviewer_comments_narrative', 'narrative')}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="open-actions" className="mt-4">
      {/* 7. Open Action Items */}
      <OpenActionItemsSection
        items={openActionItems}
        canEdit={canEdit}
        isPending={isPending}
        onAdd={handleAddActionItem}
        onUpdate={handleEditActionItem}
        onClose={handleCloseActionItem}
        pendingDescription={pendingActionItemDescription}
        onConsumePendingDescription={handleConsumePendingActionItemDescription}
        reviewerNotesSlot={renderSectionReviewerNotes('reviewer_comments_open_actions', 'open-actions')}
      />
      </TabsContent>

      <TabsContent value="closed-actions" className="mt-4">
      {/* 8. Closed Action Items */}
      <Card className="py-2">
        <CardHeader className={sectionStyle}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Closed Action Items ({closedActionItems.length})</h2>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          {closedActionItems.length === 0 && <p className="text-sm text-muted-foreground">No Action Items Closed.</p>}
          {closedActionItems.map((item) => (
            <div key={item.id} className="rounded border p-2 text-sm">
              <p>{item.description}</p>
              <p className="text-muted-foreground text-xs">Resolution Date: {item.resolution_date ? formatDate(item.resolution_date) : '—'}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="attachments" className="mt-4">
      {/* 9. Attachments & Supporting Documents */}
      <Card className="py-2">
        <CardHeader className={sectionStyle}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Attachments & Supporting Documents ({attachments.length})</h2>
        </CardHeader>
        <CardContent className="py-2 space-y-4">
          {/* Shared hidden file input used by all document question rows */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleUploadAttachment}
          />
          {report ? (
            <DocumentChecklistSection
              reportId={report.id}
              report={report}
              attachments={attachments}
              canEdit={canEdit}
              isUploading={isUploading}
              isPending={isPending}
              fileInputRef={fileInputRef}
              pendingCategoryRef={pendingCategoryRef}
              onDeleteAttachment={handleDeleteAttachment}
              onDownloadAttachment={handleDownloadAttachment}
              onMarkUnavailable={handleMarkUnavailable}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No attachments.</p>
          )}
          {renderSectionReviewerNotes('reviewer_comments_attachments', 'attachments')}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="audit" className="mt-4">
      {/* 10. Signature & Approval Audit Trail */}
      <Card className="py-2">
        <CardHeader className={sectionStyle}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Report Submission & Approval Audit Trail</h2>
        </CardHeader>
        <CardContent className="py-2 space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-6">
            <p>
              <span className="font-medium">Report Status:</span> {formatVisitReportStatusLabel(reportStatus)}
            </p>
            <p>
              <span className="font-medium">Created At:</span>{' '}
              {report?.created_at ? new Date(report.created_at).toLocaleString() : '—'}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signatures</h3>
            <div className="overflow-hidden rounded-md border border-border">
              <div className="grid grid-cols-1 gap-3 border-b border-border p-3 md:grid-cols-12 md:items-stretch md:gap-0 md:p-0">
                <div className="flex items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2 md:border-r md:border-border/60 md:px-3 md:py-3">
                  Author
                </div>
                <div className="min-w-0 md:col-span-5 md:border-r md:border-border/60 md:px-3 md:py-3">
                  <DigitalSignatureBlock
                    role="author"
                    displayName={reportSignerNames.author}
                    signatureData={report?.author_submission_signature_data}
                    signedAtColumn={report?.author_submission_signed_at}
                    printedName={report?.author_submission_printed_name}
                    attestationText={report?.author_submission_attestation_text}
                    signedAtDbColumn={report?.author_submission_signed_at_db}
                    contentHash={report?.author_submission_content_hash}
                  />
                </div>
                <div className="flex items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2 md:border-r md:border-border/60 md:px-3 md:py-3">
                  Submitted date
                </div>
                <div className="flex min-w-0 items-center font-medium text-foreground md:col-span-3 md:px-3 md:py-3">
                  {formatSignatureDisplayDateTime(
                    report?.author_submission_signed_at_db ??
                      report?.author_submission_signed_at ??
                      report?.submitted_date
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 bg-muted/20 p-3 md:grid-cols-12 md:items-stretch md:gap-0 md:p-0">
                <div className="flex items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2 md:border-r md:border-border/60 md:px-3 md:py-3">
                  Approver
                </div>
                <div className="min-w-0 md:col-span-5 md:border-r md:border-border/60 md:px-3 md:py-3">
                  <DigitalSignatureBlock
                    role="approver"
                    displayName={reportSignerNames.approver}
                    signatureData={report?.approval_signature_data}
                    signedAtColumn={report?.approval_signed_at}
                    printedName={report?.approval_printed_name}
                    attestationText={report?.approval_attestation_text}
                    signedAtDbColumn={report?.approval_signed_at_db}
                    contentHash={report?.approval_content_hash}
                  />
                </div>
                <div className="flex items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2 md:border-r md:border-border/60 md:px-3 md:py-3">
                  Approved date
                </div>
                <div className="flex min-w-0 items-center font-medium text-foreground md:col-span-3 md:px-3 md:py-3">
                  {formatSignatureDisplayDateTime(
                    report?.approval_signed_at_db ?? report?.approval_signed_at ?? report?.approved_date
                  )}
                </div>
              </div>
            </div>
          </div>
          {auditEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events recorded yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="p-2 font-medium">When</th>
                    <th className="p-2 font-medium">From</th>
                    <th className="p-2 font-medium">To</th>
                    <th className="p-2 font-medium">Actor</th>
                    <th className="p-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.map((ev) => (
                    <tr key={ev.id} className="border-b border-border/60">
                      <td className="p-2 whitespace-nowrap">{formatAuditEventWhen(ev.created_at)}</td>
                      <td className="p-2">{formatVisitReportStatusLabel(ev.from_status)}</td>
                      <td className="p-2">{formatVisitReportStatusLabel(ev.to_status)}</td>
                      <td className="p-2">{ev.actor_display_name ?? ev.actor_profile_id ?? '—'}</td>
                      <td className="p-2 text-muted-foreground">
                        {formatTripReportAuditEventNote(ev.metadata)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      </Tabs>
      </div>
      </div>
    </div>
  );
}

/**
 * Single legend strip rendered above the recorded CRF groups so the
 * abbreviated DE / SDR / SDV / PI / LOCK chips inside each row stay
 * unambiguous. Source of truth: `SUBJECT_CRF_METRIC_LABELS` and
 * `SUBJECT_CRF_METRIC_SHORT_LABELS` from `lib/types/ctms.ts`.
 */
function CrfMetricLegend() {
  const queryLegend = `Query: ${SUBJECT_CRF_QUERY_STATUS_LABELS.none} | ${SUBJECT_CRF_QUERY_STATUS_LABELS.open} | ${SUBJECT_CRF_QUERY_STATUS_LABELS.answered}`;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] text-muted-foreground">
      <span className="font-medium uppercase tracking-wide">Legend:</span>
      {SUBJECT_CRF_METRICS.map((m, i) => (
        <span key={m} className="inline-flex items-center gap-1">
          <span className="font-mono">{SUBJECT_CRF_METRIC_SHORT_LABELS[m]}</span>
          <span>= {SUBJECT_CRF_METRIC_LABELS[m]}</span>
          {i < SUBJECT_CRF_METRICS.length - 1 && <span className="text-muted-foreground/60">·</span>}
        </span>
      ))}
      <span className="text-muted-foreground/60">·</span>
      <span>{queryLegend}</span>
    </div>
  );
}

/**
 * Compact SDV% chip rendered in each visit-group header. Mirrors the
 * `PctBadge` style used by the eCRF Tracking tab so the same number is
 * shown consistently across the app. Falls back to "—" when there are
 * no DE rows in the visit (sdvPct === null) or when the eCRF tracking
 * loader was unavailable (totals === null).
 */
function SdvPctChip({ totals }: { totals: SubjectCrfPercentages | null }) {
  if (!totals || totals.sdvPct === null) {
    return (
      <Badge variant="outline" className="font-mono text-[10px]">
        —
      </Badge>
    );
  }
  const value = totals.sdvPct;
  const variant = value >= 100 ? 'success' : value >= 50 ? 'info' : 'secondary';
  const capped = totals.hasUnresolvedQuery && value === 99;
  const tooltip = capped
    ? `${totals.sdvTotal}/${totals.dataEntryTotal} of entered CRFs source-data verified · capped at 99% (open or answered query in this visit).`
    : `${totals.sdvTotal}/${totals.dataEntryTotal} of entered CRFs source-data verified.`;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant={variant} className="font-mono text-[10px]">
            {value}%
          </Badge>
        }
      />
      <TooltipContent side="top" className="max-w-[260px] text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * One row inside a Subject + Visit group on the Monitored CRF(s) tab.
 * Reads the live `entry.linked` snapshot so DE/SDR/SDV/PI/LOCK booleans and
 * the Query status chip stay in sync with whatever the picker (or eCRF
 * Tracking tab) wrote last. Falls back to the snapshotted `sdv_status`
 * string for legacy / unlinked rows.
 */
function RecordedCrfRow({
  entry,
  canEdit,
  onRemove,
}: {
  entry: TripReportCrfEntry;
  canEdit: boolean;
  onRemove: (entryId: string) => void;
}) {
  const linked = entry.linked ?? null;
  const queryStatus = linked?.query_status ?? 'none';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">
        {linked?.crf_name ?? entry.crf_name ?? '—'}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {SUBJECT_CRF_METRICS.map((m) => (
          <MetricChip
            key={m}
            metric={m}
            value={linked ? Boolean(linked[m]) : false}
            disabled={!linked}
          />
        ))}
        <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">Query:</span>
        <QueryStatusChip status={queryStatus} disabled={!linked} />
      </div>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onRemove(entry.id)}
          aria-label="Remove CRF entry"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/** Read-only metric badge using the eCRF Tracking short labels (DE/SDR/SDV/PI/LOCK). */
function MetricChip({
  metric,
  value,
  disabled,
}: {
  metric: SubjectCrfMetricKey;
  value: boolean;
  disabled?: boolean;
}) {
  const short = SUBJECT_CRF_METRIC_SHORT_LABELS[metric];
  const long = SUBJECT_CRF_METRIC_LABELS[metric];
  return (
    <span
      title={long}
      aria-label={`${long}: ${value ? 'yes' : 'no'}`}
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px]',
        disabled
          ? 'border-dashed border-border text-muted-foreground/60'
          : value
            ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400'
            : 'border-border bg-muted/40 text-muted-foreground'
      )}
    >
      {short}
    </span>
  );
}

/** Read-only Query status chip with the same color cues used by the picker. */
function QueryStatusChip({
  status,
  disabled,
}: {
  status: 'none' | 'open' | 'answered';
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="inline-flex items-center rounded-md border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground/60">
        —
      </span>
    );
  }
  const label = SUBJECT_CRF_QUERY_STATUS_LABELS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        status === 'none' && 'bg-muted text-foreground',
        status === 'open' && 'bg-red-600 text-white dark:bg-red-500',
        status === 'answered' && 'bg-yellow-400 text-yellow-950 dark:bg-yellow-300'
      )}
    >
      {label}
    </span>
  );
}
