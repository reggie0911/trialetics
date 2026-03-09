'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Pencil,
  Plus,
  Trash2,
  Loader2,
  Check,
  X,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  updateTripReportTemplate,
  upsertTripReportTemplateDetails,
  upsertSubSectionOrder,
} from '@/lib/actions/trip-report-templates';
import { TripReportBulkUploadDialog } from './trip-report-bulk-upload-dialog';
import type { BulkUploadQuestion } from '@/lib/utils/parse-bulk-upload-csv';
import type { TripReportTemplateWithDetails } from '@/lib/types/trip-reports';
import { SITE_VISIT_TYPE_LABELS } from '@/lib/types/contacts-organizations';

interface QuestionRow {
  id?: string;
  activity_type: 'checklist';
  activity: string;
  report_order: number;
  report_sub_section: string;
  sort_order: number;
}

interface TripReportTemplatePageClientProps {
  template: TripReportTemplateWithDetails;
  companyId: string;
  initialSubSectionOrder?: string[];
}

function formatTemplateId(id: string): string {
  return `VRT-${id.split('-')[0]}`;
}

function SortableSubSection({ id, questionCount }: { id: string; questionCount: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-[12px]"
    >
      <button type="button" className="cursor-grab touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
      <span className="font-medium">{id}</span>
      <span className="text-muted-foreground">({questionCount})</span>
    </div>
  );
}

