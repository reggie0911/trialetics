'use client';

import { useRef, useState, useEffect } from 'react';
import { User, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/client';

/** Uses the same public bucket as profile avatars (always provisioned). Path prefix isolates directory contacts. */
const BUCKET = 'avatars';

function validateImageFile(file: File): string | null {
  if (file.size > 2 * 1024 * 1024) return 'File size must be less than 2MB';
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) return 'Use JPEG, PNG, or WebP';
  return null;
}

export interface DirectoryContactPhotoFieldProps {
  companyId: string;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  disabled?: boolean;
  /** Tighter layout for dialogs */
  compact?: boolean;
}

export function DirectoryContactPhotoField({
  companyId,
  imageUrl,
  onImageUrlChange,
  disabled = false,
  compact = false,
}: DirectoryContactPhotoFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(imageUrl || null);
  }, [imageUrl]);

  const upload = async (file: File) => {
    const err = validateImageFile(file);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    setUploading(true);
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const path = `directory-contacts/${companyId}/${fileName}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      URL.revokeObjectURL(blobUrl);
      setPreviewUrl(urlData.publicUrl);
      onImageUrlChange(urlData.publicUrl);
    } catch (e) {
      console.error(e);
      URL.revokeObjectURL(blobUrl);
      setPreviewUrl(imageUrl || null);
      setLocalError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageUrlChange('');
    setLocalError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayUrl = previewUrl || imageUrl || null;
  const sizeClass = compact ? 'h-14 w-14' : 'h-20 w-20';
  const iconClass = compact ? 'h-6 w-6' : 'h-8 w-8';

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Profile photo</Label>
      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 p-2.5">
        <Avatar className={`${sizeClass} shrink-0 rounded-lg after:rounded-lg`}>
          <AvatarImage src={displayUrl || undefined} alt="" className="rounded-lg" />
          <AvatarFallback
            className={`rounded-lg ${compact ? 'text-sm' : 'text-xl'}`}
          >
            <User className={iconClass} />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={disabled || uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Uploading…' : displayUrl ? 'Change photo' : 'Upload photo'}
            </Button>
            {displayUrl && !uploading && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2"
                onClick={handleRemove}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Remove photo</span>
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            JPEG, PNG or WebP, max 2MB. Optional — directory display only (not the app login avatar).
          </p>
          {localError && <p className="text-[11px] text-destructive">{localError}</p>}
        </div>
      </div>
    </div>
  );
}
