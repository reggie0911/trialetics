'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  type CrfOption,
} from '@/components/ctms/study-forms/ecrf-dialogs';
import { VersionStatusPill } from '@/components/ctms/study-forms/ecrf-bulk/ecrf-version-selector';
import { QUESTION_TYPE_OPTIONS } from '@/lib/types/ctms';
import type {
  EcrfTemplateVersion,
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
} from '@/lib/types/ctms';
import {
  deleteStudyVisitDefinition,
  duplicateStudyVisitDefinition,
} from '@/lib/actions/study-visit-definitions';
import { deleteStudyCrf, deleteCrfQuestion } from '@/lib/actions/study-crfs';

const COLUMN_COUNT = 5;

export interface EcrfBuilderTableActorMap {
  /** id → display name (for "Updated by"). */
  [userId: string]: { name: string; avatarUrl?: string | null };
}

export interface EcrfBuilderTableProps {
  studyId: string;
  visits: StudyVisitDefinition[];
  crfs: StudyCrf[];
  questionsByCrfId: Record<string, StudyCrfQuestion[]>;
  loadingCrfIds: Set<string>;
  activeVersion: EcrfTemplateVersion | null;
  /** When true, all create / edit / delete affordances are disabled. */
  readOnly: boolean;
  /** Open / close all rows from the toolbar. Bumps key to trigger effect. */
  expandAllToken?: number;
  collapseAllToken?: number;
  /** Optional map of user id → display info, used for "Updated by" stamps. */
  actors?: EcrfBuilderTableActorMap;
  onLoadQuestions: (crfId: string) => void;
  onChanged: () => void;
}

/**
 * Refactored Builder table. Composes the visit / CRF / question hierarchy
 * with five columns: Name, Type, Status (mirrors active version), Last
 * updated, Actions. Expansion state is local to this component but can be
 * driven externally via `expandAllToken` / `collapseAllToken`.
 */
