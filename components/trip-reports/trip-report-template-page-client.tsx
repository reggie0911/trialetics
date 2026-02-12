'use client';

import { useState, useCallback } from 'react';
import {
  Pencil,
  Plus,
  Trash2,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  updateTripReportTemplate,
  upsertTripReportTemplateDetails,
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
}

function formatTemplateId(id: string): string {
  return `VRT-${id.split('-')[0]}`;
}

export function TripReportTemplatePageClient({ template, companyId }: TripReportTemplatePageClientProps) {
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
  const [isSaving, setIsSaving] = useState(false);

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

    const result = await upsertTripReportTemplateDetails(template.id, payload);
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
    setIsSaving(false);
  }, [template.id, questions, toast]);

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

  const sortedQuestions = [...questions].sort((a, b) => a.report_order - b.report_order || a.sort_order - b.sort_order);

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
                  <th className="text-left py-2 px-3 font-medium w-24 text-[12px]">Report Order</th>
                  <th className="text-left py-2 px-3 font-medium w-48 text-[12px]">Report Sub Section</th>
                  <th className="text-left py-2 px-3 font-medium text-[12px]">Question</th>
                  <th className="text-left py-2 px-3 font-medium w-12 text-[12px]"></th>
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
                      <Input
                        type="number"
                        value={q.report_order}
                        onChange={(e) => updateQuestion(questions.indexOf(q), 'report_order', parseInt(e.target.value, 10) || 0)}
                        className="h-7 w-20"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                    <td className="py-2 px-3 text-[12px]">
                      <Input
                        value={q.report_sub_section}
                        onChange={(e) => updateQuestion(questions.indexOf(q), 'report_sub_section', e.target.value)}
                        placeholder="e.g. FINANCE"
                        className="h-7"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                    <td className="py-2 px-3 text-[12px]">
                      <Input
                        value={q.activity}
                        onChange={(e) => updateQuestion(questions.indexOf(q), 'activity', e.target.value)}
                        placeholder="Enter question text"
                        className="h-7"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                    <td className="py-2 px-3 text-[12px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeQuestion(questions.indexOf(q))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
    </div>
  );
}
