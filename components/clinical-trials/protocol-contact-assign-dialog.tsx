'use client';

import { useState, useEffect } from 'react';
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
import { getContacts } from '@/lib/actions/contacts';
import { createProtocolContact } from '@/lib/actions/protocol-contacts';
import { CONTACT_ROLE_LABELS, CONTACT_PROJECT_ROLE_LABELS } from '@/lib/types/contacts-organizations';
import type { ProtocolContactRole } from '@/lib/actions/protocol-contacts';

interface ProtocolContactAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string;
  companyId: string;
  onSuccess?: () => void;
}

const PROTOCOL_CONTACT_ROLES: ProtocolContactRole[] = [
  'principal_investigator',
  'sub_investigator',
  'coordinator',
  'sponsor_rep',
  'cro_rep',
  'medical_monitor',
  'project_manager',
  'data_manager',
  'regulatory_lead',
  'qa_lead',
  'other',
];

export function ProtocolContactAssignDialog({
  open,
  onOpenChange,
  protocolId,
  companyId,
  onSuccess,
}: ProtocolContactAssignDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string; last_name: string; email: string | null }>>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ProtocolContactRole>('other');

  useEffect(() => {
    if (open) {
      loadContacts();
      setSelectedContactId('');
      setSelectedRole('other');
    }
  }, [open, companyId]);

  const loadContacts = async () => {
    setIsLoading(true);
    const result = await getContacts(companyId, { pageSize: 200 });
    if (result.success && result.data) {
      setContacts(result.data.contacts);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) {
      toast({ title: 'Error', description: 'Please select a contact', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await createProtocolContact({
      protocol_id: protocolId,
      contact_id: selectedContactId,
      role: selectedRole,
    });
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: 'Success', description: 'Contact assigned to protocol' });
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Contact to Protocol</DialogTitle>
          <DialogDescription>
            Add a contact (sponsor rep, CRO contact, medical monitor, etc.) to this protocol.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Contact</Label>
            <Select value={selectedContactId} onValueChange={(v) => setSelectedContactId(v ?? '')} required>
              <SelectTrigger>
                <SelectValue placeholder="Select contact..." />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as ProtocolContactRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROTOCOL_CONTACT_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {(CONTACT_PROJECT_ROLE_LABELS as Record<string, string>)[role] ?? CONTACT_ROLE_LABELS[role as keyof typeof CONTACT_ROLE_LABELS] ?? role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
