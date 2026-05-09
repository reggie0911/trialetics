'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInvoice } from '@/lib/actions/study-finance-module';

interface InvoiceIntakeUploaderProps {
  studyId: string;
  baseCurrency: string;
}

export function InvoiceIntakeUploader({ studyId, baseCurrency }: InvoiceIntakeUploaderProps) {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createInvoice({
        studyId,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        totalAmount: Number(totalAmount),
        currency: baseCurrency,
      });
      if (result.error || !result.data) {
        const message = result.error ?? 'Failed to create invoice.';
        setError(message);
        toast.error(message);
        return;
      }
      toast.success('Invoice created.');
      setInvoiceNumber('');
      setTotalAmount('0');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Upload className="h-3.5 w-3.5 text-primary" /> Invoice Intake
        </CardTitle>
        <CardDescription className="text-xs">
          Create an invoice record with the fields below. File upload, drag-and-drop, and automated extraction are not
          enabled in this release—use manual entry and attach supporting documents outside Trialetics if required.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="inv-num" className="text-xs">
              Invoice Number
            </Label>
            <Input
              id="inv-num"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="h-9"
              style={{ fontSize: 12 }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-date" className="text-xs">
              Invoice Date
            </Label>
            <Input
              id="inv-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="h-9"
              style={{ fontSize: 12 }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-amount" className="text-xs">
            Total Amount ({baseCurrency})
          </Label>
          <Input
            id="inv-amount"
            type="number"
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="h-9"
            style={{ fontSize: 12 }}
          />
        </div>
        <Button onClick={submit} disabled={isPending || invoiceNumber.trim() === ''}>
          {isPending ? 'Creating…' : 'Create invoice'}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