export function EcrfBuilderTable({
  studyId,
  visits,
  crfs,
  questionsByCrfId,
  loadingCrfIds,
  activeVersion,
  readOnly,
  expandAllToken = 0,
  collapseAllToken = 0,
  actors,
  onLoadQuestions,
  onChanged,
}: EcrfBuilderTableProps) {
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [expandedCrfs, setExpandedCrfs] = useState<Set<string>>(new Set());
  const [addVisitOpen, setAddVisitOpen] = useState(false);

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

  useEffect(() => {
    if (expandAllToken === 0) return;
    setExpandedVisits(new Set(visits.map((v) => v.id)));
    setExpandedCrfs(new Set(crfs.map((c) => c.id)));
    for (const c of crfs) {
      if (!questionsByCrfId[c.id]) onLoadQuestions(c.id);
    }
    // expand-all should fire only when token bumps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandAllToken]);

  useEffect(() => {
    if (collapseAllToken === 0) return;
    setExpandedVisits(new Set());
    setExpandedCrfs(new Set());
  }, [collapseAllToken]);

  const toggleVisit = (visitId: string) =>
    setExpandedVisits((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) next.delete(visitId);
      else next.add(visitId);
      return next;
    });

  const expandVisit = (visitId: string) =>
    setExpandedVisits((prev) => {
      if (prev.has(visitId)) return prev;
      const next = new Set(prev);
      next.add(visitId);
      return next;
    });

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

  const expandCrf = (crfId: string) =>
    setExpandedCrfs((prev) => {
      if (prev.has(crfId)) return prev;
      const next = new Set(prev);
      next.add(crfId);
      return next;
    });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[42%]">Name</TableHead>
            <TableHead className="w-[110px]">Type</TableHead>
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead className="w-[180px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <p className="text-sm font-medium">No visits yet</p>
                  <p className="text-xs text-muted-foreground">
                    Add a visit, bulk import a CSV, or auto-generate a starting schedule.
                  </p>
                  {!readOnly && (
                    <Button size="sm" onClick={() => setAddVisitOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add visit
                    </Button>
                  )}
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
                activeVersion={activeVersion}
                readOnly={readOnly}
                actors={actors}
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

      <VisitFormDialog
        studyId={studyId}
        nextSortOrder={visits.length}
        versionId={activeVersion?.id}
        open={addVisitOpen}
        onOpenChange={setAddVisitOpen}
        onSuccess={onChanged}
      />
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
  activeVersion: EcrfTemplateVersion | null;
  readOnly: boolean;
  actors?: EcrfBuilderTableActorMap;
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
  activeVersion,
  readOnly,
  actors,
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

  const handleDuplicate = async () => {
    const { error } = await duplicateStudyVisitDefinition(visit.id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Visit duplicated');
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
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{visit.visit_name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {detailParts.join(' · ')}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[10px]">
            Visit
          </Badge>
        </TableCell>
        <TableCell>
          {activeVersion && <VersionStatusPill status={activeVersion.status} />}
        </TableCell>
        <TableCell>
          <UpdatedStamp
            updatedAt={visit.updated_at}
            updatedBy={visit.updated_by}
            actors={actors}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            {!readOnly && (
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
            )}
            {!readOnly && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={handleDuplicate}
                    />
                  }
                >
                  <Copy className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>Duplicate visit (with CRFs &amp; questions)</TooltipContent>
              </Tooltip>
            )}
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {!readOnly && (
              <DeleteConfirmButton
                title="Delete visit?"
                description={`This removes "${visit.visit_name}" and all of its CRFs and questions.`}
                onConfirm={handleDelete}
              />
            )}
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && childCrfs.length === 0 && (
        <TableRow>
          <TableCell colSpan={COLUMN_COUNT} className="bg-background">
            <div className="flex items-center gap-3 pl-10 py-2 text-xs text-muted-foreground">
              <span>No CRFs in this visit.</span>
              {!readOnly && (
                <Button size="sm" variant="outline" onClick={() => setAddCrfOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add CRF
                </Button>
              )}
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
            activeVersion={activeVersion}
            readOnly={readOnly}
            actors={actors}
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
  activeVersion: EcrfTemplateVersion | null;
  readOnly: boolean;
  actors?: EcrfBuilderTableActorMap;
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
  activeVersion,
  readOnly,
  actors,
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
              <p className="truncate text-[10px] text-muted-foreground">
                {questions === undefined
                  ? 'Expand to load questions'
                  : `${questionCount} question${questionCount === 1 ? '' : 's'}`}
                {crf.description ? ` · ${crf.description}` : ''}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-[10px]">
            CRF
          </Badge>
        </TableCell>
        <TableCell>
          {activeVersion && <VersionStatusPill status={activeVersion.status} />}
        </TableCell>
        <TableCell>
          <UpdatedStamp
            updatedAt={crf.updated_at}
            updatedBy={crf.updated_by}
            actors={actors}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            {!readOnly && (
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
            )}
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {!readOnly && (
              <DeleteConfirmButton
                title="Delete CRF?"
                description={`This deletes "${crf.name}" and all of its questions.`}
                onConfirm={handleDelete}
              />
            )}
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
              {!readOnly && (
                <Button size="sm" variant="outline" onClick={() => setAddQuestionOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Question
                </Button>
              )}
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
            activeVersion={activeVersion}
            readOnly={readOnly}
            actors={actors}
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
  activeVersion: EcrfTemplateVersion | null;
  readOnly: boolean;
  actors?: EcrfBuilderTableActorMap;
  onChanged: () => void;
}

function QuestionRow({
  studyId,
  crfId,
  crfOptions,
  visits,
  question,
  index,
  activeVersion,
  readOnly,
  actors,
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
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{question.label}</p>
              {detailBits.length > 0 && (
                <p className="truncate text-[10px] text-muted-foreground">
                  {detailBits.join(' · ')}
                </p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[10px]">
            {typeLabel}
          </Badge>
        </TableCell>
        <TableCell>
          {activeVersion && <VersionStatusPill status={activeVersion.status} />}
        </TableCell>
        <TableCell>
          <UpdatedStamp
            updatedAt={question.updated_at}
            updatedBy={question.updated_by}
            actors={actors}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {!readOnly && (
              <DeleteConfirmButton
                title="Delete question?"
                description={`Delete "${question.label}"?`}
                onConfirm={handleDelete}
              />
            )}
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

// ─── Updated Stamp ─────────────────────────────────────────────────────────────

function UpdatedStamp({
  updatedAt,
  updatedBy,
  actors,
}: {
  updatedAt?: string | null;
  updatedBy?: string | null;
  actors?: EcrfBuilderTableActorMap;
}) {
  if (!updatedAt) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  const when = new Date(updatedAt);
  const relative = formatDistanceToNow(when, { addSuffix: true });
  const exact = format(when, 'PPpp');
  const actor = updatedBy ? actors?.[updatedBy] : undefined;
  const initials = actor?.name
    ? actor.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]!.toUpperCase())
        .join('')
    : null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex items-center gap-1.5">
            {actor && (
              <Avatar className="h-5 w-5">
                {actor.avatarUrl ? <AvatarImage src={actor.avatarUrl} /> : null}
                <AvatarFallback className="text-[9px]">{initials ?? '··'}</AvatarFallback>
              </Avatar>
            )}
            <span className="text-[11px] text-muted-foreground">{relative}</span>
          </div>
        }
      />
      <TooltipContent>
        {exact}
        {actor ? ` · ${actor.name}` : ''}
      </TooltipContent>
    </Tooltip>
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
