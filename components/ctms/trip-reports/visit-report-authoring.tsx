'use client';

import { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Send, Download, MessageSquareOff, Plus, Trash2, CheckCircle2, Circle, AlertTriangle, Loader2, Upload, ChevronDown, Undo2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  addCrfEntry,
  removeCrfEntry,
  addActionItem,
  updateActionItem,
  uploadVisitReportAttachment,
  deleteVisitReportAttachment,
  getAttachmentDownloadUrl,
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
import { SITE_ATTENDEE_ROLE_OPTIONS, SPONSOR_ATTENDEE_ROLE_OPTIONS, SECTION_HEADER_STYLE } from '@/lib/constants/visit-reports';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditSiteModal } from '@/components/ctms/sites/edit-site-modal';
import { SignatureCaptureModal } from '@/components/ctms/trip-reports/signature-capture-modal';
import { DigitalSignatureBlock } from '@/components/ctms/trip-reports/digital-signature-block';
import { downloadVisitReportPdf } from '@/lib/utils/visit-report-pdf';
import {
  sectionReviewerStateFromReport,
  groupQuestionsIntoOrderedSections,
  buildVisitReportPdfData,
  type SectionReviewerCommentsState,
} from '@/lib/utils/build-visit-report-pdf-data';

function EditSiteButton({ siteId, studyId, onSuccess }: { siteId: string; studyId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="link"
        size="sm"
        className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'text-xs h-auto p-0')}
        onClick={() => setOpen(true)}
      >
        Edit Site
      </Button>
      <EditSiteModal
        siteId={siteId}
        studyId={studyId}
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '—';
  }
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
  visit: any;
  report: any;
  template: VisitReportTemplate | null;
  questions: VisitReportTemplateQuestion[];
  initialResponses: Record<string, { response: string | null; comments: string | null; reviewer_comments: string | null }>;
  attendees: TripReportAttendee[];
  crfEntries: TripReportCrfEntry[];
  actionItems: TripReportActionItem[];
  attachments?: TripReportAttachment[];
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
  /** Set when opening for review failed (from author page redirect). */
  claimReviewError?: string | null;
}

const RESPONSE_OPTIONS = ['yes', 'no', 'na'] as const;

/** Must match server `VOID_APPROVAL_REASON_*` in visit-reports action. */
const VOID_APPROVAL_REASON_MIN_LEN = 15;
const VOID_APPROVAL_REASON_MAX_LEN = 2000;

