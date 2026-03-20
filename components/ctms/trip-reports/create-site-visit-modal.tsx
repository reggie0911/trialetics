'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

import { createSiteVisitWithReport } from '@/lib/actions/visit-reports';
import type { TemplateWithQuestionCount } from '@/lib/actions/visit-reports';
import { getStudySites } from '@/lib/actions/sites';
import type { Study } from '@/lib/types/ctms';
import type { StudySite } from '@/lib/types/ctms';
import {
  VISIT_REPORT_TYPE_OPTIONS,
  VISIT_REPORT_TYPE_LABELS,
  VISIT_LOCATION_OPTIONS,
  VISIT_LOCATION_LABELS,
} from '@/lib/types/visit-reports';

const schema = z.object({
  study_id: z.string().min(1, 'Select a protocol'),
  site_id: z.string().min(1, 'Select a site'),
  site_number: z.string().optional(),
  visit_type: z.enum(['sqv', 'siv', 'monitoring', 'close_out']),
  visit_location: z.enum(['onsite', 'remote']),
  visit_name: z.string().optional(),
  description: z.string().optional(),
  template_id: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
}).refine((d) => !d.start_date || !d.end_date || new Date(d.end_date) >= new Date(d.start_date), {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

type FormValues = z.infer<typeof schema>;

interface CreateSiteVisitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studies: Pick<Study, 'id' | 'title' | 'protocol_number'>[];
  templates: TemplateWithQuestionCount[];
  initialTemplateId?: string | null;
  onSuccess: () => void;
}

export function CreateSiteVisitModal({
  open,
  onOpenChange,
  studies,
  templates,
  initialTemplateId,
  onSuccess,
}: CreateSiteVisitModalProps) {
  const [sites, setSites] = useState<StudySite[]>([]);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      visit_type: 'monitoring',
      visit_location: 'onsite',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
    },
  });

  const studyId = watch('study_id');
  const siteId = watch('site_id');
  const visitType = watch('visit_type');
  const templateId = watch('template_id');

  const filteredTemplates = useMemo(() => {
    const active = templates.filter((t) => t.template_status === 'active');
    return active.filter((t) => {
      if (t.visit_report_type !== visitType) return false;
      const tStudyId = (t as { study_id?: string | null }).study_id ?? null;
      if (tStudyId && studyId && tStudyId !== studyId) return false;
      return true;
    });
  }, [templates, visitType, studyId]);

  useEffect(() => {
    if (open && initialTemplateId) {
      setValue('template_id', initialTemplateId);
    }
  }, [open, initialTemplateId, setValue]);

  const loadSites = (sid: string) => {
    if (!sid) {
      setSites([]);
      return;
    }
    startTransition(async () => {
      try {
        const list = await getStudySites(sid);
        setSites(list);
      } catch {
        setSites([]);
      }
    });
  };

  const onStudyChange = (sid: string) => {
    setValue('study_id', sid);
    setValue('site_id', '');
    setValue('template_id', '');
    loadSites(sid);
  };

  const onSiteChange = (sid: string) => {
    setValue('site_id', sid);
    const site = sites.find((s) => s.id === sid);
    if (site) setValue('site_number', site.site_number);
  };

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const { visitId, error } = await createSiteVisitWithReport({
        study_id: values.study_id,
        site_id: values.site_id,
        site_number: values.site_number,
        visit_type: values.visit_type,
        visit_location: values.visit_location,
        visit_name: values.visit_name || undefined,
        description: values.description || undefined,
        template_id: values.template_id || undefined,
        start_date: values.start_date,
        end_date: values.end_date,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Site visit and report created.');
      reset();
      onOpenChange(false);
      onSuccess();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Site Visit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="study_id">Protocol Name</Label>
              <Select
                value={studyId ?? ''}
                onValueChange={onStudyChange}
              >
                <SelectTrigger id="study_id" className="text-[12px]">
                  <SelectValue
                    placeholder="Select Protocol Name..."
                    getDisplayLabel={(v) => {
                      if (!v) return null;
                      const s = studies.find((x) => x.id === v);
                      return s ? (s.protocol_number ? `${s.title} (${s.protocol_number})` : s.title) : v;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {studies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title} ({s.protocol_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.study_id && (
                <p className="text-xs text-destructive">{errors.study_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_id">Site Name</Label>
              <Select
                value={siteId ?? ''}
                onValueChange={onSiteChange}
                disabled={!studyId || sites.length === 0}
              >
                <SelectTrigger id="site_id" className="text-[12px]">
                  <SelectValue
                    placeholder="Select Site Name..."
                    getDisplayLabel={(v) => {
                      if (!v) return null;
                      const s = sites.find((x) => x.id === v);
                      return s ? s.name : v;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.site_id && (
                <p className="text-xs text-destructive">{errors.site_id.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site_number">Site Number</Label>
            <Input
              id="site_number"
              {...register('site_number')}
              className="text-[12px]"
              placeholder="Site number"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="visit_type">Visit Type</Label>
              <Select
                value={watch('visit_type')}
                onValueChange={(v) => setValue('visit_type', v as FormValues['visit_type'])}
              >
                <SelectTrigger id="visit_type" className="text-[12px]">
                  <SelectValue
                    placeholder="Visit Type"
                    getDisplayLabel={(v) =>
                      v ? (VISIT_REPORT_TYPE_LABELS[v as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? v) : null
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_REPORT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit_location">Visit Location</Label>
              <Select
                value={watch('visit_location')}
                onValueChange={(v) => setValue('visit_location', v as FormValues['visit_location'])}
              >
                <SelectTrigger id="visit_location" className="text-[12px]">
                  <SelectValue
                    placeholder="Visit Location"
                    getDisplayLabel={(v) =>
                      v ? (VISIT_LOCATION_LABELS[v as keyof typeof VISIT_LOCATION_LABELS] ?? v) : null
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_LOCATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_id">Report Template</Label>
            <Select
              value={templateId ?? ''}
              onValueChange={(v) => setValue('template_id', v)}
            >
              <SelectTrigger id="template_id" className="text-[12px]">
                <SelectValue
                  placeholder="Select Report Template (optional)..."
                  getDisplayLabel={(v) => {
                    if (!v) return null;
                    const t = templates.find((x) => x.id === v);
                    return t ? t.name : v;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {filteredTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              className="text-[12px] min-h-[80px]"
              placeholder="Provide task description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                className="text-[12px]"
              />
              {errors.start_date && (
                <p className="text-xs text-destructive">{errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
                className="text-[12px]"
              />
              {errors.end_date && (
                <p className="text-xs text-destructive">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
