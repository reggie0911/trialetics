'use client';

import { useState } from 'react';
import { Pencil, Mail, Phone, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateContact } from '@/lib/actions/contacts';
import { formatPhoneNumber } from '@/lib/utils';
import type { Contact } from '@/lib/types/contacts-organizations';

interface EditableContactInfoCardProps {
  contact: Contact;
  onSuccess: () => void;
}

export function EditableContactInfoCard({ contact, onSuccess }: EditableContactInfoCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState(contact.email || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [mobilePhone, setMobilePhone] = useState(contact.mobile_phone || '');
  const [homePhone, setHomePhone] = useState(contact.home_phone || '');

  const handleCancel = () => {
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setMobilePhone(contact.mobile_phone || '');
    setHomePhone(contact.home_phone || '');
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateContact({
      id: contact.id,
      email: email || null,
      phone: phone || null,
      mobile_phone: mobilePhone || null,
      home_phone: homePhone || null,
    });
    setSaving(false);
    if (result.success) {
      toast({ title: 'Contact information updated' });
      setEditing(false);
      onSuccess();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const hasInfo = contact.email || contact.phone || contact.mobile_phone || contact.home_phone;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs md:text-xs font-medium">Contact Information</CardTitle>
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
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs h-8"
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Office Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                className="text-xs h-8"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mobile Phone</Label>
              <Input
                value={mobilePhone}
                onChange={(e) => setMobilePhone(formatPhoneNumber(e.target.value))}
                className="text-xs h-8"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Home Phone</Label>
              <Input
                value={homePhone}
                onChange={(e) => setHomePhone(formatPhoneNumber(e.target.value))}
                className="text-xs h-8"
                placeholder="+1 (555) 000-0000"
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
          <div className="space-y-3">
            {contact.email && (
              <div className="flex items-center gap-2 text-xs md:text-xs">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${contact.email}`} className="hover:underline truncate">{contact.email}</a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-xs md:text-xs">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Office:</span>
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.mobile_phone && (
              <div className="flex items-center gap-2 text-xs md:text-xs">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Mobile:</span>
                <span>{contact.mobile_phone}</span>
              </div>
            )}
            {contact.home_phone && (
              <div className="flex items-center gap-2 text-xs md:text-xs">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Home:</span>
                <span>{contact.home_phone}</span>
              </div>
            )}
            {!hasInfo && (
              <p className="text-xs text-muted-foreground">No contact information</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
