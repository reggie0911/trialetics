'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getReportTemplates, getSavedReports } from '@/lib/actions/reports';
import type { ReportTemplate, SavedReport } from '@/lib/types/reports';
import { DATA_SOURCES } from '@/lib/types/reports';
import { ReportBuilder } from './report-builder';

interface ReportsClientProps {
  companyId: string;
  profileId: string;
}

export function ReportsClient({ companyId, profileId }: ReportsClientProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ReportTemplate | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [templatesRes, reportsRes] = await Promise.all([
      getReportTemplates(companyId),
      getSavedReports(companyId),
    ]);
    if (templatesRes.success && templatesRes.data) setTemplates(templatesRes.data);
    if (reportsRes.success && reportsRes.data) setSavedReports(reportsRes.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getSourceLabel = (source: string) =>
    DATA_SOURCES.find((ds) => ds.id === source)?.label || source;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading reports...</div>;
  }

  if (showBuilder || editTemplate) {
    return (
      <ReportBuilder
        companyId={companyId}
        template={editTemplate}
        onBack={() => {
          setShowBuilder(false);
          setEditTemplate(null);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Report Templates</h2>
        <Button size="sm" onClick={() => setShowBuilder(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Report
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No report templates yet</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowBuilder(true)}>
                Create your first report
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEditTemplate(template)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Source: {getSourceLabel(template.data_source)}
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setEditTemplate(template); }}>
                    <Play className="mr-1 h-3 w-3" />
                    Run
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
