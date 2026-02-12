'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getTripReportTemplates, deleteTripReportTemplate } from '@/lib/actions/trip-report-templates';
import type { TripReportTemplateWithDetails } from '@/lib/types/trip-reports';
import { SITE_VISIT_TYPE_LABELS } from '@/lib/types/contacts-organizations';
import { useToast } from '@/hooks/use-toast';

interface TripReportTemplateListProps {
  companyId: string;
  onSuccess: () => void;
}

export function TripReportTemplateList({ companyId, onSuccess }: TripReportTemplateListProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TripReportTemplateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateToDelete, setTemplateToDelete] = useState<TripReportTemplateWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const result = await getTripReportTemplates(companyId);
    if (result.success && result.data) {
      setTemplates(result.data);
    } else if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load templates',
        variant: 'destructive',
      });
    }
    setLoading(false);
  }, [companyId, toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const questionCount = (t: TripReportTemplateWithDetails) =>
    (t.details || []).filter((d) => d.activity_type === 'checklist').length;

  const handleDelete = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    const result = await deleteTripReportTemplate(templateToDelete.id);
    if (result.success) {
      setTemplateToDelete(null);
      fetchTemplates();
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete template',
        variant: 'destructive',
      });
    }
    setIsDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium">Trip Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No templates yet. Create one to get started.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-[12px]"
                >
                  <Link href={`/protected/trip-reports/templates/${t.id}`} className="flex-1 min-w-0">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-muted-foreground">
                      {SITE_VISIT_TYPE_LABELS[t.visit_type as keyof typeof SITE_VISIT_TYPE_LABELS]}
                      {t.region && ` · ${t.region}`}
                      {questionCount(t) > 0 && (
                        <span> · {questionCount(t)} questions</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/protected/trip-reports/templates/${t.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setTemplateToDelete(t)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs">Delete Template</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete &quot;{templateToDelete?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
