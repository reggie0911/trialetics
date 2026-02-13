'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { updateCompany, uploadCompanyLogo } from '@/lib/actions/admin';
import { useToast } from '@/hooks/use-toast';

interface OnboardingStepCompanyProps {
  companyId: string;
  profileId: string;
  initialName: string;
  initialLogoUrl?: string | null;
  onSaved: () => void;
}

export function OnboardingStepCompany({
  companyId,
  profileId,
  initialName,
  initialLogoUrl,
  onSaved,
}: OnboardingStepCompanyProps) {
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialLogoUrl ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialLogoUrl) {
      setLogoUrl(initialLogoUrl);
      setPreviewUrl(initialLogoUrl);
    }
  }, [initialLogoUrl]);

  const validateFile = (file: File): string | null => {
    if (file.size > 2 * 1024 * 1024) {
      return 'File size must be less than 2MB';
    }
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return 'File must be PNG, JPG, WebP, or SVG';
    }
    return null;
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateFile(file);
    if (err) {
      toast({ title: 'Invalid file', description: err, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadCompanyLogo(companyId, formData, profileId);

      if (result.success && result.data?.logoUrl) {
        setLogoUrl(result.data.logoUrl);
        setPreviewUrl(result.data.logoUrl);
        toast({ title: 'Logo uploaded', description: 'Company logo has been saved.' });
      } else {
        toast({ title: 'Upload failed', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to upload logo', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const result = await updateCompany(companyId, { logo_url: null }, profileId);
      if (result.success) {
        setLogoUrl(null);
        setPreviewUrl(null);
        toast({ title: 'Logo removed', description: 'Company logo has been removed.' });
      } else {
        toast({ title: 'Remove failed', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove logo', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Company name required', description: 'Please enter your company name.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateCompany(
        companyId,
        { name: name.trim(), logo_url: logoUrl ?? null },
        profileId
      );

      if (result.success) {
        toast({ title: 'Saved', description: 'Company details have been updated.' });
        onSaved();
      } else {
        toast({ title: 'Save failed', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5" />
          Company Setup
        </CardTitle>
        <CardDescription>
          Add your company name and logo to personalize your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-[12px]">
            Company Name
          </Label>
          <Input
            id="companyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your company name"
            className="text-[12px]"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[12px]">Company Logo</Label>
          <div className="flex items-center gap-4">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50"
              onClick={() => !uploading && fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Company logo"
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : uploading ? (
                <span className="text-[12px] text-muted-foreground">Uploading...</span>
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleLogoSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[12px]"
              >
                {previewUrl ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {previewUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="text-[12px] text-destructive hover:text-destructive"
                >
                  <X className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            PNG, JPG, WebP or SVG. Max 2MB.
          </p>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="text-[12px]">
          {isSaving ? 'Saving...' : 'Save and Continue'}
        </Button>
      </CardContent>
    </Card>
  );
}
