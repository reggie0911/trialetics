'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCompany, uploadCompanyLogo } from '@/lib/actions/admin';
import { createClient } from '@/lib/client';
import { useToast } from '@/hooks/use-toast';

interface CompanySettingsFormProps {
  onSuccess?: () => void;
}

export function CompanySettingsForm({ onSuccess }: CompanySettingsFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfileAndCompany();
  }, []);

  const loadProfileAndCompany = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, company_id, role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        setLoading(false);
        return;
      }

      if (!profile.company_id || profile.role !== 'admin') {
        setCanEdit(false);
        setLoading(false);
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, logo_url')
        .eq('id', profile.company_id)
        .single();

      if (companyError || !company) {
        setLoading(false);
        return;
      }

      setCompanyId(company.id);
      setProfileId(profile.id);
      setCanEdit(true);
      setName(company.name || '');
      setLogoUrl(company.logo_url ?? null);
      setPreviewUrl(company.logo_url ?? null);
    } catch (error) {
      console.error('Error loading company:', error);
    } finally {
      setLoading(false);
    }
  };

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
    if (!file || !companyId || !profileId) return;

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
    if (!companyId || !profileId) return;
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
    if (!companyId || !profileId) return;

    setIsSaving(true);
    try {
      const result = await updateCompany(
        companyId,
        { name: name.trim(), logo_url: logoUrl ?? null },
        profileId
      );

      if (result.success) {
        toast({ title: 'Saved', description: 'Company details have been updated.' });
        onSuccess?.();
      } else {
        toast({ title: 'Save failed', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading company details...
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Only company admins can update company details. Contact your administrator if you need changes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
