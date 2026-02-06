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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getAllContacts } from '@/lib/actions/contacts';
import { assignContactToOrganization } from '@/lib/actions/contacts';
import {
  Contact,
  ContactRole,
  CONTACT_ROLE_LABELS,
} from '@/lib/types/contacts-organizations';

interface AssignContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  organizationName: string;
  companyId: string;
  existingContactIds?: string[];
}

export function AssignContactDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  organizationName,
  companyId,
  existingContactIds = [],
}: AssignContactDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ContactRole>('other');
  const [isPrimary, setIsPrimary] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (open) {
      loadContacts();
      resetForm();
    }
  }, [open]);

  const loadContacts = async () => {
    setIsLoading(true);
    const result = await getAllContacts(companyId);
    if (result.success && result.data) {
      // Filter out contacts already assigned to this organization
      const availableContacts = result.data.filter(
        (c) => !existingContactIds.includes(c.id)
      );
      setContacts(availableContacts);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setSelectedContactId('');
    setSelectedRole('other');
    setIsPrimary(false);
    setStartDate('');
    setEndDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedContactId) {
      toast({
        title: 'Error',
        description: 'Please select a contact',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await assignContactToOrganization({
        organization_id: organizationId,
        contact_id: selectedContactId,
        role: selectedRole,
        is_primary: isPrimary,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'active',
      });

      if (result.success) {
        toast({
          title: 'Contact assigned',
          description: 'Contact has been assigned to the organization.',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to assign contact',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-base">Add Contact</DialogTitle>
          <DialogDescription className="text-xs">
            Assign a contact to {organizationName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No available contacts to assign. All contacts are already assigned to this organization.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="contact" className="text-xs">Contact *</Label>
              <Select
                value={selectedContactId}
                onValueChange={(v) => v && setSelectedContactId(v)}
              >
                <SelectTrigger className="text-xs w-full">
                  {selectedContact ? (
                    <span className="text-xs">
                      {selectedContact.first_name} {selectedContact.last_name}
                      {selectedContact.credentials && `, ${selectedContact.credentials}`}
                      {selectedContact.title && ` - ${selectedContact.title}`}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Select a contact</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id} className="text-xs">
                      {contact.first_name} {contact.last_name}
                      {contact.credentials && `, ${contact.credentials}`}
                      {contact.title && ` - ${contact.title}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="role" className="text-xs">Role *</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => v && setSelectedRole(v as ContactRole)}
              >
                <SelectTrigger className="text-xs w-full">
                  <span className="text-xs">
                    {selectedRole ? CONTACT_ROLE_LABELS[selectedRole] : 'Select role'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTACT_ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(!!checked)}
              />
              <Label htmlFor="is_primary" className="text-xs font-normal cursor-pointer">
                Primary contact for this organization
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="start_date" className="text-xs">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs md:text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end_date" className="text-xs">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs md:text-xs h-8"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedContactId} className="text-xs">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign Contact'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
