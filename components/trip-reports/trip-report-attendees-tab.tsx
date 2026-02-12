'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addTripReportAttendee, removeTripReportAttendee } from '@/lib/actions/trip-reports';
import type { TripReportAttendee } from '@/lib/types/trip-reports';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface TripReportAttendeesTabProps {
  tripReportId: string;
  attendees: TripReportAttendee[];
  contacts: Contact[];
  isLocked: boolean;
  onRefresh: () => void;
}

export function TripReportAttendeesTab({
  tripReportId,
  attendees,
  contacts,
  isLocked,
  onRefresh,
}: TripReportAttendeesTabProps) {
  const { toast } = useToast();
  const [selectedContactId, setSelectedContactId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const attendeeContactIds = attendees.map((a) => a.contact_id);
  const availableContacts = contacts.filter((c) => !attendeeContactIds.includes(c.id));

  const getContactName = (contactId: string) => {
    const c = contacts.find((x) => x.id === contactId);
    return c ? `${c.first_name} ${c.last_name}`.trim() || c.email || contactId : contactId;
  };

  const handleAdd = async () => {
    if (!selectedContactId) return;
    setIsSubmitting(true);
    const result = await addTripReportAttendee(tripReportId, selectedContactId);
    if (result.success) {
      setSelectedContactId('');
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleRemove = async (contactId: string) => {
    setIsSubmitting(true);
    const result = await removeTripReportAttendee(tripReportId, contactId);
    if (result.success) {
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-medium">Attendees</CardTitle>
        {!isLocked && availableContacts.length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedContactId} onValueChange={(v) => setSelectedContactId(v ?? '')}>
              <SelectTrigger className="text-[12px] h-8 w-[200px]">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {availableContacts.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-[12px]">
                    {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!selectedContactId || isSubmitting}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {attendees.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">No attendees added</p>
        ) : (
          <div className="space-y-2">
            {attendees.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border p-3 text-[12px]"
              >
                <span className="font-medium">{getContactName(a.contact_id)}</span>
                {!isLocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => handleRemove(a.contact_id)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
