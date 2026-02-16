'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, FileText, Trash2, Calendar, CheckCircle2, Clock } from 'lucide-react';
import type { SDVReport } from '@/lib/actions/sdv-tracker';

interface SDVReportSelectorProps {
  reports: SDVReport[];
  selectedReportId: string | null;
  onReportSelect: (reportId: string | null) => void;
  onCreateReport: (name: string, description?: string) => Promise<SDVReport | null>;
  onDeleteReport: (reportId: string) => Promise<void>;
  isAdmin?: boolean;
}

export function SDVReportSelector({
  reports,
  selectedReportId,
  onReportSelect,
  onCreateReport,
  onDeleteReport,
  isAdmin = false,
}: SDVReportSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<SDVReport | null>(null);
  const [newReportName, setNewReportName] = useState('');
  const [newReportDescription, setNewReportDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedReport = reports.find(r => r.id === selectedReportId);

  const handleCreateReport = async () => {
    if (!newReportName.trim()) return;
    
    setIsCreating(true);
    try {
      const report = await onCreateReport(newReportName.trim(), newReportDescription.trim() || undefined);
      if (report) {
        onReportSelect(report.id);
        setIsCreateDialogOpen(false);
        setNewReportName('');
        setNewReportDescription('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (report: SDVReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportToDelete(report);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (reportToDelete) {
      await onDeleteReport(reportToDelete.id);
      if (selectedReportId === reportToDelete.id) {
        // Select another report or null
        const remainingReports = reports.filter(r => r.id !== reportToDelete.id);
        onReportSelect(remainingReports.length > 0 ? remainingReports[0].id : null);
      }
    }
    setIsDeleteDialogOpen(false);
    setReportToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'complete') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 text-[10px] gap-1">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Complete
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-yellow-100 text-yellow-700 text-[10px] gap-1">
        <Clock className="h-2.5 w-2.5" />
        Draft
      </Badge>
    );
  };

  // Generate default name for new report
  const getDefaultReportName = () => {
    const date = format(new Date(), 'MMMM yyyy');
    const existingCount = reports.filter(r => r.name.includes(date)).length;
    return existingCount > 0 ? `SDV Report - ${date} (${existingCount + 1})` : `SDV Report - ${date}`;
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Report:</span>
        </div>
        
        {reports.length === 0 ? (
          isAdmin ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setNewReportName(getDefaultReportName());
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3" />
              Create First Report
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">No reports available</span>
          )
        ) : (
          <>
            <Select
              value={selectedReportId || undefined}
              onValueChange={(value) => onReportSelect(value)}
            >
              <SelectTrigger className="w-[280px] h-9">
                <SelectValue
                  placeholder="Select a report"
                  getDisplayLabel={(value) => {
                    if (!value) return null;
                    const report = reports.find((r) => r.id === value);
                    return report?.name ?? "Select a report";
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {reports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[180px]">{report.name}</span>
                      {getStatusBadge(report.status)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 h-9"
                onClick={() => {
                  setNewReportName(getDefaultReportName());
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-3 w-3" />
                New
              </Button>
            )}
          </>
        )}
      </div>

      {/* Selected report info */}
      {selectedReport && (
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
          <Calendar className="h-3 w-3" />
          <span>
            Created {formatDistanceToNow(new Date(selectedReport.created_at), { addSuffix: true })}
          </span>
          {selectedReport.description && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="truncate max-w-[300px]">{selectedReport.description}</span>
            </>
          )}
        </div>
      )}

      {/* Create Report Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New SDV Report</DialogTitle>
            <DialogDescription>
              Create a new report to upload and analyze SDV data. Each report is an independent snapshot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
                placeholder="e.g., January 2026 SDV Report"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-description">Description (optional)</Label>
              <Textarea
                id="report-description"
                value={newReportDescription}
                onChange={(e) => setNewReportDescription(e.target.value)}
                placeholder="Add notes about this report..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReport} disabled={!newReportName.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{reportToDelete?.name}" and all associated data (uploads, records).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
