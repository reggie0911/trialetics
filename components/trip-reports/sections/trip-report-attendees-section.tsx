'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripReportSectionCard } from './trip-report-section-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  addTripReportAttendee,
  removeTripReportAttendee,
  updateTripReport,
} from '@/lib/actions/trip-reports';
import { useToast } from '@/hooks/use-toast';
import type {
  TripReportAttendeeWithContact,
  AttendeeType,
} from '@/lib/types/trip-reports';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface TripReportAttendeesSectionProps {
  tripReportId: string;
  attendees: TripReportAttendeeWithContact[];
  contacts: Contact[];
  reviewerComments: string | null;
  reviewerCommentsKey: 'site_attendees_reviewer_comments' | 'sponsor_attendees_reviewer_comments';
  attendeeType: AttendeeType;
  sectionTitle: string;
  isLocked: boolean;
  onRefresh: () => void;
}

const ROLE_OPTIONS = [
  'Principal Investigator',
  'Co-Principal Investigator',
  'Sub-Investigator',
  'Study Coordinator',
  'Clinical Research Associate',
  'Regulatory Coordinator',
  'Other',
];

export function TripReportAttendeesSection({
  tripReportId,
  attendees,
  contacts,
  reviewerComments,
  reviewerCommentsKey,
  attendeeType,
  sectionTitle,
  isLocked,
  onRefresh,
}: TripReportAttendeesSectionProps) {
  const { toast } = useToast();
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [comments, setComments] = useState(reviewerComments ?? '');
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
    const result = await addTripReportAttendee(tripReportId, selectedContactId, {
      attendee_type: attendeeType,
      role: selectedRole || null,
    });
    if (result.success) {
      setSelectedContactId('');
      setSelectedRole('');
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleRemove = async (contactId: string) => {
    setIsSubmitting(true);
    const result = await removeTripReportAttendee(tripReportId, contactId, attendeeType);
    if (result.success) onRefresh();
    else toast({ title: 'Error', description: result.error, variant: 'destructive' });
    setIsSubmitting(false);
  };

  const handleCommentsBlur = async () => {
    if (isLocked || comments === (reviewerComments ?? '')) return;
    setIsSubmitting(true);
    const result = await updateTripReport(tripReportId, { [reviewerCommentsKey]: comments || null });
    if (result.success) onRefresh();
    else toast({ title: 'Error', description: result.error, variant: 'destructive' });
    setIsSubmitting(false);
  };

  return (
    <TripReportSectionCard title={sectionTitle} count={attendees.length}>
      <div className="space-y-4">
        {!isLocked && availableContacts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Select value={selectedContactId} onValueChange={(v) => setSelectedContactId(v ?? '')}>
              <SelectTrigger className="text-sm h-9 w-[200px]">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {availableContacts.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-sm">
                    {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v ?? '')}>
              <SelectTrigger className="text-sm h-9 w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-sm">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} disabled={!selectedContactId || isSubmitting} className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        )}
        {attendees.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No attendees added</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium w-10">#</th>
                  <th className="text-left py-2 px-3 font-medium">Name</th>
                  <th className="text-left py-2 px-3 font-medium">Role</th>
                  {!isLocked && <th className="w-12" />}
                </tr>
              </thead>
              <tbody>
                {attendees.map((a, idx) => (
                  <tr key={a.id} className={`border-b ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}>
                    <td className="py-2 px-3">{idx + 1}</td>
                    <td className="py-2 px-3">{getContactName(a.contact_id)}</td>
                    <td className="py-2 px-3">{a.role ?? '—'}</td>
                    {!isLocked && (
                      <td className="py-2 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleRemove(a.contact_id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Reviewer Comments:</label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            onBlur={handleCommentsBlur}
            disabled={isLocked || isSubmitting}
            placeholder="Reviewer comments..."
            className="min-h-[60px] text-sm resize-none"
          />
        </div>
      </div>
    </TripReportSectionCard>
  );
}