export function TripReportTemplatePageClient({ template, companyId, initialSubSectionOrder = [] }: TripReportTemplatePageClientProps) {
  const { toast } = useToast();
  const [name, setName] = useState(template.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [questions, setQuestions] = useState<QuestionRow[]>(() => {
    const details = (template.details || []).filter((d) => d.activity_type === 'checklist');
    return details.map((d) => ({
      id: d.id,
      activity_type: 'checklist' as const,
      activity: d.activity,
      report_order: d.report_order ?? d.sort_order ?? 0,
      report_sub_section: d.report_sub_section ?? '',
      sort_order: d.sort_order,
    }));
  });
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateNumQuestions, setGenerateNumQuestions] = useState(10);
  const [generateFocusSections, setGenerateFocusSections] = useState('');
  const [generateAdditionalContext, setGenerateAdditionalContext] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);
  const [subSectionOrder, setSubSectionOrder] = useState<string[]>(initialSubSectionOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.questions?.length) return;
      const rows: QuestionRow[] = detail.questions.map((q: { activity: string; report_order: number; report_sub_section: string }, i: number) => ({
        activity_type: 'checklist' as const,
        activity: q.activity,
        report_order: q.report_order,
        report_sub_section: q.report_sub_section || '',
        sort_order: questions.length + i,
      }));
      setQuestions(prev => [...prev, ...rows]);
      toast({ title: 'AI Generated', description: `${rows.length} questions added from chat. Review and save.` });
    };
    window.addEventListener('ai-generated-questions', handler);
    return () => window.removeEventListener('ai-generated-questions', handler);
  }, [questions.length, toast]);

  const uniqueSections = useMemo(() => {
    return [...new Set(questions.map(q => q.report_sub_section).filter(Boolean))];
  }, [questions]);

  useEffect(() => {
    setSubSectionOrder(prev => {
      const missing = uniqueSections.filter(s => !prev.includes(s));
      if (missing.length === 0) return prev;
      return [...prev, ...missing];
    });
  }, [uniqueSections]);

  const sectionQuestionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of questions) {
      const sec = q.report_sub_section || '';
      if (sec) counts[sec] = (counts[sec] || 0) + 1;
    }
    return counts;
  }, [questions]);

  const displayedSectionOrder = useMemo(() => {
    return subSectionOrder.filter(s => sectionQuestionCounts[s]);
  }, [subSectionOrder, sectionQuestionCounts]);

  const handleSectionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSubSectionOrder(prev => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const visitTypeLabel = SITE_VISIT_TYPE_LABELS[template.visit_type as keyof typeof SITE_VISIT_TYPE_LABELS] ?? template.visit_type;

  const saveQuestions = useCallback(async () => {
    setIsSaving(true);
    const payload = questions.map((q, i) => ({
      id: q.id,
      activity_type: 'checklist' as const,
      activity: q.activity.trim() || '(Untitled question)',
      sort_order: i,
      report_order: q.report_order,
      report_sub_section: q.report_sub_section || null,
    }));

    const [result, orderResult] = await Promise.all([
      upsertTripReportTemplateDetails(template.id, payload),
      upsertSubSectionOrder(template.id, subSectionOrder),
    ]);

    if (result.success) {
      setQuestions((prev) =>
        prev.map((p, i) => ({
          ...p,
          id: result.data?.[i]?.id ?? p.id,
          sort_order: i,
        }))
      );
      toast({ title: 'Saved', description: 'Questions updated successfully' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    if (!orderResult.success) {
      console.error('Failed to save sub-section order:', orderResult.error);
    }
    setIsSaving(false);
  }, [template.id, questions, subSectionOrder, toast]);

  const handleSaveName = async () => {
    if (name.trim() === template.name) {
      setIsEditingName(false);
      return;
    }
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    const result = await updateTripReportTemplate(template.id, { name: name.trim() });
    if (result.success) {
      setIsEditingName(false);
      toast({ title: 'Saved', description: 'Template name updated' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const addQuestion = () => {
    const maxOrder = questions.reduce((m, q) => Math.max(m, q.report_order), 0);
    setQuestions((prev) => [
      ...prev,
      {
        activity_type: 'checklist' as const,
        activity: '',
        report_order: maxOrder + 1,
        report_sub_section: '',
        sort_order: prev.length,
      },
    ]);
  };

  const updateQuestion = (index: number, field: keyof QuestionRow, value: string | number) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkImport = (imported: BulkUploadQuestion[]) => {
    const rows: QuestionRow[] = imported.map((q, i) => ({
      activity_type: 'checklist' as const,
      activity: q.activity,
      report_order: q.report_order ?? 0,
      report_sub_section: q.report_sub_section ?? '',
      sort_order: questions.length + i,
    }));
    setQuestions((prev) => [...prev, ...rows]);
  };

  const handleGenerateQuestions = useCallback(async () => {
    setIsGenerating(true);
    try {
      const body: Record<string, unknown> = {
        templateId: template.id,
        numQuestions: generateNumQuestions,
      };
      if (generateFocusSections.trim()) {
        body.focusSections = generateFocusSections.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (generateAdditionalContext.trim()) {
        body.additionalContext = generateAdditionalContext.trim();
      }

      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      if (data.questions?.length) {
        const rows: QuestionRow[] = data.questions.map((q: { activity: string; report_order: number; report_sub_section: string }, i: number) => ({
          activity_type: 'checklist' as const,
          activity: q.activity,
          report_order: q.report_order,
          report_sub_section: q.report_sub_section || '',
          sort_order: questions.length + i,
        }));
        setQuestions(prev => [...prev, ...rows]);
        toast({ title: 'Generated', description: `${rows.length} questions added. Review and save.` });
        setShowGenerateDialog(false);
        setGenerateFocusSections('');
        setGenerateAdditionalContext('');
      } else {
        toast({ title: 'No questions generated', description: 'Try adjusting your parameters.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate questions', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  }, [template.id, generateNumQuestions, generateFocusSections, generateAdditionalContext, questions.length, toast]);

  const regenerateQuestion = useCallback(async (index: number) => {
    const row = questions[index];
    if (!row) return;
    setIsRegenerating(index);
    try {
      const section = row.report_sub_section || 'GENERAL';
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          numQuestions: 1,
          focusSections: [section],
          additionalContext: row.activity
            ? `Generate a different question than: "${row.activity}"`
            : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }
      if (data.questions?.[0]?.activity) {
        setQuestions(prev => {
          const next = [...prev];
          next[index] = { ...next[index], activity: data.questions[0].activity };
          return next;
        });
      } else {
        toast({ title: 'No question generated', description: 'Try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to regenerate question', variant: 'destructive' });
    } finally {
      setIsRegenerating(null);
    }
  }, [questions, template.id, toast]);

  const sortedQuestions = useMemo(() => {
    const sectionIndex = (name: string) => {
      const idx = subSectionOrder.indexOf(name);
      return idx === -1 ? subSectionOrder.length : idx;
    };
    return [...questions].sort(
      (a, b) => sectionIndex(a.report_sub_section) - sectionIndex(b.report_sub_section)
        || a.sort_order - b.sort_order
    );
  }, [questions, subSectionOrder]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 w-64"
                    style={{ fontSize: '12px' }}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveName} disabled={isSaving}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setIsEditingName(false); setName(template.name); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <CardTitle className="text-[12px] font-medium">{name}</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
            <div className="text-[12px] text-muted-foreground">
              Template: {formatTemplateId(template.id)}
            </div>
          </div>
          <div className="mt-1">
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[12px] font-medium">
              {visitTypeLabel}
            </span>
          </div>
        </CardHeader>
      </Card>

      {displayedSectionOrder.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-medium">Sub-Section Order</CardTitle>
            <p className="text-[10px] text-muted-foreground">Drag to reorder how sub-sections appear in the questions table and generated reports.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext items={displayedSectionOrder} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                  {displayedSectionOrder.map(section => (
                    <SortableSubSection
                      key={section}
                      id={section}
                      questionCount={sectionQuestionCounts[section] || 0}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-[12px] font-medium">
            Questions (Question Count: {questions.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={addQuestion} className="text-[12px]">
              <Plus className="h-3 w-3 mr-1" />
              Add Question
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const existingSections = [...new Set(questions.map(q => q.report_sub_section).filter(Boolean))];
              setGenerateFocusSections(existingSections.join(', '));
              setShowGenerateDialog(true);
            }} className="text-[12px]">
              <Sparkles className="h-3 w-3 mr-1" />
              Generate Questions
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowBulkUpload(true)} className="text-[12px]">
              Bulk Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium w-10 text-[12px]">#</th>
                  <th className="text-left py-2 px-3 font-medium w-48 text-[12px]">Visit Report Template</th>
                  <th className="text-left py-2 px-3 font-medium w-48 text-[12px]">Report Sub Section</th>
                  <th className="text-left py-2 px-3 font-medium text-[12px]">Question</th>
                  <th className="text-left py-2 px-3 font-medium w-20 text-[12px]"></th>
                </tr>
              </thead>
              <tbody>
                {sortedQuestions.map((q, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3 text-[12px]">{i + 1}.</td>
                    <td className="py-2 px-3 text-[12px]">
                      <Input
                        value={visitTypeLabel}
                        readOnly
                        className="h-7 bg-muted/50 text-muted-foreground"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                    <td className="py-2 px-3 text-[12px]">
                      <Textarea
                        value={q.report_sub_section}
                        onChange={(e) => updateQuestion(questions.indexOf(q), 'report_sub_section', e.target.value)}
                        placeholder="e.g. FINANCE"
                        className="min-h-[28px] py-1 resize-none overflow-hidden"
                        style={{ fontSize: '12px' }}
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          }
                        }}
                      />
                    </td>
                    <td className="py-2 px-3 text-[12px]">
                      <Textarea
                        value={q.activity}
                        onChange={(e) => updateQuestion(questions.indexOf(q), 'activity', e.target.value)}
                        placeholder="Enter question text"
                        className="min-h-[28px] py-1 resize-none overflow-hidden"
                        style={{ fontSize: '12px' }}
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          }
                        }}
                      />
                    </td>
                    <td className="py-2 px-3 text-[12px]">
                      <div className="flex gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => regenerateQuestion(questions.indexOf(q))}
                              disabled={isRegenerating === questions.indexOf(q)}
                            >
                              {isRegenerating === questions.indexOf(q)
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Sparkles className="h-3 w-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Regenerate question with AI</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => removeQuestion(questions.indexOf(q))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete question</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {questions.length === 0 && (
            <p className="text-[12px] text-muted-foreground py-8 text-center">No questions yet. Add a question or bulk upload.</p>
          )}
          <div className="mt-4">
            <Button onClick={saveQuestions} disabled={isSaving} className="text-[12px]">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Questions'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <TripReportBulkUploadDialog
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onImport={handleBulkImport}
      />

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Generate Questions with AI</DialogTitle>
            <DialogDescription className="text-xs">
              AI will generate checklist questions based on the visit type ({visitTypeLabel}) and clinical best practices.
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="gen-num" className="text-xs">Number of questions</Label>
              <p className="text-[10px] text-muted-foreground">How many questions to generate and append to the template (max 75).</p>
              <Input
                id="gen-num"
                type="number"
                min={1}
                max={75}
                value={generateNumQuestions}
                onChange={(e) => setGenerateNumQuestions(parseInt(e.target.value, 10) || 10)}
                className="h-8"
                style={{ fontSize: '12px' }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gen-sections" className="text-xs">Focus sub-sections</Label>
              <p className="text-[10px] text-muted-foreground">Comma-separated report sub-section names. Generated questions will be assigned to these sections. Leave empty to let AI choose a balanced mix.</p>
              <Input
                id="gen-sections"
                value={generateFocusSections}
                onChange={(e) => setGenerateFocusSections(e.target.value)}
                placeholder="e.g. SAFETY, FINANCE, REGULATORY"
                className="h-8"
                style={{ fontSize: '12px' }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gen-context" className="text-xs">Additional instructions</Label>
              <p className="text-[10px] text-muted-foreground">Provide any specific topics, areas of concern, or guidelines for the AI to follow when generating questions.</p>
              <Textarea
                id="gen-context"
                value={generateAdditionalContext}
                onChange={(e) => setGenerateAdditionalContext(e.target.value)}
                placeholder="e.g. Include questions about informed consent re-consent process"
                className="min-h-[60px] text-xs resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowGenerateDialog(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button size="sm" className="text-xs" onClick={handleGenerateQuestions} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
