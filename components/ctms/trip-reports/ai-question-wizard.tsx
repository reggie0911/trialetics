'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { normalizeReportOrderBySection } from '@/lib/utils/normalize-report-order-by-section';
import { bulkUploadTemplateQuestions } from '@/lib/actions/visit-reports';
import type { VisitReportTemplate } from '@/lib/types/visit-reports';
import type { GeneratedVisitReportQuestion } from '@/lib/ai/generate-visit-report-questions';

const FOCUS_SECTION_OPTIONS = [
  'Patient safety',
  'Protocol compliance',
  'Source data verification',
  'Informed consent',
  'Investigational product / device accountability',
  'Staff training',
  'Essential documents',
  'Enrollment / recruitment',
  'Data quality / query management',
  'Adverse events / SAEs',
  'Site operations',
  'Laboratory / specimen handling',
  'Pharmacy',
  'Regulatory readiness',
  'CAPA / issue follow-up',
] as const;

interface StudyOption {
  id: string;
  title: string;
  protocol_number: string | null;
  description?: string | null;
  therapeutic_area?: string | null;
  indication?: string | null;
}

interface AIQuestionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: VisitReportTemplate;
  studies: StudyOption[];
  onSuccess: () => void;
}

const STUDY_NONE = '__none__';

function buildStudyDescription(study: StudyOption): string {
  const parts: string[] = [];
  if (study.title) parts.push(study.title);
  if (study.protocol_number) parts.push(`Protocol: ${study.protocol_number}`);
  if (study.therapeutic_area) parts.push(`Therapeutic area: ${study.therapeutic_area}`);
  if (study.indication) parts.push(`Indication: ${study.indication}`);
  if (study.description) parts.push(study.description);
  return parts.filter(Boolean).join('. ');
}

