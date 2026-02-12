'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createSiteDocument, updateSiteDocument } from '@/lib/actions/site-documents';
import {
  SITE_DOCUMENT_TYPE_LABELS,
  SITE_DOCUMENT_STATUS_LABELS,
  type SiteDocumentType,
  type SiteDocumentStatus,
  type SiteDocument,
} from '@/lib/types/contacts-organizations';

const siteDocumentSchema = z.object({
  document_name: z.string().min(1, 'Document name is required'),
  document_type: z.enum(['protocol', 'icf', 'irb', 'regulatory', 'site_file', 'fda_form', 'other']),
  sent_date: z.string().optional(),
  expected_date: z.string().optional(),
  received_date: z.string().optional(),
  expiration_date: z.string().optional(),
  project_id: z.string().optional(),
  status: z.enum(['pending', 'sent', 'received', 'approved', 'expired', 'superseded']),
  file_url: z.string().optional(),
  notes: z.string().optional(),
});

type SiteDocumentFormValues = z.infer<typeof siteDocumentSchema>;

interface SiteDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  document?: SiteDocument | null;
  projects?: Array<{ id: string; protocol_number: string; protocol_name: string }>;
}

export function SiteDocumentDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  document,
  projects = [],
}: SiteDocumentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!document;

  const { register, handleSubmit, reset, setValue, watch } = useForm<SiteDocumentFormValues>({
    resolver: zodResolver(siteDocumentSchema),
    defaultValues: {
      document_name: '',
      document_type: 'regulatory',
      sent_date: '',
      expected_date: '',
      received_date: '',
      expiration_date: '',
      project_id: '',
      status: 'pending',
      file_url: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (document) {
        reset({
          document_name: document.document_name,
          document_type: document.document_type,
          sent_date: document.sent_date || '',
          expected_date: document.expected_date || '',
          received_date: document.received_date || '',
          expiration_date: document.expiration_date || '',
          project_id: document.project_id || '',
          status: document.status,
          file_url: document.file_url || '',
          notes: document.notes || '',
        });
      } else {
        reset({
          document_name: '',
          document_type: 'regulatory',
          sent_date: '',
          expected_date: '',
          received_date: '',
          expiration_date: '',
          project_id: '',
          status: 'pending',
          file_url: '',
          notes: '',
        });
      }
    }
  }, [open, document, reset]);

  const onSubmit = async (values: SiteDocumentFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        document_name: values.document_name,
        document_type: values.document_type as SiteDocumentType,
        sent_date: values.sent_date || null,
        expected_date: values.expected_date || null,
        received_date: values.received_date || null,
        expiration_date: values.expiration_date || null,
        project_id: values.project_id || null,
        status: values.status as SiteDocumentStatus,
        file_url: values.file_url || null,
        notes: values.notes || null,
      };

      const result = isEditing
        ? await updateSiteDocument(document.id, payload)
        : await createSiteDocument(organizationId, payload);

      if (result.success) {
        toast({
          title: isEditing ? 'Document updated' : 'Document added',
          description: `${values.document_name} has been ${isEditing ? 'updated' : 'added'} successfully.`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${isEditing ? 'update' : 'add'} document`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {isEditing ? 'Edit Document' : 'Add Document'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? 'Update document tracking details.'
              : 'Track a document at this site (sent, expected, received, expiration dates).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="document_name" className="text-xs">Document Name *</Label>
            <Input
              id="document_name"
              placeholder="e.g. IRB Approval Letter"
              className="text-xs h-8"
              {...register('document_name')}
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="document_type" className="text-xs">Document Type *</Label>
              <Select
                value={watch('document_type')}
                onValueChange={(v) => v && setValue('document_type', v as SiteDocumentType)}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SITE_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => v && setValue('status', v as SiteDocumentStatus)}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SITE_DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sent_date" className="text-xs">Sent Date</Label>
              <Input
                id="sent_date"
                type="date"
                className="text-xs h-8"
                {...register('sent_date')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="expected_date" className="text-xs">Expected Date</Label>
              <Input
                id="expected_date"
                type="date"
                className="text-xs h-8"
                {...register('expected_date')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="received_date" className="text-xs">Received Date</Label>
              <Input
                id="received_date"
                type="date"
                className="text-xs h-8"
                {...register('received_date')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="expiration_date" className="text-xs">Expiration Date</Label>
              <Input
                id="expiration_date"
                type="date"
                className="text-xs h-8"
                {...register('expiration_date')}
              />
            </div>
          </div>

          {projects.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="project_id" className="text-xs">Project</Label>
              <Select
                value={watch('project_id') || ''}
                onValueChange={(v) => setValue('project_id', v || '')}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.protocol_number} - {p.protocol_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="file_url" className="text-xs">File URL</Label>
            <Input
              id="file_url"
              type="url"
              placeholder="https://..."
              className="text-xs h-8"
              {...register('file_url')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              className="text-xs resize-none"
              rows={2}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                isEditing ? 'Update' : 'Add Document'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
