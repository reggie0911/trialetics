'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getClinicalProtocols } from '@/lib/actions/clinical-protocols';
import { createProtocolContact, updateProtocolContact } from '@/lib/actions/protocol-contacts';

export type EditingProjectAssignment = {
  id: string;
  protocol?: { id: string; protocol_number: string | null; title: string | null };
  role: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
};

interface AssignProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  contactId: string;
  companyId: string;
  existingProjectIds?: string[];
  editingProject?: EditingProjectAssignment | null;
  onReactivate?: (params: { relationshipId: string; name: string }) => void;
}

export function AssignProjectDialog({
  open,
  onOpenChange,
  onSuccess,
  contactId,
  companyId,
  existingProjectIds = [],
  editingProject = null,
  onReactivate,
}: AssignProjectDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [protocols, setProtocols] = useState<Array<{ id: string; protocol_number: string | null; title: string | null }>>([]);

  const [selectedProtocolId, setSelectedProtocolId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isEditMode = !!editingProject;

  useEffect(() => {
    if (open) {
      if (editingProject) {
        setStartDate(editingProject.start_date || '');
        setEndDate(editingProject.end_date || '');
      } else {
        loadProtocols();
        resetForm();
      }
    }
  }, [open, editingProject]);

  const loadProtocols = async () => {
    setIsLoading(true);
    const result = await getClinicalProtocols(companyId, { pageSize: 100 });
    if (result.success && result.data) {
      const available = result.data.protocols.filter(
        (p) => !existingProjectIds.includes(p.id)
      );
      setProtocols(available);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setSelectedProtocolId('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && editingProject) {
      setIsSubmitting(true);
      try {
        const result = await updateProtocolContact(editingProject.id, {
          start_date: startDate || null,
          end_date: endDate || null,
        });
        if (result.success) {
          toast({ title: 'Project assignment updated' });
          onSuccess();
          onOpenChange(false);
        } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!selectedProtocolId) {
      toast({ title: 'Error', description: 'Please select a project', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createProtocolContact({
        protocol_id: selectedProtocolId,
        contact_id: contactId,
        role: 'other',
        status: 'active',
        start_date: startDate || null,
        end_date: endDate || null,
      });
      if (result.success) {
        toast({ title: 'Project assigned', description: 'Contact has been assigned to the project.' });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const protocolDisplayName = (p: { protocol_number: string | null; title: string | null }) =>
    [p.protocol_number, p.title].filter(Boolean).join(' – ') || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEditMode ? 'Edit Project Assignment' : 'Assign to Project'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditMode
              ? `Update assignment for ${editingProject?.protocol ? protocolDisplayName(editingProject.protocol) : 'this project'}`
              : 'Assign this contact to a clinical trial project'}
          </DialogDescription>
        </DialogHeader>

        {isEditMode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Project</Label>
              <div className="flex h-8 items-center rounded-md border border-input bg-muted/50 px-3 text-xs text-muted-foreground">
                {editingProject?.protocol ? protocolDisplayName(editingProject.protocol) : 'Unknown'}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="start_date" className="text-xs">Start Date</Label>
                <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs h-8" disabled />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end_date" className="text-xs">End Date</Label>
                <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs h-8" disabled />
              </div>
            </div>
            <DialogFooter>
              {editingProject?.status === 'inactive' && onReactivate && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                  onClick={() => {
                    onReactivate({
                      relationshipId: editingProject.id,
                      name: editingProject.protocol ? protocolDisplayName(editingProject.protocol) : 'Unknown',
                    });
                    onOpenChange(false);
                  }}
                  disabled={isSubmitting}
                >
                  Reactivate
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : protocols.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {existingProjectIds.length > 0
              ? 'No available projects. This contact is already assigned to all projects.'
              : 'No projects found. Create a clinical trial project first.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="protocol" className="text-xs">Project *</Label>
              <Select value={selectedProtocolId} onValueChange={(v) => v && setSelectedProtocolId(v)}>
                <SelectTrigger className="text-xs w-full h-8">
                  <span className="text-xs">
                    {selectedProtocolId
                      ? protocolDisplayName(protocols.find((p) => p.id === selectedProtocolId) ?? { protocol_number: null, title: null })
                      : 'Select a project'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {protocolDisplayName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="start_date" className="text-xs">Start Date</Label>
                <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs h-8" disabled />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end_date" className="text-xs">End Date</Label>
                <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs h-8" disabled />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedProtocolId} className="text-xs">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</> : 'Assign to Project'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
