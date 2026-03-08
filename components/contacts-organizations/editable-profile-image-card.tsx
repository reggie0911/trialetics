'use client';

import { useState } from 'react';
import { Pencil, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { updateContact } from '@/lib/actions/contacts';
import { ContactImageUpload } from './contact-image-upload';
import type { Contact } from '@/lib/types/contacts-organizations';

interface EditableProfileImageCardProps {
  contact: Contact;
  onSuccess: () => void;
}

export function EditableProfileImageCard({ contact, onSuccess }: EditableProfileImageCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const handleUploadComplete = async (url: string) => {
    const result = await updateContact({
      id: contact.id,
      profile_image_url: url || null,
    });
    if (result.success) {
      toast({ title: 'Profile image updated' });
      onSuccess();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleUploadError = (error: string) => {
    toast({ title: 'Upload failed', description: error, variant: 'destructive' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs md:text-xs font-medium">Profile Image</CardTitle>
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
            <ContactImageUpload
              currentImageUrl={contact.profile_image_url}
              contactId={contact.id}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="text-xs h-7">
              Done
            </Button>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <Avatar className="h-20 w-20 rounded-lg after:rounded-lg">
              <AvatarImage src={contact.profile_image_url || undefined} alt="Profile" className="rounded-lg" />
              <AvatarFallback className="text-muted-foreground rounded-lg">
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
