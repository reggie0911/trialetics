'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createSubject, updateSubject } from '@/lib/actions/subjects';
import type { SubjectWithRelations, SubjectStatus } from '@/lib/types/clinical-trials';
import { SUBJECT_STATUS_LABELS } from '@/lib/types/clinical-trials';

const subjectSchema = z.object({
  site_id: z.string().min(1, 'Site is required'),
  screening_number: z.string().optional(),
  subject_number: z.string().optional(),
  status: z.string(),
  enrollment_date: z.string().optional(),
  screening_date: z.string().optional(),
  completion_date: z.string().optional(),
  termination_date: z.string().optional(),
  termination_reason: z.string().optional(),
  screen_failure_reason: z.string().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

interface SubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  email: string;
  subject?: SubjectWithRelations | null;
  sites: Array<{ id: string; site_number: string | null; organization?: { name: string } | null }>;
  onSuccess: () => void;
}

export function SubjectDialog({
  open,
  onOpenChange,
  companyId,
  profileId,
  email,
  subject,
  sites,
  onSuccess,
}: SubjectDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      site_id: '',
      screening_number: '',
      subject_number: '',
      status: 'screening',
      enrollment_date: '',
      screening_date: new Date().toISOString().split('T')[0],
      completion_date: '',
      termination_date: '',
      termination_reason: '',
      screen_failure_reason: '',
    },
  });

  const watchStatus = form.watch('status');

  useEffect(() => {
    if (subject) {
      form.reset({
        site_id: subject.site_id,
        screening_number: subject.screening_number || '',
        subject_number: subject.subject_number || '',
        status: subject.status,
        enrollment_date: subject.enrollment_date || '',
        screening_date: subject.screening_date || '',
        completion_date: subject.completion_date || '',
        termination_date: subject.termination_date || '',
        termination_reason: subject.termination_reason || '',
        screen_failure_reason: subject.screen_failure_reason || '',
      });
    } else {
      form.reset({
        site_id: '',
        screening_number: '',
        subject_number: '',
        status: 'screening',
        enrollment_date: '',
        screening_date: new Date().toISOString().split('T')[0],
        completion_date: '',
        termination_date: '',
        termination_reason: '',
        screen_failure_reason: '',
      });
    }
  }, [subject]);

  const onSubmit = async (data: SubjectFormData) => {
    setIsSubmitting(true);

    try {
      let result;

      if (subject) {
        result = await updateSubject(companyId, {
          id: subject.id,
          ...data,
          screening_number: data.screening_number || null,
          subject_number: data.subject_number || null,
          enrollment_date: data.enrollment_date || null,
          screening_date: data.screening_date || null,
          completion_date: data.completion_date || null,
          termination_date: data.termination_date || null,
          termination_reason: data.termination_reason || null,
          screen_failure_reason: data.screen_failure_reason || null,
          status: data.status as SubjectStatus,
        });
      } else {
        result = await createSubject(companyId, profileId, email, {
          ...data,
          screening_number: data.screening_number || null,
          subject_number: data.subject_number || null,
          enrollment_date: data.enrollment_date || null,
          screening_date: data.screening_date || null,
          completion_date: data.completion_date || null,
          termination_date: data.termination_date || null,
          termination_reason: data.termination_reason || null,
          screen_failure_reason: data.screen_failure_reason || null,
          status: data.status as SubjectStatus,
        });
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: subject ? 'Subject updated successfully' : 'Subject created successfully',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save subject',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSiteName = (site: typeof sites[0]) => {
    const parts = [];
    if (site.site_number) parts.push(site.site_number);
    if (site.organization?.name) parts.push(site.organization.name);
    return parts.length > 0 ? parts.join(' - ') : site.id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {subject ? 'Edit Subject' : 'Add Subject'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {subject ? 'Update subject information' : 'Screen or enroll a new subject'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Site <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!!subject}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue 
                            placeholder="Select site"
                            getDisplayLabel={(value) => {
                              if (!value) return null;
                              const site = sites.find(s => s.id === value);
                              return site ? getSiteName(site) : null;
                            }}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites && sites.length > 0 ? (
                          sites.map((site) => (
                            <SelectItem key={site.id} value={site.id} className="text-xs">
                              {getSiteName(site)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-sites" disabled className="text-xs">
                            No sites available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Status <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue 
                            placeholder="Select status"
                            getDisplayLabel={(value) => value ? SUBJECT_STATUS_LABELS[value as keyof typeof SUBJECT_STATUS_LABELS] : null}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SUBJECT_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="screening_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Screening Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SCR-001"
                        className="h-8 text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Subject Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SUB-001"
                        className="h-8 text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="screening_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Screening Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {(watchStatus === 'enrolled' || watchStatus === 'completed') && (
                <FormField
                  control={form.control}
                  name="enrollment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Enrollment Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

              {watchStatus === 'completed' && (
                <FormField
                  control={form.control}
                  name="completion_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Completion Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

              {watchStatus === 'terminated' && (
                <FormField
                  control={form.control}
                  name="termination_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Termination Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {watchStatus === 'terminated' && (
              <FormField
                control={form.control}
                name="termination_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Termination Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Reason for early termination..."
                        className="min-h-[60px] text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            {watchStatus === 'screen_failure' && (
              <FormField
                control={form.control}
                name="screen_failure_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Screen Failure Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Reason for screen failure..."
                        className="min-h-[60px] text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-8 text-xs">
                {isSubmitting ? 'Saving...' : subject ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
