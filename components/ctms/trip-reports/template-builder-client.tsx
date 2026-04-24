'use client';

import { useState, useTransition, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Upload, Trash2, Download, Pencil, Sparkles, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { normalizeReportOrderBySection } from '@/lib/utils/normalize-report-order-by-section';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  addTemplateQuestion,
  deleteTemplateQuestion,
  updateTemplateQuestion,
  bulkUploadTemplateQuestions,
  type BulkUploadQuestionInput,
} from '@/lib/actions/visit-reports';
import { TRIP_REPORT_DEFAULT_PAGE_SIZE } from '@/lib/trip-report-compliance';
import { AddEditTemplateModal } from './add-edit-template-modal';
import { AIQuestionWizard } from './ai-question-wizard';
import type { VisitReportTemplate } from '@/lib/types/visit-reports';
import type { VisitReportTemplateQuestion } from '@/lib/types/visit-reports';
import { VISIT_REPORT_TYPE_LABELS } from '@/lib/types/visit-reports';
import { parseBulkUploadCsv } from '@/lib/utils/parse-bulk-upload-csv';

const SAMPLE_CSV =
  'Report Order,Report Sub Section,Question\n1,"Documentation","Was the ISF reviewed for completeness?"\n2,"Documentation","Were source documents verified?"\n3,"Timelines","Was the monitoring visit report submitted on time?"\n';

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'visit-report-questions-sample.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const QUESTIONS_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const QUESTIONS_PAGE_SIZE_MAX = 200;

