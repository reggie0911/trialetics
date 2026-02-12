'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { generatePaymentRecords } from '@/lib/actions/clinical-payments';
import { useToast } from '@/hooks/use-toast';

interface GeneratePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  siteId: string;
  companyId: string;
  activityIds: string[];
}

export function GeneratePaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  siteId,
  companyId,
  activityIds,
}: GeneratePaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (activityIds.length === 0) return;
    setLoading(true);
    const result = await generatePaymentRecords(companyId, siteId, activityIds);
    if (result.success) {
      toast({
        title: 'Success',
        description: `Generated ${result.data?.length ?? 0} payment record(s).`,
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast({
        title: 'Error',
        description: result.error ?? 'Failed to generate payments',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">Generate Payment Records</DialogTitle>
          <DialogDescription className="text-xs">
            Generate payment records from {activityIds.length} completed payment activit
            {activityIds.length === 1 ? 'y' : 'ies'}. Payments will be grouped by contract and payee.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || activityIds.length === 0}
            className="text-xs h-8"
          >
            {loading ? 'Generating...' : 'Generate Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
