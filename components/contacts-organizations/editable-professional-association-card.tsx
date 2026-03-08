'use client';

import { useState } from 'react';
import { Pencil, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateContact } from '@/lib/actions/contacts';
import type { Contact } from '@/lib/types/contacts-organizations';

interface EditableProfessionalAssociationCardProps {
  contact: Contact;
  onSuccess: () => void;
}

export function EditableProfessionalAssociationCard({ contact, onSuccess }: EditableProfessionalAssociationCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const associations = contact.professional_associations ?? [];
  const [inputValue, setInputValue] = useState(associations.join(', '));

  const handleCancel = () => {
    setInputValue(associations.join(', '));
    setEditing(false);
  };

  const handleSave = async () => {
    const trimmed = inputValue
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    setSaving(true);
    const result = await updateContact({
      id: contact.id,
      professional_associations: trimmed,
    });
    setSaving(false);
    if (result.success) {
      toast({ title: 'Professional associations updated' });
      setEditing(false);
      onSuccess();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const hasAssociations = associations.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs md:text-xs font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Professional Association
          </CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Associations</Label>
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="text-xs min-h-[80px]"
                placeholder="AMA, SOCRA, ACRP (comma or semicolon separated)"
              />
            </div>
            <div className="flex gap-2 pt-1">
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
          <div className="space-y-2 text-xs md:text-xs">
            {hasAssociations ? (
              <div>
                <span className="text-muted-foreground">Associations: </span>
                <span className="font-medium">{associations.join(', ')}</span>
              </div>
            ) : (
              <p className="text-muted-foreground">No associations on file</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
