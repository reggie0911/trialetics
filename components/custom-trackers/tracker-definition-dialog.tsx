'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createTrackerDefinition } from '@/lib/actions/custom-trackers';

interface TrackerDefinitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function TrackerDefinitionDialog({
  open,
  onOpenChange,
  onSuccess,
}: TrackerDefinitionDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [entityType, setEntityType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setDescription('');
      setIcon('');
      setEntityType('');
    }
  }, [open]);

  useEffect(() => {
    setSlug(slugFromName(name));
  }, [name]);

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    setIsSubmitting(true);
    const result = await createTrackerDefinition({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
      entity_type: entityType.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      onOpenChange(false);
      onSuccess();
      toast({ title: 'Tracker created' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Tracker</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              className="mt-1 text-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tracker name"
            />
          </div>
          <div>
            <Label className="text-xs">Slug</Label>
            <Input
              className="mt-1 text-xs"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="tracker-slug"
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              className="mt-1 text-xs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs">Icon</Label>
            <Input
              className="mt-1 text-xs"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Optional icon"
            />
          </div>
          <div>
            <Label className="text-xs">Entity Type</Label>
            <Input
              className="mt-1 text-xs"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="e.g. site, protocol"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim() || !slug.trim()}>
            {isSubmitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
