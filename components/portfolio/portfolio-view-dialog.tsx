'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createPortfolioView } from '@/lib/actions/portfolio';
import { useToast } from '@/hooks/use-toast';

interface PortfolioViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PortfolioViewDialog({ open, onOpenChange, onSuccess }: PortfolioViewDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [protocolIdsText, setProtocolIdsText] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    const protocol_ids = protocolIdsText
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    const result = await createPortfolioView({
      name: name.trim(),
      description: description.trim() || undefined,
      protocol_ids,
      is_default: isDefault,
    });

    setIsSubmitting(false);
    if (result.success) {
      setName('');
      setDescription('');
      setProtocolIdsText('');
      setIsDefault(false);
      onOpenChange(false);
      onSuccess();
      toast({ title: 'Portfolio view created' });
    } else {
      toast({ title: 'Failed to create view', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Portfolio View</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protocol-ids">Protocol IDs (comma-separated)</Label>
            <Textarea
              id="protocol-ids"
              value={protocolIdsText}
              onChange={(e) => setProtocolIdsText(e.target.value)}
              placeholder="Paste protocol IDs, e.g. uuid-1, uuid-2"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="is-default" checked={isDefault} onCheckedChange={(c) => setIsDefault(!!c)} />
            <Label htmlFor="is-default" className="font-normal cursor-pointer">Set as default view</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
