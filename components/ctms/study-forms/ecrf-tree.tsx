'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  CrfFormDialog,
  QuestionFormDialog,
  VisitFormDialog,
  visitDisplayLabel,
  type CrfOption,
} from '@/components/ctms/study-forms/ecrf-dialogs';
import { EcrfBulkUploadDialog } from '@/components/ctms/study-forms/ecrf-bulk/ecrf-bulk-upload-dialog';
import { EcrfVersionManagerDialog } from '@/components/ctms/study-forms/ecrf-bulk/ecrf-version-manager-dialog';
import {
  EcrfVersionSelector,
  VersionStatusPill,
} from '@/components/ctms/study-forms/ecrf-bulk/ecrf-version-selector';
import { QUESTION_TYPE_OPTIONS } from '@/lib/types/ctms';
import type {
  EcrfTemplateVersion,
  EcrfTemplateVersionWithCounts,
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
} from '@/lib/types/ctms';
import { deleteStudyVisitDefinition } from '@/lib/actions/study-visit-definitions';
import { deleteStudyCrf, deleteCrfQuestion } from '@/lib/actions/study-crfs';

const COLUMN_COUNT = 4;

interface EcrfTreeProps {
  studyId: string;
  visits: StudyVisitDefinition[];
  crfs: StudyCrf[];
  questionsByCrfId: Record<string, StudyCrfQuestion[]>;
  loadingCrfIds: Set<string>;
  versions: EcrfTemplateVersionWithCounts[];
  activeVersion: EcrfTemplateVersion | null;
  bootstrapped: boolean;
  onSwitchVersion: (versionId: string) => void;
  onVersionsChanged: () => void;
  onLoadQuestions: (crfId: string) => void;
  onChanged: () => void;
}

