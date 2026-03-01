'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cloneTemplateToSiteBudget } from '@/lib/actions/budget-templates';
import { useToast } from '@/hooks/use-toast';

interface CloneToSiteBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  companyId: string;
  sites: { id: string; site_number: string | null; protocol_id: string }[];
  protocols: { id: string; protocol_number: string; title: string }[];
  templateProtocolId: string | null;
}

export default function CloneToSiteBudgetDialog({
  open,
  onOpenChange,
  templateId,
  companyId,
  sites,
  protocols,
  templateProtocolId,
}: CloneToSiteBudgetDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<string>(templateProtocolId || '');
  const [selectedSite, setSelectedSite] = useState<string>('');

  const filteredSites = useMemo(() => {
    if (!selectedProtocol) return sites;
    return sites.filter((s) => s.protocol_id === selectedProtocol);
  }, [sites, selectedProtocol]);

  const handleClone = async () => {
    if (!selectedSite || !selectedProtocol) {
      toast({ title: 'Error', description: 'Please select both a protocol and a site.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const result = await cloneTemplateToSiteBudget(companyId, templateId, selectedSite, selectedProtocol);

    if (result.success) {
      toast({ title: 'Success', description: 'Site budget created from template.' });
      onOpenChange(false);
      router.push(`/protected/clinical-payments/sites/${selectedSite}`);
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to clone template.', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">Clone to Site Budget</DialogTitle>
          <DialogDescription className="text-xs">
            Create a site-specific budget from this template. Select the protocol and site to apply it to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Protocol</label>
            <Select
              value={selectedProtocol}
              onValueChange={(v) => { setSelectedProtocol(v); setSelectedSite(''); }}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                {protocols.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.protocol_number} - {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Site</label>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder={filteredSites.length === 0 ? 'No sites for this protocol' : 'Select site'} />
              </SelectTrigger>
              <SelectContent>
                {filteredSites.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.site_number || s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProtocol && filteredSites.length === 0 && (
              <p className="text-[10px] text-muted-foreground">No sites found for this protocol.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClone}
              disabled={loading || !selectedSite || !selectedProtocol}
              className="text-xs h-8"
            >
              {loading ? 'Cloning...' : 'Create Site Budget'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
