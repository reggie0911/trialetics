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
import { getAllOrganizations } from '@/lib/actions/organizations';
import { assignContactToOrganization } from '@/lib/actions/contacts';
import {
  Organization,
  ContactRole,
  CONTACT_ROLE_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from '@/lib/types/contacts-organizations';

interface AssignOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  contactId: string;
  contactName: string;
  companyId: string;
  existingOrganizationIds?: string[];
}

export function AssignOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
  contactId,
  contactName,
  companyId,
  existingOrganizationIds = [],
}: AssignOrganizationDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ContactRole>('other');
  const [isPrimary, setIsPrimary] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (open) {
      loadOrganizations();
      resetForm();
    }
  }, [open]);

  const loadOrganizations = async () => {
    setIsLoading(true);
    const result = await getAllOrganizations(companyId);
    if (result.success && result.data) {
      // Filter out organizations already assigned to this contact
      const availableOrgs = result.data.filter(
        (o) => !existingOrganizationIds.includes(o.id)
      );
      setOrganizations(availableOrgs);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setSelectedOrgId('');
    setSelectedRole('other');
    setIsPrimary(false);
    setStartDate('');
    setEndDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrgId) {
      toast({
        title: 'Error',
        description: 'Please select an organization',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await assignContactToOrganization({
        organization_id: selectedOrgId,
        contact_id: contactId,
        role: selectedRole,
        is_primary: isPrimary,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'active',
      });

      if (result.success) {
        toast({
          title: 'Organization assigned',
          description: 'Contact has been assigned to the organization.',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to assign organization',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-base">Assign to Organization</DialogTitle>
          <DialogDescription className="text-xs">
            Assign {contactName} to an organization
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No available organizations. This contact is already assigned to all organizations.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="organization" className="text-xs">Organization *</Label>
              <Select
                value={selectedOrgId}
                onValueChange={(v) => v && setSelectedOrgId(v)}
              >
                <SelectTrigger className="text-xs md:text-xs w-full">
                  <span className="text-xs">
                    {selectedOrgId 
                      ? (() => {
                          const org = organizations.find(o => o.id === selectedOrgId);
                          return org ? `${org.name} (${ORGANIZATION_TYPE_LABELS[org.organization_type]})` : 'Select an organization';
                        })()
                      : 'Select an organization'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id} className="text-xs">
                      {org.name} ({ORGANIZATION_TYPE_LABELS[org.organization_type]})
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
                <SelectTrigger className="text-xs md:text-xs w-full">
                  <span className="text-xs capitalize">
                    {selectedRole ? CONTACT_ROLE_LABELS[selectedRole] || selectedRole : 'Select role'}
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
                Primary organization for this contact
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
              <Button type="submit" disabled={isSubmitting || !selectedOrgId} className="text-xs">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign to Organization'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
