'use client';

import { useState } from 'react';
import { Loader2, Archive } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { archiveOrganizationContact } from '@/lib/actions/contacts';
import { formatFieldName } from '@/lib/utils';
import { CONTACT_ROLE_LABELS } from '@/lib/types/contacts-organizations';
import type { OrganizationContactWithContact } from '@/lib/types/contacts-organizations';

interface ArchiveContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationContact: OrganizationContactWithContact | null;
  organizationName: string;
}

export function ArchiveContactDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationContact,
  organizationName,
}: ArchiveContactDialogProps) {
  const { toast } = useToast();
  const [archiveDate, setArchiveDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactName = organizationContact?.contact
    ? `${organizationContact.contact.first_name} ${organizationContact.contact.last_name}`
    : 'Unknown';
  const roleLabel = organizationContact
    ? CONTACT_ROLE_LABELS[organizationContact.role] || formatFieldName(organizationContact.role)
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationContact || !archiveDate) return;

    const date = new Date(archiveDate);
    if (date > new Date()) {
      toast({
        title: 'Invalid date',
        description: 'Archive date cannot be in the future.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await archiveOrganizationContact(organizationContact.id, archiveDate);

      if (result.success) {
        toast({
          title: 'Contact archived',
          description: `${contactName} has been moved to contact history.`,
        });
        setArchiveDate('');
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to archive contact',
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

  const handleOpenChange = (next: boolean) => {
    if (!next) setArchiveDate('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archive Contact
          </DialogTitle>
          <DialogDescription className="text-xs">
            {organizationContact ? (
              <>
                Archive <strong>{contactName}</strong> ({roleLabel}) from {organizationName}. The contact
                will be moved to history and no longer appear in Active Staff.
              </>
            ) : (
              'Select a contact to archive.'
            )}
          </DialogDescription>
        </DialogHeader>

        {organizationContact && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="archive_date" className="text-xs">
                Archive date (inactive date) *
              </Label>
              <Input
                id="archive_date"
                type="date"
                value={archiveDate}
                onChange={(e) => setArchiveDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="text-xs h-8"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                You can select a past date, but not a future date.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!archiveDate || isSubmitting}
                className="text-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
