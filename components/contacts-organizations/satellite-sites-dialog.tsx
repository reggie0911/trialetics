'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateOrganization, getSiteOrganizationsForCompany } from '@/lib/actions/organizations';

type Mode = 'set_parent' | 'add_satellite';

interface SatelliteSitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode: Mode;
  organizationId: string;
  organizationName: string;
  companyId: string;
  currentParentId?: string | null;
  satelliteIds?: string[];
}

export function SatelliteSitesDialog({
  open,
  onOpenChange,
  onSuccess,
  mode,
  organizationId,
  organizationName,
  companyId,
  currentParentId,
  satelliteIds = [],
}: SatelliteSitesDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (open && companyId) {
      getSiteOrganizationsForCompany(companyId).then((r) => {
        if (r.success && r.data) {
          const filtered = r.data.filter(
            (s) => s.id !== organizationId && !satelliteIds.includes(s.id)
          );
          setSites(filtered);
        }
      });
    }
  }, [open, companyId, organizationId, satelliteIds]);

  useEffect(() => {
    if (open) {
      setSelectedId(mode === 'set_parent' ? (currentParentId || '') : '');
    }
  }, [open, mode, currentParentId]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === 'set_parent') {
        const result = await updateOrganization({ id: organizationId, parent_organization_id: selectedId || null });
        if (result.success) {
          toast({ title: 'Parent site updated', description: 'The parent site has been set.' });
          onSuccess();
          onOpenChange(false);
        } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
      } else {
        if (!selectedId) {
          toast({ title: 'Error', description: 'Please select a site.', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        const result = await updateOrganization({ id: selectedId, parent_organization_id: organizationId });
        if (result.success) {
          toast({ title: 'Satellite added', description: 'The site has been linked as a satellite.' });
          onSuccess();
          onOpenChange(false);
        } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === 'set_parent' ? 'Set Parent Site' : 'Add Satellite Site';
  const description =
    mode === 'set_parent'
      ? `Set the parent site for ${organizationName}. A site can have only one parent.`
      : `Link another site as a satellite of ${organizationName}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs">{mode === 'set_parent' ? 'Parent site' : 'Site to link'}</Label>
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? '')}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder={mode === 'set_parent' ? 'None (no parent)' : 'Select site'} />
              </SelectTrigger>
              <SelectContent>
                {mode === 'set_parent' && (
                  <SelectItem value="" className="text-xs">None (no parent)</SelectItem>
                )}
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="text-xs">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="text-xs">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : mode === 'set_parent' ? 'Set Parent' : 'Add Satellite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
