'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, Plus } from 'lucide-react';
import {
  getProtocolStatusReports,
  createProtocolStatusReport,
  updateProtocolStatusReport,
  type ProtocolStatusReport,
} from '@/lib/actions/protocol-status-reports';
import { useToast } from '@/hooks/use-toast';

interface ProtocolStatusReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string;
  protocolNumber: string;
  protocolTitle: string;
  companyId: string;
  onSuccess?: () => void;
}

export function ProtocolStatusReportSheet({
  open,
  onOpenChange,
  protocolId,
  protocolNumber,
  protocolTitle,
  companyId,
  onSuccess,
}: ProtocolStatusReportSheetProps) {
  const { toast } = useToast();
  const [reports, setReports] = useState<ProtocolStatusReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    progress_summary: '',
    forecast: '',
    issues: '',
    risks: '',
    next_steps: '',
  });

  const loadReports = async () => {
    if (!protocolId) return;
    setIsLoading(true);
    const data = await getProtocolStatusReports(protocolId);
    setReports(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (open && protocolId) loadReports();
  }, [open, protocolId]);

  const handleCreate = async () => {
    const result = await createProtocolStatusReport(companyId, protocolId, formData);
    if (result.success) {
      toast({ title: 'Success', description: 'Status report created' });
      setShowCreate(false);
      setFormData({ progress_summary: '', forecast: '', issues: '', risks: '', next_steps: '' });
      loadReports();
      onSuccess?.();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Status Reports: {protocolNumber} - {protocolTitle}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Reports</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(!showCreate)}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              New Report
            </Button>
          </div>

          {showCreate && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div>
                <Label className="text-xs">Progress Summary</Label>
                <Textarea
                  value={formData.progress_summary}
                  onChange={(e) => setFormData((d) => ({ ...d, progress_summary: e.target.value }))}
                  placeholder="Summary of progress..."
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Forecast</Label>
                <Textarea
                  value={formData.forecast}
                  onChange={(e) => setFormData((d) => ({ ...d, forecast: e.target.value }))}
                  placeholder="Forecast..."
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Issues</Label>
                <Textarea
                  value={formData.issues}
                  onChange={(e) => setFormData((d) => ({ ...d, issues: e.target.value }))}
                  placeholder="Current issues..."
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Risks</Label>
                <Textarea
                  value={formData.risks}
                  onChange={(e) => setFormData((d) => ({ ...d, risks: e.target.value }))}
                  placeholder="Identified risks..."
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Next Steps</Label>
                <Textarea
                  value={formData.next_steps}
                  onChange={(e) => setFormData((d) => ({ ...d, next_steps: e.target.value }))}
                  placeholder="Next steps..."
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate}>
                  Save Report
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No status reports yet</p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 text-sm">
                  <div className="font-medium text-xs text-muted-foreground mb-2">
                    {r.report_date}
                  </div>
                  {r.progress_summary && (
                    <p className="mb-2"><span className="font-medium">Progress:</span> {r.progress_summary}</p>
                  )}
                  {r.forecast && (
                    <p className="mb-2"><span className="font-medium">Forecast:</span> {r.forecast}</p>
                  )}
                  {r.issues && (
                    <p className="mb-2"><span className="font-medium">Issues:</span> {r.issues}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
