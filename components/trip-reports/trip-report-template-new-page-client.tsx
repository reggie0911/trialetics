'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createTripReportTemplate } from '@/lib/actions/trip-report-templates';
import { SITE_VISIT_TYPE_LABELS, type SiteVisitType } from '@/lib/types/contacts-organizations';

interface TripReportTemplateNewPageClientProps {
  companyId: string;
}

export function TripReportTemplateNewPageClient({ companyId }: TripReportTemplateNewPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [visitType, setVisitType] = useState<SiteVisitType>('monitoring');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Template name is required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await createTripReportTemplate(companyId, {
      name: name.trim(),
      visit_type: visitType,
      is_active: true,
    });
    if (result.success && result.data) {
      toast({ title: 'Template created', description: 'Redirecting to add questions...' });
      router.push(`/protected/trip-reports/templates/${result.data.id}`);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium">New Trip Report Template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs">Template Name *</Label>
          <Input
            id="name"
            placeholder="e.g. Site Qualification Visit"
            className="text-[12px] h-8"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="visit_type" className="text-xs">Visit Type *</Label>
          <Select value={visitType} onValueChange={(v) => setVisitType(v as SiteVisitType)}>
            <SelectTrigger className="text-[12px] h-8">
              <SelectValue
                getDisplayLabel={(value) =>
                  value ? SITE_VISIT_TYPE_LABELS[value as SiteVisitType] ?? value : null
                }
              />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SITE_VISIT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate} disabled={isSubmitting} className="text-xs">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Template'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