function parseQuestionsPage(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function parseQuestionsPageSize(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return TRIP_REPORT_DEFAULT_PAGE_SIZE;
  const capped = Math.min(QUESTIONS_PAGE_SIZE_MAX, n);
  if ((QUESTIONS_PAGE_SIZE_OPTIONS as readonly number[]).includes(capped)) {
    return capped;
  }
  return TRIP_REPORT_DEFAULT_PAGE_SIZE;
}

function formatUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

interface StudyOption {
  id: string;
  title: string;
  study_name: string | null;
  protocol_number: string | null;
  description?: string | null;
  therapeutic_area?: string | null;
  indication?: string | null;
}

interface TemplateBuilderClientProps {
  template: VisitReportTemplate;
  initialQuestions: VisitReportTemplateQuestion[];
  studies: StudyOption[];
  readOnly?: boolean;
  tripReportsBasePath?: string;
}

const DEBOUNCE_MS = 500;

export function TemplateBuilderClient({
  template,
  initialQuestions,
  studies,
  readOnly = false,
  tripReportsBasePath = '/protected/studies',
}: TemplateBuilderClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [questions, setQuestions] = useState(initialQuestions);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [aiWizardOpen, setAiWizardOpen] = useState(false);
  const [editTemplateModalOpen, setEditTemplateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter state mirrors URL params; pager state is read directly from URL
  // so Prev/Next clicks don't require local state plumbing.
  const [searchFilter, setSearchFilter] = useState<string>(searchParams.get('qSearch') ?? '');
  const [subSectionFilter, setSubSectionFilter] = useState<string>(searchParams.get('qSub') ?? 'all');

  useEffect(() => {
    setSearchFilter(searchParams.get('qSearch') ?? '');
  }, [searchParams]);
  useEffect(() => {
    setSubSectionFilter(searchParams.get('qSub') ?? 'all');
  }, [searchParams]);

  const parsedPageSize = parseQuestionsPageSize(searchParams.get('qPs'));
  const parsedPage = parseQuestionsPage(searchParams.get('qPage'));

  const updatePagerParam = useCallback(
    (key: string, value: string | null) => {
      if (!pathname) return;
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
      const next = params.toString();
      const current = searchParams.toString();
      if (next === current) return;
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Keep filter URL params in sync with state, and strip default pager
  // params (qPage=1, qPs=default) for clean shareable URLs.
  useEffect(() => {
    if (!pathname) return;
    const params = new URLSearchParams(searchParams.toString());
    if (searchFilter.trim()) params.set('qSearch', searchFilter);
    else params.delete('qSearch');
    if (subSectionFilter && subSectionFilter !== 'all') params.set('qSub', subSectionFilter);
    else params.delete('qSub');
    const qPageVal = params.get('qPage');
    if (!qPageVal || qPageVal === '1') params.delete('qPage');
    const qPsVal = params.get('qPs');
    if (!qPsVal || qPsVal === String(TRIP_REPORT_DEFAULT_PAGE_SIZE)) params.delete('qPs');
    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, searchFilter, subSectionFilter]);

  const subSectionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      const v = q.report_sub_section?.trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const needle = searchFilter.trim().toLowerCase();
    return questions.filter((q) => {
      if (subSectionFilter !== 'all') {
        const sub = (q.report_sub_section ?? '').trim();
        if (sub !== subSectionFilter) return false;
      }
      if (needle) {
        const hay = (q.question_text ?? '').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [questions, searchFilter, subSectionFilter]);

  const total = filteredQuestions.length;
  const totalPages = Math.max(1, Math.ceil(total / parsedPageSize) || 1);
  const currentPage = Math.min(Math.max(1, parsedPage), totalPages);

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * parsedPageSize;
    return filteredQuestions.slice(start, start + parsedPageSize);
  }, [filteredQuestions, currentPage, parsedPageSize]);

  // Auto-anchor: if the user is editing a row and it's not on the current
  // page (e.g. they paged away or order changed), snap back to its page so
  // the autosave row stays in view.
  useEffect(() => {
    if (!editingQuestionId) return;
    const idx = filteredQuestions.findIndex((q) => q.id === editingQuestionId);
    if (idx < 0) return;
    const itsPage = Math.floor(idx / parsedPageSize) + 1;
    if (itsPage !== currentPage) {
      updatePagerParam('qPage', itsPage === 1 ? null : String(itsPage));
    }
  }, [editingQuestionId, filteredQuestions, currentPage, parsedPageSize, updatePagerParam]);

  const refresh = useCallback(
    (opts?: { jumpToLastPage?: boolean }) => {
      startTransition(async () => {
        try {
          const { getTemplateQuestions } = await import('@/lib/actions/visit-reports');
          const list = await getTemplateQuestions(template.id);
          setQuestions(list);
          if (opts?.jumpToLastPage && pathname) {
            setSearchFilter('');
            setSubSectionFilter('all');
            const lastPage = Math.max(1, Math.ceil(list.length / parsedPageSize));
            const params = new URLSearchParams(searchParams.toString());
            params.delete('qSearch');
            params.delete('qSub');
            if (lastPage > 1) params.set('qPage', String(lastPage));
            else params.delete('qPage');
            const next = params.toString();
            router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
          }
        } catch {
          toast.error('Failed to refresh questions');
        }
      });
    },
    [template.id, pathname, parsedPageSize, router, searchParams]
  );

  const handleAddQuestion = () => {
    startTransition(async () => {
      const { data, error } = await addTemplateQuestion({
        template_id: template.id,
        question_text: '',
        report_order: 0,
        report_sub_section: null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      if (data) {
        // Clear filters so the new (blank) question is always visible; the
        // editing-snap effect will then jump qPage to its row.
        setSearchFilter('');
        setSubSectionFilter('all');
        setQuestions((prev) => [...prev, data]);
        setEditingQuestionId(data.id);
      }
    });
  };

  const saveEditingQuestion = useCallback(
    (questionId: string) => {
      const q = questions.find((qu) => qu.id === questionId);
      if (!q) return;
      updateTemplateQuestion(questionId, {
        question_text: q.question_text,
        report_order: q.report_order,
        report_sub_section: q.report_sub_section ?? null,
      }).then(({ error }) => {
        if (error) toast.error(error);
      });
    },
    [questions]
  );

  const updateQuestionInState = useCallback(
    (questionId: string, updates: Partial<VisitReportTemplateQuestion>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q))
      );
    },
    []
  );

  useEffect(() => {
    if (!editingQuestionId) return;
    const q = questions.find((qu) => qu.id === editingQuestionId);
    if (!q) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveEditingQuestion(editingQuestionId);
    }, DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editingQuestionId, questions, saveEditingQuestion]);

  const handleDelete = (questionId: string) => {
    if (editingQuestionId === questionId) setEditingQuestionId(null);
    startTransition(async () => {
      const { error } = await deleteTemplateQuestion(questionId);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Question deleted.');
      refresh();
    });
  };

  const handleBulkUpload = () => {
    if (!bulkFile) {
      toast.error('Select a file first');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseBulkUploadCsv(text);
      if (!parsed.success) {
        toast.error(parsed.error);
        return;
      }
      const rawInputs = parsed.data.map((q) => ({
        question_text: q.activity,
        report_order: q.report_order ?? 0,
        report_sub_section: q.report_sub_section ?? null,
      }));
      const maxExistingOrder =
        questions.length > 0 ? Math.max(0, ...questions.map((q) => q.report_order ?? 0)) : 0;
      const inputs: BulkUploadQuestionInput[] = normalizeReportOrderBySection(
        rawInputs,
        maxExistingOrder + 1
      ).map((q) => ({
        question_text: q.question_text,
        report_order: q.report_order,
        report_sub_section: q.report_sub_section,
      }));
      startTransition(async () => {
        const { count, error } = await bulkUploadTemplateQuestions(template.id, inputs);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success(`${count} question(s) added.`);
        setBulkOpen(false);
        setBulkFile(null);
        refresh({ jumpToLastPage: true });
      });
    };
    reader.readAsText(bulkFile);
  };

  const onSearchFilterChange = (v: string) => {
    setSearchFilter(v);
    updatePagerParam('qPage', '1');
  };

  const onSubSectionFilterChange = (v: string) => {
    setSubSectionFilter(v);
    updatePagerParam('qPage', '1');
  };

  const onPageSizeChange = (v: string) => {
    updatePagerParam('qPage', '1');
    updatePagerParam('qPs', v);
  };

  const renderQuestionsPager = () => {
    if (total <= 0) return null;
    const showingFrom = (currentPage - 1) * parsedPageSize + 1;
    const showingTo = Math.min(total, currentPage * parsedPageSize);
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <div>
          Questions: showing {showingFrom}–{showingTo} of {total}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            <span>Rows per page</span>
            <Select value={String(parsedPageSize)} onValueChange={onPageSizeChange}>
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue getDisplayLabel={(v) => v ?? String(parsedPageSize)} />
              </SelectTrigger>
              <SelectContent>
                {QUESTIONS_PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage <= 1}
              onClick={() =>
                updatePagerParam(
                  'qPage',
                  currentPage - 1 <= 1 ? null : String(Math.max(1, currentPage - 1))
                )
              }
              aria-label="Previous questions page"
            >
              Prev
            </Button>
            <span className="px-1">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage >= totalPages}
              onClick={() =>
                updatePagerParam('qPage', String(Math.min(totalPages, currentPage + 1)))
              }
              aria-label="Next questions page"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const hasQuestions = questions.length > 0;
  const hasFilteredMatches = filteredQuestions.length > 0;
  const isFiltering = searchFilter.trim() !== '' || subSectionFilter !== 'all';

  return (
    <TooltipProvider delay={200}>
      <div className="space-y-6">
        {/* Header: back link + title block + meta line */}
        <div className="flex items-start gap-4">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={`${tripReportsBasePath}?tab=admin`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-1')}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Template List
                </Link>
              }
            />
            <TooltipContent side="bottom" className="max-w-[280px] text-xs">
              Return to Trip Reports and open the Templates tab to manage all templates.
            </TooltipContent>
          </Tooltip>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
              {readOnly ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link
                        href={`${tripReportsBasePath}/templates/${template.id}`}
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'shrink-0'
                        )}
                      >
                        <Pencil className="h-4 w-4 mr-1.5" />
                        Edit template
                      </Link>
                    }
                  />
                  <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                    Open full edit mode for this template to change questions and settings.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setEditTemplateModalOpen(true)}
                        aria-label="Edit template"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                    Edit template name, study scope, visit type, and submission or approval day rules.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {VISIT_REPORT_TYPE_LABELS[template.visit_report_type as keyof typeof VISIT_REPORT_TYPE_LABELS]}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Questions: {questions.length}
              <span className="mx-1.5">·</span>
              Updated {formatUpdatedAt(template.updated_at)}
            </p>
          </div>
        </div>

        {/* Toolbar: search + sub-section filter (left) + actions (right) */}
        {(hasQuestions || !readOnly) && (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="questions-search" className="text-xs">
                  Search
                </Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="questions-search"
                    value={searchFilter}
                    onChange={(e) => onSearchFilterChange(e.target.value)}
                    placeholder="Search questions..."
                    className="h-8 w-[240px] pl-7 text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="questions-sub-filter" className="text-xs">
                  Sub-section
                </Label>
                <Select value={subSectionFilter} onValueChange={onSubSectionFilterChange}>
                  <SelectTrigger id="questions-sub-filter" className="h-8 w-[200px] text-xs">
                    <SelectValue
                      placeholder="All sub-sections"
                      getDisplayLabel={(v) => (!v || v === 'all' ? 'All sub-sections' : v)}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sub-sections</SelectItem>
                    {subSectionOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button size="sm" onClick={handleAddQuestion} disabled={isPending}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Question
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                    Append a new question row at the end of this template. Changes save automatically after you finish editing.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                        <Upload className="h-4 w-4 mr-1.5" />
                        Bulk Upload
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                    Import many questions from a CSV (report order, sub-section, question text). Download the sample file in the dialog for the expected format.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button variant="outline" size="sm" onClick={() => setAiWizardOpen(true)}>
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        AI Generate
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                    Open the wizard to generate draft questions from study context and your preferences, then add them to this template.
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border">
          <div className="max-h-[60vh] overflow-y-auto">
            <Table aria-label="Trip report template questions">
              <TableHeader className="bg-muted/50 [&_tr]:border-b-0">
                <TableRow className="border-b border-border">
                  <TableHead className="w-10 text-xs sticky top-0 left-0 z-20 bg-muted/50">#</TableHead>
                  <TableHead className="text-xs sticky top-0 z-10 bg-muted/50">
                    Visit Report Template
                  </TableHead>
                  <TableHead className="text-xs w-24 sticky top-0 z-10 bg-muted/50">
                    Report Order
                  </TableHead>
                  <TableHead className="text-xs w-48 sticky top-0 z-10 bg-muted/50">
                    Report Sub Section
                  </TableHead>
                  <TableHead className="text-xs sticky top-0 z-10 bg-muted/50">Question</TableHead>
                  {!readOnly && (
                    <TableHead className="text-xs w-16 sticky top-0 z-10 bg-muted/50">
                      Action
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hasFilteredMatches ? (
                  <TableRow>
                    <TableCell
                      colSpan={readOnly ? 5 : 6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {hasQuestions && isFiltering
                        ? 'No questions match the current filters.'
                        : 'No questions yet. Add a question or bulk upload via CSV.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedQuestions.map((q, idx) => {
                    const isEditing = !readOnly && q.id === editingQuestionId;
                    const globalRowIndex = (currentPage - 1) * parsedPageSize + idx;
                    const stripe = !isEditing && globalRowIndex % 2 === 1;
                    return (
                      <TableRow
                        key={q.id}
                        className={cn(
                          isEditing && 'bg-muted/50',
                          stripe && 'bg-muted/30'
                        )}
                      >
                        <TableCell
                          className={cn(
                            'text-xs text-muted-foreground align-middle sticky left-0 z-[1]',
                            isEditing
                              ? 'bg-muted/50'
                              : stripe
                                ? 'bg-muted/30'
                                : 'bg-background'
                          )}
                        >
                          {globalRowIndex + 1}
                        </TableCell>
                        <TableCell className="text-xs align-middle">
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs">
                            {VISIT_REPORT_TYPE_LABELS[template.visit_report_type as keyof typeof VISIT_REPORT_TYPE_LABELS]}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs align-middle p-2">
                          {readOnly ? (
                            <span className="text-[12px]">{q.report_order}</span>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              value={q.report_order}
                              onChange={(e) => {
                                updateQuestionInState(q.id, {
                                  report_order: parseInt(e.target.value, 10) || 0,
                                });
                                setEditingQuestionId(q.id);
                              }}
                              className="text-[12px] h-8 w-full max-w-[4rem]"
                              placeholder="Order"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-xs align-middle p-2">
                          {readOnly ? (
                            <span className="text-[12px]">{q.report_sub_section ?? '—'}</span>
                          ) : (
                            <Input
                              value={q.report_sub_section ?? ''}
                              onChange={(e) => {
                                updateQuestionInState(q.id, { report_sub_section: e.target.value });
                                setEditingQuestionId(q.id);
                              }}
                              className="text-[12px] h-8 w-full"
                              placeholder="e.g. Section A"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-xs align-middle p-2">
                          {readOnly ? (
                            <span className="text-[12px]">{q.question_text}</span>
                          ) : (
                            <Input
                              value={q.question_text}
                              onChange={(e) => {
                                updateQuestionInState(q.id, { question_text: e.target.value });
                                setEditingQuestionId(q.id);
                              }}
                              className="text-[12px] h-8 w-full"
                              placeholder="Enter question text..."
                            />
                          )}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="align-middle p-2">
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDelete(q.id)}
                                      disabled={isPending}
                                      aria-label="Delete question"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                                  Permanently remove this question from the template.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {renderQuestionsPager()}

        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Upload Report Questions</DialogTitle>
              <p className="text-sm text-muted-foreground">Upload your data through csv.</p>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-1">CSV Columns (all required)</h4>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li><strong>Report Order</strong> — Numeric sort order for the question in the report</li>
                  <li><strong>Report Sub Section</strong> — Sub-group label for this question</li>
                  <li><strong>Question</strong> — The checklist question text</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Step 1: Download Sample Template</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Download sample template by clicking the button below. You can add your data according to the template file.
                </p>
                <Button variant="outline" size="sm" onClick={downloadSampleCsv}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download Sample
                </Button>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Step 2: Upload CSV</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload the edited template by clicking the button below.
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  className="text-[12px]"
                  onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkUpload} disabled={!bulkFile || isPending}>
                <Upload className="h-4 w-4 mr-1.5" />
                Upload File
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AIQuestionWizard
          open={aiWizardOpen}
          onOpenChange={setAiWizardOpen}
          template={template}
          studies={studies}
          onSuccess={() => refresh({ jumpToLastPage: true })}
        />

        <AddEditTemplateModal
          open={editTemplateModalOpen}
          onOpenChange={setEditTemplateModalOpen}
          template={template}
          studies={studies}
          onSuccess={() => {
            setEditTemplateModalOpen(false);
            router.refresh();
          }}
        />
      </div>
    </TooltipProvider>
  );
}