export function AIQuestionWizard({
  open,
  onOpenChange,
  template,
  studies,
  onSuccess,
}: AIQuestionWizardProps) {
  const [studyDescription, setStudyDescription] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState<string>(STUDY_NONE);
  const [numQuestions, setNumQuestions] = useState(10);
  const [focusSections, setFocusSections] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedVisitReportQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const canGenerate =
    studyDescription.trim().length >= 20 && !isGenerating;

  // When template has a study, default to it and prefill description
  useEffect(() => {
    if (open && template.study_id) {
      const study = studies.find((s) => s.id === template.study_id);
      if (study) {
        setSelectedStudyId(template.study_id);
        setStudyDescription(buildStudyDescription(study));
      }
    } else if (open && !template.study_id) {
      setSelectedStudyId(STUDY_NONE);
      setStudyDescription('');
    }
  }, [open, template.study_id, studies]);

  const handleStudySelect = (studyId: string) => {
    setSelectedStudyId(studyId);
    if (studyId && studyId !== STUDY_NONE) {
      const study = studies.find((s) => s.id === studyId);
      if (study) {
        setStudyDescription(buildStudyDescription(study));
      }
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          studyDescription: studyDescription.trim(),
          numQuestions,
          focusSections: focusSections.length > 0 ? focusSections : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate questions');
        return;
      }
      if (!data.questions || data.questions.length === 0) {
        toast.error('No questions generated. Try a longer study description or different focus.');
        return;
      }
      setGeneratedQuestions(data.questions);
      setSelectedIds(new Set(data.questions.map((_: unknown, i: number) => i)));
      setStep(4);
      toast.success(`${data.questions.length} question(s) generated.`);
    } catch {
      toast.error('Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelected = (idx: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateQuestion = (idx: number, field: 'question_text' | 'report_sub_section', value: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const handleAddSelected = async () => {
    const selected = generatedQuestions
      .filter((_, i) => selectedIds.has(i))
      .map((q) => ({
        question_text: q.question_text,
        report_order: q.report_order,
        report_sub_section: q.report_sub_section || null,
      }));
    if (selected.length === 0) {
      toast.error('Select at least one question to add.');
      return;
    }
    const startOrder = Math.min(...selected.map((q) => q.report_order ?? 0));
    const toAdd = normalizeReportOrderBySection(selected, startOrder).map((q) => ({
      question_text: q.question_text,
      report_order: q.report_order,
      report_sub_section: q.report_sub_section,
    }));
    setIsAdding(true);
    try {
      const { count, error } = await bulkUploadTemplateQuestions(template.id, toAdd);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`${count} question(s) added.`);
      onSuccess();
      onOpenChange(false);
      resetWizard();
    } catch {
      toast.error('Failed to add questions');
    } finally {
      setIsAdding(false);
    }
  };

  const resetWizard = () => {
    setStudyDescription('');
    setSelectedStudyId(STUDY_NONE);
    setNumQuestions(10);
    setFocusSections([]);
    setGeneratedQuestions([]);
    setSelectedIds(new Set());
    setStep(1);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetWizard();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Generate Questions
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Step 1 & 2: Study context + config */}
          {(step === 1 || step === 2 || step === 3) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="study-desc">Study description (required)</Label>
                <p className="text-xs text-muted-foreground">
                  Brief context so the AI can generate relevant, study-specific questions.
                </p>
                <div className="flex gap-2">
                  <Select
                    value={selectedStudyId}
                    onValueChange={handleStudySelect}
                  >
                    <SelectTrigger className="w-[200px] shrink-0">
                      <SelectValue
                        placeholder="Preload from study"
                        getDisplayLabel={(v) => {
                          if (!v || v === STUDY_NONE) return 'Preload from study';
                          const study = studies.find((s) => s.id === v);
                          if (!study) return 'Select study';
                          const label = study.protocol_number
                            ? `${study.title} (${study.protocol_number})`
                            : study.title;
                          return label && label.length > 0 ? label.charAt(0).toUpperCase() + label.slice(1) : 'Select study';
                        }}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={STUDY_NONE}>Preload from study</SelectItem>
                      {studies.map((s) => {
                        const label = s.protocol_number
                          ? `${s.title} (${s.protocol_number})`
                          : s.title;
                        const displayLabel = label && label.length > 0 ? label.charAt(0).toUpperCase() + label.slice(1) : s.title;
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            {displayLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <textarea
                  id="study-desc"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. Phase 3 oncology trial, checkpoint inhibitor, 500 subjects, SDV, IP accountability..."
                  value={studyDescription}
                  onChange={(e) => setStudyDescription(e.target.value)}
                  disabled={isGenerating}
                />
                {studyDescription.length > 0 && studyDescription.length < 20 && (
                  <p className="text-xs text-amber-600">
                    Add more detail (min 20 characters)
                  </p>
                )}
              </div>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <span className="inline-flex items-center gap-1 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    {advancedOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Advanced
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="num-questions">Number of questions</Label>
                    <Input
                      id="num-questions"
                      type="number"
                      min={5}
                      max={50}
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(Math.max(5, Math.min(50, parseInt(e.target.value, 10) || 10)))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Focus sections (optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Select areas to focus generated questions on. Leave empty for a broad set.
                    </p>
                    <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1 rounded-md border border-border/60 p-2 bg-muted/30">
                      {FOCUS_SECTION_OPTIONS.map((sec) => {
                        const isSelected = focusSections.includes(sec);
                        return (
                          <label
                            key={sec}
                            className={cn(
                              'flex items-start gap-2 text-xs cursor-pointer rounded px-2 py-1.5 transition-colors',
                              isSelected
                                ? 'bg-primary/15 text-primary font-medium'
                                : 'hover:bg-muted'
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                setFocusSections((prev) =>
                                  checked ? [...prev, sec] : prev.filter((s) => s !== sec)
                                )
                              }
                              className="shrink-0 mt-0.5"
                            />
                            <span className="break-words leading-tight">{sec}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Step 4: Preview */}
          {step === 4 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Review the generated questions. Edit if needed, then add selected to the template.
              </p>
              <div className="rounded-md border max-h-[300px] overflow-auto min-w-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 shrink-0" />
                      <TableHead className="w-12 shrink-0">Order</TableHead>
                      <TableHead className="min-w-[180px]">Sub section</TableHead>
                      <TableHead className="min-w-[320px]">Question</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedQuestions.map((q, idx) => (
                      <TableRow key={idx} className="h-auto">
                        <TableCell className="align-top pt-2 shrink-0">
                          <Checkbox
                            checked={selectedIds.has(idx)}
                            onCheckedChange={() => toggleSelected(idx)}
                          />
                        </TableCell>
                        <TableCell className="text-xs align-top pt-2 shrink-0">
                          {q.report_order}
                        </TableCell>
                        <TableCell className="align-top p-1 min-w-[180px]">
                          <Textarea
                            className="text-xs min-h-10 py-1.5 resize-none w-full min-w-0"
                            value={q.report_sub_section}
                            onChange={(e) => updateQuestion(idx, 'report_sub_section', e.target.value)}
                            rows={1}
                          />
                        </TableCell>
                        <TableCell className="align-top p-1 min-w-[320px]">
                          <Textarea
                            className="text-xs min-h-10 py-1.5 resize-none w-full min-w-0"
                            value={q.question_text}
                            onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                            rows={2}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 4 ? (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleAddSelected} disabled={isAdding || selectedIds.size === 0}>
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add {selectedIds.size} selected
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
