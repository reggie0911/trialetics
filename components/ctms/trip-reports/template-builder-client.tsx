'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Upload, Trash2, Download, Pencil, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import {
  addTemplateQuestion,
  deleteTemplateQuestion,
  updateTemplateQuestion,
  bulkUploadTemplateQuestions,
  type BulkUploadQuestionInput,
} from '@/lib/actions/visit-reports';
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

interface StudyOption {
  id: string;
  title: string;
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
}

const DEBOUNCE_MS = 500;

export function TemplateBuilderClient({ template, initialQuestions, studies, readOnly = false }: TemplateBuilderClientProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [aiWizardOpen, setAiWizardOpen] = useState(false);
  const [editTemplateModalOpen, setEditTemplateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = () => {
    startTransition(async () => {
      try {
        const { getTemplateQuestions } = await import('@/lib/actions/visit-reports');
        const list = await getTemplateQuestions(template.id);
        setQuestions(list);
      } catch {
        toast.error('Failed to refresh questions');
      }
    });
  };

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
        setQuestions((prev) => [...prev, data]);
        setEditingQuestionId(data.id);
      }
    });
  };

  const saveEditingQuestion = useCallback((questionId: string) => {
    const q = questions.find((qu) => qu.id === questionId);
    if (!q) return;
    updateTemplateQuestion(questionId, {
      question_text: q.question_text,
      report_order: q.report_order,
      report_sub_section: q.report_sub_section ?? null,
    }).then(({ error }) => {
      if (error) toast.error(error);
    });
  }, [questions]);

  const updateQuestionInState = useCallback((questionId: string, updates: Partial<VisitReportTemplateQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q))
    );
  }, []);

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
        refresh();
      });
    };
    reader.readAsText(bulkFile);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/protected/trip-reports?tab=admin"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Template List
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
              {readOnly ? (
                <Link
                  href={`/protected/trip-reports/templates/${template.id}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit template
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setEditTemplateModalOpen(true)}
                  aria-label="Edit template"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {VISIT_REPORT_TYPE_LABELS[template.visit_report_type as keyof typeof VISIT_REPORT_TYPE_LABELS]}
            </p>
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddQuestion} disabled={isPending}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Question
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Bulk Upload
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAiWizardOpen(true)}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI Generate
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-xs">#</TableHead>
              <TableHead className="text-xs">Visit Report Template</TableHead>
              <TableHead className="text-xs w-24">Report Order</TableHead>
              <TableHead className="text-xs w-48">Report Sub Section</TableHead>
              <TableHead className="text-xs">Question (Question Count: {questions.length})</TableHead>
              {!readOnly && <TableHead className="text-xs w-16">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="text-center text-muted-foreground py-8">
                  No questions yet. Add a question or bulk upload via CSV.
                </TableCell>
              </TableRow>
            ) : (
              questions.map((q, idx) => {
                const isEditing = !readOnly && q.id === editingQuestionId;
                return (
                  <TableRow key={q.id} className={isEditing ? 'bg-muted/50' : undefined}>
                    <TableCell className="text-xs text-muted-foreground align-middle">{idx + 1}</TableCell>
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
        onSuccess={refresh}
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
  );
}