export function EcrfTree({
  studyId,
  visits,
  crfs,
  questionsByCrfId,
  loadingCrfIds,
  versions,
  activeVersion,
  bootstrapped,
  onSwitchVersion,
  onVersionsChanged,
  onLoadQuestions,
  onChanged,
}: EcrfTreeProps) {
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [expandedCrfs, setExpandedCrfs] = useState<Set<string>>(new Set());
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const isDraft = activeVersion?.status === 'draft';
  const canEdit = isDraft;
  const editLockReason = !activeVersion
    ? 'No template version selected.'
    : !isDraft
      ? `${activeVersion.status} versions are read-only. Clone to a draft to edit.`
      : null;

  const blankTemplateHref = `/api/studies/${studyId}/ecrf/template?empty=1`;

  const exportCsvHref = activeVersion
    ? `/api/studies/${studyId}/ecrf/template?versionId=${activeVersion.id}`
    : null;

  const printHref = activeVersion
    ? `/api/studies/${studyId}/ecrf/print?versionId=${activeVersion.id}`
    : null;

  const crfsByVisit = useMemo(() => {
    const out: Record<string, StudyCrf[]> = {};
    for (const c of crfs) {
      if (!out[c.visit_definition_id]) out[c.visit_definition_id] = [];
      out[c.visit_definition_id].push(c);
    }
    return out;
  }, [crfs]);

  const crfOptions: CrfOption[] = useMemo(
    () =>
      crfs.map((c) => ({
        id: c.id,
        name: c.name,
        visit_definition_id: c.visit_definition_id,
      })),
    [crfs]
  );

  const toggleVisit = (visitId: string) => {
    setExpandedVisits((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) next.delete(visitId);
      else next.add(visitId);
      return next;
    });
  };

  const expandVisit = (visitId: string) => {
    setExpandedVisits((prev) => {
      if (prev.has(visitId)) return prev;
      const next = new Set(prev);
      next.add(visitId);
      return next;
    });
  };

  const toggleCrf = (crfId: string) => {
    let willExpand = false;
    setExpandedCrfs((prev) => {
      const next = new Set(prev);
      if (next.has(crfId)) {
        next.delete(crfId);
      } else {
        next.add(crfId);
        willExpand = true;
      }
      return next;
    });
    if (willExpand && !questionsByCrfId[crfId]) onLoadQuestions(crfId);
  };

  const expandCrf = (crfId: string) => {
    setExpandedCrfs((prev) => {
      if (prev.has(crfId)) return prev;
      const next = new Set(prev);
      next.add(crfId);
      return next;
    });
    if (!questionsByCrfId[crfId]) onLoadQuestions(crfId);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">eCRF Builder</h3>
            {activeVersion && <VersionStatusPill status={activeVersion.status} />}
          </div>
          <p className="text-xs text-muted-foreground">
            Visits contain CRFs, which contain questions. Expand a row to drill in.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EcrfVersionSelector
            versions={versions}
            activeVersion={activeVersion}
            onChange={onSwitchVersion}
            onManage={() => setVersionsOpen(true)}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.location.href = blankTemplateHref;
                  }}
                />
              }
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Template
            </TooltipTrigger>
            <TooltipContent>
              Download the blank CSV template with example rows for bulk upload.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!exportCsvHref}
                  onClick={() => {
                    if (!exportCsvHref || typeof window === 'undefined') return;
                    window.location.href = exportCsvHref;
                  }}
                />
              }
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Export CSV
            </TooltipTrigger>
            <TooltipContent>
              {activeVersion
                ? `Download the eCRF table as CSV (${activeVersion.name ?? `Version ${activeVersion.version_number}`}).`
                : 'Select a template version to export.'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!printHref}
                  onClick={() => {
                    if (!printHref || typeof window === 'undefined') return;
                    window.open(printHref, '_blank', 'noopener,noreferrer');
                  }}
                />
              }
            >
              <Printer className="mr-1 h-3.5 w-3.5" />
              Print
            </TooltipTrigger>
            <TooltipContent>
              {activeVersion
                ? 'Open a print-ready PDF of the selected version in a new tab.'
                : 'Select a template version to print.'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkOpen(true)}
                  disabled={!canEdit}
                />
              }
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              Bulk Upload
            </TooltipTrigger>
            <TooltipContent>
              {canEdit
                ? 'Import a CSV into this draft version.'
                : (editLockReason ?? 'Bulk upload is disabled.')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  onClick={() => setAddVisitOpen(true)}
                  disabled={!canEdit}
                />
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Visit
            </TooltipTrigger>
            <TooltipContent>
              {canEdit ? 'Add a visit to this draft.' : (editLockReason ?? 'Read-only.')}
            </TooltipContent>
          </Tooltip>
        </div>
        <VisitFormDialog
          studyId={studyId}
          nextSortOrder={visits.length}
          versionId={activeVersion?.id}
          open={addVisitOpen}
          onOpenChange={setAddVisitOpen}
          onSuccess={onChanged}
        />
        {activeVersion && (
          <EcrfBulkUploadDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            studyId={studyId}
            versionId={activeVersion.id}
            versionName={activeVersion.name ?? `Version ${activeVersion.version_number}`}
            onSuccess={onChanged}
          />
        )}
        <EcrfVersionManagerDialog
          open={versionsOpen}
          onOpenChange={setVersionsOpen}
          studyId={studyId}
          versions={versions}
          onChanged={() => {
            onVersionsChanged();
            onChanged();
          }}
        />
      </div>
      {!bootstrapped && (
        <p className="text-[10px] text-muted-foreground">Loading template versions…</p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[55%]">Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT}>
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <p className="text-sm font-medium">No visits yet</p>
                    <p className="text-xs text-muted-foreground">
                      Add a visit to start building the eCRF.
                    </p>
                    <Button size="sm" onClick={() => setAddVisitOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Visit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visits.map((visit) => (
                <VisitRowGroup
                  key={visit.id}
                  studyId={studyId}
                  visit={visit}
                  visits={visits}
                  crfsByVisit={crfsByVisit}
                  crfOptions={crfOptions}
                  questionsByCrfId={questionsByCrfId}
                  loadingCrfIds={loadingCrfIds}
                  expandedVisits={expandedVisits}
                  expandedCrfs={expandedCrfs}
                  onToggleVisit={toggleVisit}
                  onExpandVisit={expandVisit}
                  onToggleCrf={toggleCrf}
                  onExpandCrf={expandCrf}
                  onChanged={onChanged}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Visit Row Group ───────────────────────────────────────────────────────────

interface VisitRowGroupProps {
  studyId: string;
  visit: StudyVisitDefinition;
  visits: StudyVisitDefinition[];
  crfsByVisit: Record<string, StudyCrf[]>;
  crfOptions: CrfOption[];
  questionsByCrfId: Record<string, StudyCrfQuestion[]>;
  loadingCrfIds: Set<string>;
  expandedVisits: Set<string>;
  expandedCrfs: Set<string>;
  onToggleVisit: (visitId: string) => void;
  onExpandVisit: (visitId: string) => void;
  onToggleCrf: (crfId: string) => void;
  onExpandCrf: (crfId: string) => void;
  onChanged: () => void;
}

function VisitRowGroup({
  studyId,
  visit,
  visits,
  crfsByVisit,
  crfOptions,
  questionsByCrfId,
  loadingCrfIds,
  expandedVisits,
  expandedCrfs,
  onToggleVisit,
  onExpandVisit,
  onToggleCrf,
  onExpandCrf,
  onChanged,
}: VisitRowGroupProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [addCrfOpen, setAddCrfOpen] = useState(false);
  const isExpanded = expandedVisits.has(visit.id);
  const childCrfs = crfsByVisit[visit.id] ?? [];

  const detailParts: string[] = [];
  if (visit.timepoint_label) detailParts.push(visit.timepoint_label);
  if (typeof visit.timepoint_days === 'number') {
    detailParts.push(`Day ${visit.timepoint_days}`);
  }
  detailParts.push(`${childCrfs.length} CRF${childCrfs.length === 1 ? '' : 's'}`);

  const handleDelete = async () => {
    const { error } = await deleteStudyVisitDefinition(visit.id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Visit deleted');
    onChanged();
  };

  return (
    <>
      <TableRow className="bg-muted/40">
        <TableCell>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleVisit(visit.id)}
              className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
              aria-label={isExpanded ? 'Collapse visit' : 'Expand visit'}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
            <span className="text-sm font-medium">{visit.visit_name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[10px]">
            Visit
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {detailParts.join(' · ')}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => {
                onExpandVisit(visit.id);
                setAddCrfOpen(true);
              }}
            >
              <Plus className="mr-1 h-3 w-3" />
              CRF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <DeleteConfirmButton
              title="Delete visit?"
              description={`This removes "${visit.visit_name}" and all of its CRFs and questions.`}
              onConfirm={handleDelete}
            />
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && childCrfs.length === 0 && (
        <TableRow>
          <TableCell colSpan={COLUMN_COUNT} className="bg-background">
            <div className="flex items-center gap-3 pl-10 py-2 text-xs text-muted-foreground">
              <span>No CRFs in this visit.</span>
              <Button size="sm" variant="outline" onClick={() => setAddCrfOpen(true)}>
                <Plus className="mr-1 h-3 w-3" />
                Add CRF
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}

      {isExpanded &&
        childCrfs.map((crf) => (
          <CrfRowGroup
            key={crf.id}
            studyId={studyId}
            crf={crf}
            visits={visits}
            crfOptions={crfOptions}
            questions={questionsByCrfId[crf.id]}
            isLoading={loadingCrfIds.has(crf.id)}
            isExpanded={expandedCrfs.has(crf.id)}
            onToggleCrf={onToggleCrf}
            onExpandCrf={onExpandCrf}
            onChanged={onChanged}
          />
        ))}

      <VisitFormDialog
        studyId={studyId}
        visit={visit}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onChanged}
      />

      <CrfFormDialog
        studyId={studyId}
        visits={visits}
        defaultVisitId={visit.id}
        open={addCrfOpen}
        onOpenChange={setAddCrfOpen}
        onSuccess={() => {
          onExpandVisit(visit.id);
          onChanged();
        }}
      />
    </>
  );
}

// ─── CRF Row Group ─────────────────────────────────────────────────────────────

interface CrfRowGroupProps {
  studyId: string;
  crf: StudyCrf;
  visits: StudyVisitDefinition[];
  crfOptions: CrfOption[];
  questions: StudyCrfQuestion[] | undefined;
  isLoading: boolean;
  isExpanded: boolean;
  onToggleCrf: (crfId: string) => void;
  onExpandCrf: (crfId: string) => void;
  onChanged: () => void;
}

function CrfRowGroup({
  studyId,
  crf,
  visits,
  crfOptions,
  questions,
  isLoading,
  isExpanded,
  onToggleCrf,
  onExpandCrf,
  onChanged,
}: CrfRowGroupProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);

  const questionCount = questions?.length ?? 0;
  const handleDelete = async () => {
    const { error } = await deleteStudyCrf(crf.id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('CRF deleted');
    onChanged();
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2 pl-6">
            <button
              type="button"
              onClick={() => onToggleCrf(crf.id)}
              className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
              aria-label={isExpanded ? 'Collapse CRF' : 'Expand CRF'}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{crf.name}</p>
              {crf.description && (
                <p className="truncate text-[10px] text-muted-foreground">{crf.description}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-[10px]">
            CRF
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {questions === undefined
            ? 'Expand to load questions'
            : `${questionCount} question${questionCount === 1 ? '' : 's'}`}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => {
                onExpandCrf(crf.id);
                setAddQuestionOpen(true);
              }}
            >
              <Plus className="mr-1 h-3 w-3" />
              Question
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <DeleteConfirmButton
              title="Delete CRF?"
              description={`This deletes "${crf.name}" and all of its questions.`}
              onConfirm={handleDelete}
            />
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && isLoading && (
        <TableRow>
          <TableCell colSpan={COLUMN_COUNT} className="bg-background">
            <p className="pl-16 py-2 text-xs text-muted-foreground">Loading questions…</p>
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoading && questions && questions.length === 0 && (
        <TableRow>
          <TableCell colSpan={COLUMN_COUNT} className="bg-background">
            <div className="flex items-center gap-3 pl-16 py-2 text-xs text-muted-foreground">
              <span>No questions on this CRF.</span>
              <Button size="sm" variant="outline" onClick={() => setAddQuestionOpen(true)}>
                <Plus className="mr-1 h-3 w-3" />
                Add Question
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}

      {isExpanded &&
        !isLoading &&
        questions &&
        questions.length > 0 &&
        questions.map((q, idx) => (
          <QuestionRow
            key={q.id}
            studyId={studyId}
            crfId={crf.id}
            crfOptions={crfOptions}
            visits={visits}
            question={q}
            index={idx + 1}
            onChanged={onChanged}
          />
        ))}

      <CrfFormDialog
        studyId={studyId}
        visits={visits}
        crf={crf}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onChanged}
      />
      <QuestionFormDialog
        studyId={studyId}
        crfs={crfOptions}
        visits={visits}
        defaultCrfId={crf.id}
        nextSortOrder={questionCount}
        open={addQuestionOpen}
        onOpenChange={setAddQuestionOpen}
        onSuccess={onChanged}
      />
    </>
  );
}

// ─── Question Row ──────────────────────────────────────────────────────────────

interface QuestionRowProps {
  studyId: string;
  crfId: string;
  crfOptions: CrfOption[];
  visits: StudyVisitDefinition[];
  question: StudyCrfQuestion;
  index: number;
  onChanged: () => void;
}

function QuestionRow({
  studyId,
  crfId,
  crfOptions,
  visits,
  question,
  index,
  onChanged,
}: QuestionRowProps) {
  const [editOpen, setEditOpen] = useState(false);

  const typeLabel =
    QUESTION_TYPE_OPTIONS.find((o) => o.value === question.question_type)?.label ??
    question.question_type;

  const handleDelete = async () => {
    const { error } = await deleteCrfQuestion(question.id, studyId, crfId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Question deleted');
    onChanged();
  };

  const detailBits: string[] = [];
  if (question.required) detailBits.push('Required');
  if (question.options && question.options.length > 0) {
    detailBits.push(`${question.options.length} option${question.options.length === 1 ? '' : 's'}`);
  }
  if (question.help_text) detailBits.push(question.help_text);

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2 pl-12">
            <span className="inline-flex h-5 min-w-[28px] items-center justify-center rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              Q{index}
            </span>
            <span className="truncate text-xs">{question.label}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[10px]">
            {typeLabel}
          </Badge>
        </TableCell>
        <TableCell className="max-w-0">
          <p className="truncate text-xs text-muted-foreground">
            {detailBits.join(' · ') || '—'}
          </p>
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <DeleteConfirmButton
              title="Delete question?"
              description={`Delete "${question.label}"?`}
              onConfirm={handleDelete}
            />
          </div>
        </TableCell>
      </TableRow>

      <QuestionFormDialog
        studyId={studyId}
        crfs={crfOptions}
        visits={visits}
        question={question}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onChanged}
      />
    </>
  );
}

// ─── Shared Delete Confirm Button ──────────────────────────────────────────────

function DeleteConfirmButton({
  title,
  description,
  onConfirm,
}: {
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirm()}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Suppress unused-export warnings for helper exports we may extend later.
export { visitDisplayLabel };
