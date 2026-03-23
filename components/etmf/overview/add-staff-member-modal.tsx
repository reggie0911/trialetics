'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addEtmfStaffMember, getCompanyProfiles, getEtmfSites } from '@/lib/actions/etmf';
import { toast } from 'sonner';
import type { EtmfSiteOption } from '@/lib/types/etmf';

const ROLE_OPTIONS = [
  { value: 'project_manager', label: 'Principal Investigator' },
  { value: 'CRA', label: 'Sub-Investigator' },
  { value: 'data_manager', label: 'Research Coordinator' },
  { value: 'medical_monitor', label: 'Pharmacist' },
  { value: 'statistician', label: 'Lead Research Coordinator' },
  { value: 'regulatory', label: 'Research Director' },
  { value: 'pharmacovigilance', label: 'Laboratory Technician' },
  { value: 'custom', label: 'Regulatory Coordinator' },
];

interface AddStaffMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string | null;
  siteId: string | null;
  onSuccess: () => void;
}

export function AddStaffMemberModal({ open, onOpenChange, studyId, siteId, onSuccess }: AddStaffMemberModalProps) {
  const [sites, setSites] = useState<EtmfSiteOption[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(siteId || '');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && studyId) {
      startTransition(async () => {
        const [sitesRes, profilesRes] = await Promise.all([
          getEtmfSites(studyId),
          getCompanyProfiles(),
        ]);
        setSites(sitesRes.data || []);
        setProfiles(profilesRes.data || []);
      });
    }
  }, [open, studyId]);

  useEffect(() => {
    if (siteId) {
      setSelectedSiteId(siteId);
    }
  }, [siteId]);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const handleSubmit = () => {
    if (!studyId || !selectedSiteId || !selectedRole || !selectedProfileId) return;

    startTransition(async () => {
      const { success, placeholders_created, error } = await addEtmfStaffMember({
        study_id: studyId,
        site_id: selectedSiteId,
        profile_id: selectedProfileId,
        role: selectedRole,
      });

      if (success) {
        toast.success(`Added staff member with ${placeholders_created || 0} placeholders created`);
        handleClose();
        onSuccess();
      } else {
        toast.error(error || 'Failed to add staff member');
      }
    });
  };

  const handleClose = () => {
    setSelectedRole('');
    setSelectedProfileId('');
    setSelectedSiteId(siteId || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>
            Add a staff member to the site. Placeholder documents will be generated based on the Staff Expected Document List.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs">Site Name</Label>
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select Site...">
                  {selectedSite?.name || 'Select Site...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Staff Member Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select Role...">
                  {selectedRole 
                    ? ROLE_OPTIONS.find(r => r.value === selectedRole)?.label || 'Select Role...'
                    : 'Select Role...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Staff Member Name</Label>
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select Staff Member...">
                  {selectedProfile?.name || 'Select Staff Member...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProfile && (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <Label className="text-muted-foreground">Staff Member ID</Label>
                <div className="font-medium">{selectedProfile.id.slice(0, 12)}...</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Site Name</Label>
                <div className="font-medium">{selectedSite?.name || '-'}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSiteId || !selectedRole || !selectedProfileId || isPending}
          >
            {isPending ? 'Adding...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
