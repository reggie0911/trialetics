'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addOrganizationTeamMember } from '@/lib/actions/organization-team-members';

interface SiteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  profiles: Array<{ id: string; first_name: string | null; email: string | null }>;
  existingMemberIds: string[];
}

export function SiteTeamMemberDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  profiles,
  existingMemberIds,
}: SiteTeamMemberDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  const availableProfiles = profiles.filter((p) => !existingMemberIds.includes(p.id));

  const handleSubmit = async () => {
    if (!selectedProfileId) {
      toast({ title: 'Error', description: 'Please select a team member.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await addOrganizationTeamMember(organizationId, selectedProfileId);
      if (result.success) {
        toast({ title: 'Team member added', description: 'The team member has been assigned to this site.' });
        onSuccess();
        onOpenChange(false);
        setSelectedProfileId('');
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Site Team Member</DialogTitle>
          <DialogDescription className="text-xs">
            Assign an employee (CRA, monitor, etc.) to the site team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs">Employee</Label>
            <Select value={selectedProfileId} onValueChange={(v) => setSelectedProfileId(v ?? '')}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.length === 0 ? (
                  <SelectItem value="_none" disabled className="text-xs">
                    No available employees (all assigned)
                  </SelectItem>
                ) : (
                  availableProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.first_name || p.email || p.id}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="text-xs">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedProfileId || availableProfiles.length === 0} className="text-xs">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Member'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