export function VisitReportAuthoring({
  visitId,
  visit,
  report,
  template,
  questions,
  initialResponses,
  attendees,
  crfEntries,
  actionItems,
  attachments = [],
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
  claimReviewError = null,
}: VisitReportAuthoringProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('study');
  const [responses, setResponses] = useState(initialResponses);
  const [narrative, setNarrative] = useState<string>(report?.narrative ?? '');
  const [sectionReviewerComments, setSectionReviewerComments] = useState<SectionReviewerCommentsState>(() =>
    sectionReviewerStateFromReport(report)
  );
  const [hideComments, setHideComments] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newSiteAttendee, setNewSiteAttendee] = useState({ first_name: '', last_name: '', role: '' });
  const [newSponsorAttendee, setNewSponsorAttendee] = useState({ first_name: '', last_name: '', role: '' });
  const [newCrfEntry, setNewCrfEntry] = useState({ subject_number: '', crf_name: '', sdv_status: '' });
  const [newActionItem, setNewActionItem] = useState({ description: '', due_date: '' });
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
  const studyTitle = visit?.studies?.title ?? '—';
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

  const handleSubmitSignatureConfirm = (signatureData: string, signedAt: string) => {
    if (!report?.id) return;
    startTransition(async () => {
      const { error: draftError } = await saveReportDraft(report.id, buildDraftPayload(), narrative);
      if (draftError) {
        toast.error(draftError);
        return;
      }
      const { error } = await submitReport(report.id, { signatureData, signedAt });
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
    router.replace(`/protected/trip-reports/${visitId}/author`);
  }, [claimReviewError, visitId, router]);

  const handleApproveReport = () => {
    setSignatureModalOpen(true);
  };

  const handleSignatureConfirm = (signatureData: string, signedAt: string) => {
    if (!report?.id) return;
    startTransition(async () => {
      const { error } = await approveReport(report.id, { signatureData, signedAt });
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

  const handleAddAttendee = (attendeeType: 'site' | 'sponsor', input: { first_name: string; last_name: string; role: string }) => {
    if (!report?.id) return;
    if (!input.first_name.trim() || !input.last_name.trim()) {
      toast.error('First name and last name are required.');
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
        return;
      }
      toast.success('Attendee added.');
      if (attendeeType === 'site') setNewSiteAttendee({ first_name: '', last_name: '', role: '' });
      else setNewSponsorAttendee({ first_name: '', last_name: '', role: '' });
      router.refresh();
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

  const handleAddCrfEntry = (input: { subject_number: string; crf_name: string; sdv_status: string }) => {
    if (!report?.id) return;
    startTransition(async () => {
      const { error } = await addCrfEntry(report.id, {
        subject_number: input.subject_number.trim() || null,
        crf_name: input.crf_name.trim() || null,
        sdv_status: input.sdv_status.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('CRF entry added.');
      setNewCrfEntry({ subject_number: '', crf_name: '', sdv_status: '' });
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

  const handleAddActionItem = (input: { description: string; due_date: string }) => {
    if (!report?.id) return;
    if (!input.description.trim()) {
      toast.error('Description is required.');
      return;
    }
    startTransition(async () => {
      const { error } = await addActionItem(report.id, {
        description: input.description.trim(),
        due_date: input.due_date.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Action item added.');
      setNewActionItem({ description: '', due_date: '' });
      router.refresh();
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
    setNewActionItem((s) => ({ ...s, description: questionText }));
    setActiveTab('open-actions');
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!report?.id || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data, error } = await uploadVisitReportAttachment(report.id, formData);
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

  if (!report) {
    return (
      <div className="space-y-6">
        <Link href="/protected/trip-reports" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
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

  const navItems: { value: string; label: string }[] = [
    { value: 'study', label: 'Study Info' },
    { value: 'site', label: 'Site Details' },
    { value: 'site-attendees', label: 'Site Attendees' },
    { value: 'sponsor-attendees', label: 'Sponsor Attendees' },
    { value: 'crfs', label: 'Monitored CRFs' },
    { value: 'questions', label: 'Visit Questions' },
    { value: 'narrative', label: 'Narrative' },
    { value: 'open-actions', label: 'Open Action Items' },
    { value: 'closed-actions', label: 'Closed Action Items' },
    { value: 'attachments', label: 'Attachments' },
    { value: 'audit', label: 'Approval Audit' },
  ];

  return (
    <div className="flex gap-6">
      {/* Merged sidebar: actions + metrics + navigation */}
      {report && (
        <aside className="hidden xl:block w-[220px] shrink-0 print:hidden" aria-label="Report actions and navigation">
          <div className="sticky top-20 flex flex-col gap-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {/* Actions */}
            <div className="flex flex-col gap-1.5">
              <Link href="/protected/trip-reports" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start text-xs')}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Trip Report Summary
              </Link>
              <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={() => setHideComments((v) => !v)} aria-label={hideComments ? 'Show comments' : 'Hide comments'}>
                <MessageSquareOff className="h-3.5 w-3.5 mr-1.5" />
                {hideComments ? 'Show Comments' : 'Hide Comments'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 justify-start text-xs"
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
            </div>
            {/* Metrics + progress (when questions exist) */}
            {template && questions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground truncate font-medium">{studyTitle}</p>
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
                <div
                  className="h-2 w-full rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuenow={overallPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Question completion progress"
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      overallPercent === 100 ? 'bg-emerald-600' : overallPercent > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                    )}
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
              </div>
            )}
            {/* Section navigation */}
            <nav className="flex flex-col gap-0.5 min-h-0 flex-1 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-2 py-1.5 px-2 text-xs text-left rounded transition-colors hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeTab === item.value && 'bg-muted font-medium'
                  )}
                  onClick={() => setActiveTab(item.value)}
                  aria-label={`Go to ${item.label}`}
                  aria-current={activeTab === item.value ? 'true' : undefined}
                >
                  {template && item.value === 'questions' && orderedSections.length > 0 ? (
                    <>
                      {orderedSections.some((s) => s.questions.every((q) => responses[q.id]?.response != null)) ? (
                        orderedSections.every((s) => s.questions.every((q) => responses[q.id]?.response != null)) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden />
                        )
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                      )}
                      <span className="truncate">{item.label}</span>
                    </>
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              ))}
            </nav>
            {/* Save draft stacked above submit for review */}
            <div className="flex flex-col gap-1.5">
              {canEdit && (
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
              )}
              {template && questions.length > 0 && canSubmit && (
                <Button
                  size="sm"
                  className="w-full h-8 text-xs border-transparent bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  onClick={openSubmitSignatureModal}
                  disabled={!(overallPercent === 100) || isPending}
                  aria-label={overallPercent === 100 ? 'Send to review' : 'Complete all questions to submit'}
                  title={overallPercent < 100 ? 'Complete all questions to submit' : undefined}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {reportStatus === 'returned' ? 'Resubmit' : 'Send to Review'}
                </Button>
              )}
            </div>
            {/* Start Review (for submitted reports) */}
            {canStartReview && (
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
            )}
            {/* Recall (author withdraws submitted report) */}
            {canRecallSubmitted && (
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
            )}
            {/* Void Approval (company admin only) */}
            {canVoidApproval && (
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
            )}
            {/* Return / Approve (for reviewer) */}
            {canReviewWorkflow && (
              <div className="flex flex-col gap-1">
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
                <Button
                  size="sm"
                  className="w-full h-8 text-xs border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                  onClick={handleReturnReport}
                  disabled={isPending}
                  aria-label="Return to CRA"
                >
                  Return to CRA
                </Button>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs border-transparent bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  onClick={handleApproveReport}
                  disabled={isPending}
                  aria-label="Approve report"
                >
                  Approve
                </Button>
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
        </aside>
      )}

      {/* Center content */}
      <div className="flex-1 min-w-0 space-y-4 [--border:oklch(0.46_0_0)] [--input:oklch(0.46_0_0)] dark:[--border:oklch(0.4_0_0)] dark:[--input:oklch(0.4_0_0)]">
        {/* Responsive action bar (visible when sidebars hidden) */}
        <div className="xl:hidden flex flex-wrap items-center gap-2 pb-4 print:hidden" aria-label="Report actions">
          <Link href="/protected/trip-reports" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
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
        <CardHeader className={cn(sectionStyle, 'flex flex-row items-center justify-between')}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Site Details</h2>
          {siteId && visit?.study_id && (
            <EditSiteButton
              siteId={siteId}
              studyId={visit.study_id}
              onSuccess={() => router.refresh()}
            />
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 py-2 text-sm">
          <p><span className="font-medium">Site Name:</span> {siteName}</p>
          <p><span className="font-medium">Site Number:</span> {siteNumber}</p>
          <p><span className="font-medium">Street Address:</span> {streetAddress}</p>
          <p><span className="font-medium">Country:</span> {country}</p>
          <p><span className="font-medium">Site Phone Number:</span> —</p>
          <p><span className="font-medium">Principal Investigator:</span> {piName}{piEmail !== '—' ? ` (${piEmail})` : ''}</p>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="site-attendees" className="mt-4">
      {/* 3. Site Attendees */}
      <Card className="py-2">
        <CardHeader className={sectionStyle}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Site Attendees ({siteAttendees.length})</h2>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          {siteAttendees.length === 0 && <p className="text-sm text-muted-foreground">No site attendees added.</p>}
          {siteAttendees.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
              <span>{a.first_name} {a.last_name}{a.role ? ` – ${a.role}` : ''}</span>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemoveAttendee(a.id)} aria-label="Remove attendee">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2 pt-2">
              <Input
                className="w-32 text-[12px] h-9"
                placeholder="First Name"
                value={newSiteAttendee.first_name}
                onChange={(e) => setNewSiteAttendee((s) => ({ ...s, first_name: e.target.value }))}
              />
              <Input
                className="w-32 text-[12px] h-9"
                placeholder="Last Name"
                value={newSiteAttendee.last_name}
                onChange={(e) => setNewSiteAttendee((s) => ({ ...s, last_name: e.target.value }))}
              />
              <Select
                value={newSiteAttendee.role || ''}
                onValueChange={(v) => setNewSiteAttendee((s) => ({ ...s, role: v ?? '' }))}
              >
                <SelectTrigger className="w-[180px] h-9 text-[12px]">
                  <SelectValue placeholder="Choose Role..." />
                </SelectTrigger>
                <SelectContent>
                  {SITE_ATTENDEE_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => handleAddAttendee('site', newSiteAttendee)} disabled={isPending}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Name
              </Button>
            </div>
          )}
          {renderSectionReviewerNotes('reviewer_comments_site_attendees', 'site-attendees')}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="sponsor-attendees" className="mt-4">
      {/* 4. Sponsor Attendees */}
      <Card className="py-2">
        <CardHeader className={sectionStyle}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Sponsor Attendees ({sponsorAttendees.length})</h2>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          {sponsorAttendees.length === 0 && <p className="text-sm text-muted-foreground">No sponsor attendees added.</p>}
          {sponsorAttendees.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
              <span>{a.first_name} {a.last_name}{a.role ? ` – ${a.role}` : ''}</span>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemoveAttendee(a.id)} aria-label="Remove attendee">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2 pt-2">
              <Input
                className="w-32 text-[12px] h-9"
                placeholder="First Name"
                value={newSponsorAttendee.first_name}
                onChange={(e) => setNewSponsorAttendee((s) => ({ ...s, first_name: e.target.value }))}
              />
              <Input
                className="w-32 text-[12px] h-9"
                placeholder="Last Name"
                value={newSponsorAttendee.last_name}
                onChange={(e) => setNewSponsorAttendee((s) => ({ ...s, last_name: e.target.value }))}
              />
              <Select
                value={newSponsorAttendee.role || ''}
                onValueChange={(v) => setNewSponsorAttendee((s) => ({ ...s, role: v ?? '' }))}
              >
                <SelectTrigger className="w-[180px] h-9 text-[12px]">
                  <SelectValue placeholder="Choose Role..." />
                </SelectTrigger>
                <SelectContent>
                  {SPONSOR_ATTENDEE_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => handleAddAttendee('sponsor', newSponsorAttendee)} disabled={isPending}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Name
              </Button>
            </div>
          )}
          {renderSectionReviewerNotes('reviewer_comments_sponsor_attendees', 'sponsor-attendees')}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="crfs" className="mt-4">
      {/* 5. Monitored CRFs / SDV */}
      <Card className="py-2">
        <CardHeader className={sectionStyle}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Monitored CRF(s) ({crfEntries.length})</h2>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          {crfEntries.length === 0 && <p className="text-sm text-muted-foreground">No CRF entries.</p>}
          {crfEntries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
              <span>Subject: {e.subject_number ?? '—'} | CRF: {e.crf_name ?? '—'} | SDV: {e.sdv_status ?? '—'}</span>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemoveCrfEntry(e.id)} aria-label="Remove CRF entry">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2 pt-2">
              <Input
                className="w-28 text-[12px] h-9"
                placeholder="Subject Number"
                value={newCrfEntry.subject_number}
                onChange={(e) => setNewCrfEntry((s) => ({ ...s, subject_number: e.target.value }))}
              />
              <Input
                className="w-36 text-[12px] h-9"
                placeholder="CRF Name"
                value={newCrfEntry.crf_name}
                onChange={(e) => setNewCrfEntry((s) => ({ ...s, crf_name: e.target.value }))}
              />
              <Input
                className="w-24 text-[12px] h-9"
                placeholder="SDV Status"
                value={newCrfEntry.sdv_status}
                onChange={(e) => setNewCrfEntry((s) => ({ ...s, sdv_status: e.target.value }))}
              />
              <Button variant="outline" size="sm" onClick={() => handleAddCrfEntry(newCrfEntry)} disabled={isPending}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Visit Entry
              </Button>
            </div>
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
      <Card className="py-2">
        <CardHeader className={cn(sectionStyle, 'flex flex-row items-center justify-between')}>
          <h2 className="text-sm font-semibold text-foreground dark:text-white">Open Action Items ({openActionItems.length})</h2>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => handleAddActionItem(newActionItem)} disabled={isPending}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Action Item
            </Button>
          )}
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          {openActionItems.length === 0 && <p className="text-sm text-muted-foreground">No Action Items Open.</p>}
          {openActionItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
              <div>
                <p>{item.description}</p>
                <p className="text-muted-foreground text-xs">Due: {item.due_date ? formatDate(item.due_date) : '—'} | Open for {daysOpen(item.created_at)} day(s) | Status: {item.status}</p>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => handleCloseActionItem(item.id)} disabled={isPending}>
                  Close
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2 pt-2">
              <Input
                className="min-w-[200px] flex-1 text-[12px] h-9"
                placeholder="Action Description"
                value={newActionItem.description}
                onChange={(e) => setNewActionItem((s) => ({ ...s, description: e.target.value }))}
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor="new-action-item-due-date" className="text-xs font-normal text-muted-foreground">Due Date</Label>
                <Input
                  id="new-action-item-due-date"
                  className="w-32 text-[12px] h-9"
                  type="date"
                  placeholder="Due Date"
                  value={newActionItem.due_date}
                  onChange={(e) => setNewActionItem((s) => ({ ...s, due_date: e.target.value }))}
                />
              </div>
            </div>
          )}
          {renderSectionReviewerNotes('reviewer_comments_open_actions', 'open-actions')}
        </CardContent>
      </Card>
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
              <p className="text-muted-foreground text-xs">Resolution Date: {item.resolution_date ? formatDate(item.resolution_date) : '—'} | Status: {item.status}</p>
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
        <CardContent className="py-2 space-y-2">
          {attachments.length === 0 && <p className="text-sm text-muted-foreground">No attachments.</p>}
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{a.file_name}</p>
                <p className="text-muted-foreground text-xs">
                  {a.file_size != null ? `${(a.file_size / 1024).toFixed(1)} KB` : ''} · {formatDate(a.created_at)}
                  {a.category ? ` · ${a.category}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => handleDownloadAttachment(a.id)}>
                  Download
                </Button>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteAttachment(a.id)} aria-label="Remove attachment">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {canEdit && (
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={handleUploadAttachment}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isPending}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1.5" />
                )}
                Upload File
              </Button>
            </div>
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
                  />
                </div>
                <div className="flex items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2 md:border-r md:border-border/60 md:px-3 md:py-3">
                  Submitted date
                </div>
                <div className="flex min-w-0 items-center font-medium text-foreground md:col-span-3 md:px-3 md:py-3">
                  {formatSignatureDisplayDateTime(
                    report?.author_submission_signed_at ?? report?.submitted_date
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
                  />
                </div>
                <div className="flex items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2 md:border-r md:border-border/60 md:px-3 md:py-3">
                  Approved date
                </div>
                <div className="flex min-w-0 items-center font-medium text-foreground md:col-span-3 md:px-3 md:py-3">
                  {formatSignatureDisplayDateTime(report?.approval_signed_at ?? report?.approved_date)}
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
