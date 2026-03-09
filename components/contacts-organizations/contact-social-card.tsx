'use client';

import { useState } from 'react';
import { Pencil, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateContact } from '@/lib/actions/contacts';
import type { Contact } from '@/lib/types/contacts-organizations';

interface ContactSocialCardProps {
  contact: Contact;
  onSuccess: () => void;
}

const PLATFORMS = [
  {
    key: 'youtube_url' as keyof Contact,
    label: 'YouTube',
    placeholder: 'https://youtube.com/@username',
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    color: 'text-red-500',
  },
  {
    key: 'linkedin_url' as keyof Contact,
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/username',
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: 'text-blue-600',
  },
  {
    key: 'x_url' as keyof Contact,
    label: 'X',
    placeholder: 'https://x.com/username',
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: 'text-foreground',
  },
  {
    key: 'facebook_url' as keyof Contact,
    label: 'Facebook',
    placeholder: 'https://facebook.com/username',
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: 'text-blue-500',
  },
  {
    key: 'substack_url' as keyof Contact,
    label: 'Substack',
    placeholder: 'https://username.substack.com',
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
      </svg>
    ),
    color: 'text-orange-500',
  },
] as const;

type SocialFields = {
  youtube_url: string;
  linkedin_url: string;
  x_url: string;
  facebook_url: string;
  substack_url: string;
};

export function ContactSocialCard({ contact, onSuccess }: ContactSocialCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<SocialFields>({
    youtube_url: contact.youtube_url || '',
    linkedin_url: contact.linkedin_url || '',
    x_url: contact.x_url || '',
    facebook_url: contact.facebook_url || '',
    substack_url: contact.substack_url || '',
  });

  const handleCancel = () => {
    setFields({
      youtube_url: contact.youtube_url || '',
      linkedin_url: contact.linkedin_url || '',
      x_url: contact.x_url || '',
      facebook_url: contact.facebook_url || '',
      substack_url: contact.substack_url || '',
    });
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateContact({
      id: contact.id,
      youtube_url: fields.youtube_url || null,
      linkedin_url: fields.linkedin_url || null,
      x_url: fields.x_url || null,
      facebook_url: fields.facebook_url || null,
      substack_url: fields.substack_url || null,
    });
    setSaving(false);
    if (result.success) {
      toast({ title: 'Social media links updated' });
      setEditing(false);
      onSuccess();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const hasAnyLink = PLATFORMS.some((p) => !!contact[p.key]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs md:text-xs font-medium">Social Media</CardTitle>
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
            {PLATFORMS.map((platform) => (
              <div key={platform.key} className="space-y-1">
                <Label className="text-xs flex items-center gap-1.5">
                  <span className={platform.color}>{platform.icon}</span>
                  {platform.label}
                </Label>
                <Input
                  value={fields[platform.key as keyof SocialFields]}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [platform.key]: e.target.value }))
                  }
                  className="text-xs h-8"
                  placeholder={platform.placeholder}
                />
              </div>
            ))}
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
          <div className="space-y-2">
            {hasAnyLink ? (
              PLATFORMS.filter((p) => !!contact[p.key]).map((platform) => {
                const url = contact[platform.key] as string;
                return (
                  <div key={platform.key} className="flex items-center gap-2 text-xs md:text-xs">
                    <span className={platform.color}>{platform.icon}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate flex items-center gap-1"
                    >
                      {platform.label}
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </a>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">No social media links</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
