'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

import { createStudy, updateStudy, getCompanyName } from '@/lib/actions/studies';
import { STUDY_PHASE_OPTIONS, STUDY_STATUS_OPTIONS } from '@/lib/types/ctms';
import type { Study } from '@/lib/types/ctms';

const studyFormSchema = z.object({
  protocol_number: z.string().min(1, 'Protocol number is required'),
  title: z.string().min(1, 'Study title is required'),
  phase: z.enum(['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Phase I/II', 'Phase II/III'], {
    required_error: 'Phase is required',
  }),
  therapeutic_area: z.string().optional(),
  indication: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'closed', 'on_hold']).optional(),
  sponsor: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
});

type StudyFormValues = z.infer<typeof studyFormSchema>;

interface StudyFormProps {
  study?: Study;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
}

export function StudyForm({ study, mode, onSuccess }: StudyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StudyFormValues>({
    resolver: zodResolver(studyFormSchema),
    defaultValues: {
      protocol_number: study?.protocol_number ?? '',
      title: study?.title ?? '',
      phase: study?.phase ?? undefined,
      therapeutic_area: study?.therapeutic_area ?? '',
      indication: study?.indication ?? '',
      status: study?.status ?? 'draft',
      sponsor: study?.sponsor ?? '',
      start_date: study?.start_date ?? '',
      end_date: study?.end_date ?? '',
      description: study?.description ?? '',
    },
  });

  useEffect(() => {
    if (mode === 'create' && !form.getValues('sponsor')) {
      getCompanyName().then((name) => {
        if (name) form.setValue('sponsor', name);
      });
    }
  }, [mode, form]);

  async function onSubmit(values: StudyFormValues) {
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const { data, error } = await createStudy(values);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Study created successfully');
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/protected/studies/${data!.id}`);
        }
      } else {
        const { error } = await updateStudy({ id: study!.id, ...values });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Study updated successfully');
        router.push(`/protected/studies/${study!.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Study Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="protocol_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Protocol Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PROTO-2026-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Study Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter study title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? null}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder="Select phase"
                          getDisplayLabel={(v) => STUDY_PHASE_OPTIONS.find((o) => o.value === v)?.label ?? null}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STUDY_PHASE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? null}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder="Select status"
                          getDisplayLabel={(v) => STUDY_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? null}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STUDY_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="therapeutic_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Therapeutic Area</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Oncology" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="indication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indication</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Non-Small Cell Lung Cancer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sponsor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sponsor</FormLabel>
                  <FormControl>
                    <Input placeholder="Sponsoring organization" disabled {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Enter study description, objectives, and key details..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Study' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
