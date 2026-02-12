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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createProtocolVersion, updateProtocolVersion } from '@/lib/actions/protocol-versions';
import type { ProtocolVersionWithRelations } from '@/lib/types/clinical-trials';

const protocolVersionSchema = z.object({
  version_number: z.string().min(1, 'Version number is required'),
  is_original: z.boolean(),
  amendment_version: z.string().optional(),
  approval_date: z.string().optional(),
  description: z.string().optional(),
});

type ProtocolVersionFormData = z.infer<typeof protocolVersionSchema>;

interface ProtocolVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  email: string;
  protocolId: string;
  protocolName?: string;
  version?: ProtocolVersionWithRelations | null;
  onSuccess: () => void;
}

export function ProtocolVersionDialog({
  open,
  onOpenChange,
  companyId,
  profileId,
  email,
  protocolId,
  protocolName,
  version,
  onSuccess,
}: ProtocolVersionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProtocolVersionFormData>({
    resolver: zodResolver(protocolVersionSchema),
    defaultValues: {
      version_number: '',
      is_original: false,
      amendment_version: '',
      approval_date: '',
      description: '',
    },
  });

  useEffect(() => {
    if (version) {
      form.reset({
        version_number: version.version_number,
        is_original: version.is_original,
        amendment_version: version.amendment_version || '',
        approval_date: version.approval_date || '',
        description: version.description || '',
      });
    } else {
      form.reset({
        version_number: '',
        is_original: false,
        amendment_version: '',
        approval_date: '',
        description: '',
      });
    }
  }, [version]);

  const onSubmit = async (data: ProtocolVersionFormData) => {
    setIsSubmitting(true);

    try {
      let result;

      if (version) {
        // Update existing version
        result = await updateProtocolVersion(companyId, {
          id: version.id,
          version_number: data.version_number,
          is_original: data.is_original,
          amendment_version: data.amendment_version || null,
          approval_date: data.approval_date || null,
          description: data.description || null,
        });
      } else {
        // Create new version
        result = await createProtocolVersion(companyId, profileId, email, {
          protocol_id: protocolId,
          version_number: data.version_number,
          is_original: data.is_original,
          amendment_version: data.amendment_version || null,
          approval_date: data.approval_date || null,
          description: data.description || null,
        });
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: version ? 'Protocol version updated successfully' : 'Protocol version created successfully',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save protocol version',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving protocol version:', error);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {version ? 'Edit Protocol Version' : 'Create Protocol Version'}
          </DialogTitle>
          {protocolName && (
            <DialogDescription className="text-xs">
              Protocol: {protocolName}
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="version_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Version Number <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 1.0, 2.0, 3.1"
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
                name="amendment_version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Amendment Version</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., A, B, C"
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
                name="approval_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">IRB Approval Date</FormLabel>
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

              <FormField
                control={form.control}
                name="is_original"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-6">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal">
                      Original Protocol
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the changes in this version..."
                      className="min-h-[80px] text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

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
                {isSubmitting ? 'Saving...' : version ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
