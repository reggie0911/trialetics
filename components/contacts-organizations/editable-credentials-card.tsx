'use client';

import { useState } from 'react';
import { Pencil, Award, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateContact } from '@/lib/actions/contacts';
import type { Contact } from '@/lib/types/contacts-organizations';

interface EditableCredentialsCardProps {
  contact: Contact;
  onSuccess: () => void;
}

export function EditableCredentialsCard({ contact, onSuccess }: EditableCredentialsCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState(contact.credentials || '');
  const [licenseNumber, setLicenseNumber] = useState(contact.license_number || '');

  const handleCancel = () => {
    setCredentials(contact.credentials || '');
    setLicenseNumber(contact.license_number || '');
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateContact({
      id: contact.id,
      credentials: credentials || null,
      license_number: licenseNumber || null,
    });
    setSaving(false);
    if (result.success) {
      toast({ title: 'Credentials updated' });
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
          <CardTitle className="text-xs md:text-xs font-medium flex items-center gap-2">
            <Award className="h-4 w-4" />
            Credentials
          </CardTitle>
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
            <div className="space-y-1">
              <Label className="text-xs">Credentials</Label>
              <Input
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                className="text-xs h-8"
                placeholder="MD, PhD"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">License Number</Label>
              <Input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="text-xs h-8"
                placeholder="Medical license #"
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
            {contact.credentials && (
              <div>
                <span className="text-muted-foreground">Credentials: </span>
                <span className="font-medium">{contact.credentials}</span>
              </div>
            )}
            {contact.license_number && (
              <div>
                <span className="text-muted-foreground">License Number: </span>
                <span className="font-medium">{contact.license_number}</span>
              </div>
            )}
            {!contact.credentials && !contact.license_number && (
              <p className="text-muted-foreground">No credentials on file</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
