'use client';

import { useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateContact } from '@/lib/actions/contacts';
import type { Contact } from '@/lib/types/contacts-organizations';

interface EditableNotesCardProps {
  contact: Contact;
  onSuccess: () => void;
}

export function EditableNotesCard({ contact, onSuccess }: EditableNotesCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(contact.notes || '');

  const handleCancel = () => {
    setNotes(contact.notes || '');
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateContact({
      id: contact.id,
      notes: notes || null,
    });
    setSaving(false);
    if (result.success) {
      toast({ title: 'Notes updated' });
      setEditing(false);
      onSuccess();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs md:text-xs font-medium">Notes</CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditing(true)} title="Edit">
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none text-xs md:text-xs"
              rows={4}
              placeholder="Additional notes about this contact..."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs h-7">
                {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving} className="text-xs h-7">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          contact.notes ? (
            <p className="text-xs md:text-xs text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
          ) : (
            <p className="text-xs text-muted-foreground">No notes</p>
          )
        )}
      </CardContent>
    </Card>
  );
}
