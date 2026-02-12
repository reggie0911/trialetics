'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { parseBulkUploadCsv, type BulkUploadQuestion } from '@/lib/utils/parse-bulk-upload-csv';

interface TripReportBulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: BulkUploadQuestion[]) => void;
}

export function TripReportBulkUploadDialog({
  open,
  onOpenChange,
  onImport,
}: TripReportBulkUploadDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({ title: 'Error', description: 'Please select a CSV file', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const text = await file.text();
      const result = parseBulkUploadCsv(text);

      if (result.success) {
        if (result.data.length === 0) {
          toast({ title: 'No data', description: 'No valid questions found in the CSV', variant: 'destructive' });
        } else {
          onImport(result.data);
          toast({ title: 'Import complete', description: `Added ${result.data.length} question(s)` });
          onOpenChange(false);
        }
      } else {
        toast({ title: 'Import failed', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to read file', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[12px]">Bulk Upload</DialogTitle>
          <DialogDescription className="text-[12px]">
            Upload a CSV file with columns: Question, Report Sub Section, Report Order (optional).
            Header row is required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleBrowseClick}
            disabled={isProcessing}
            className="w-full text-[12px]"
          >
            {isProcessing ? 'Processing...' : 'Select CSV file'}
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-[12px]">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
