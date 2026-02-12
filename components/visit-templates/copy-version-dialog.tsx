'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { copyTemplateVersion } from '@/lib/actions/subject-visit-templates';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  version_number: z.string().min(1, 'Version number is required'),
});

type FormData = z.infer<typeof formSchema>;

interface CopyVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId: string;
  profileId: string;
  email: string;
  templateId: string;
  templateName?: string;
  currentVersion?: string;
  navigateToNew?: boolean;
}

export default function CopyVersionDialog({
  open,
  onOpenChange,
  onSuccess,
  companyId,
  profileId,
  email,
  templateId,
  templateName,
  currentVersion,
  navigateToNew = false,
}: CopyVersionDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      version_number: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    const result = await copyTemplateVersion(
      companyId,
      profileId,
      email,
      templateId,
      data.version_number
    );

    if (result.success && result.data) {
      toast({
        title: 'Success',
        description: `Template copied to version ${data.version_number}`,
      });
      form.reset();
      onOpenChange(false);
      onSuccess();

      if (navigateToNew && result.data?.id) {
        router.push(`/protected/visit-templates/${result.data.id}`);
      }
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to copy template',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">Copy to New Version</DialogTitle>
          <DialogDescription className="text-xs">
            {templateName
              ? `Create a new version of "${templateName}"${currentVersion ? ` (current: ${currentVersion})` : ''}. `
              : ''}
            All visits and activities will be copied to the new version.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="version_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">New Version Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 2.0, 1.1"
                      className="text-xs h-8"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="text-xs h-8">
                {loading ? 'Copying...' : 'Copy Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
