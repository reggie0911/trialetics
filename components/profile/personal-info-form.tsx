'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from './avatar-upload';
import { formatPhoneNumber, capitalizeFirstLetter } from '@/lib/utils';
import type { TeamMemberRole } from '@/lib/types/ctms';
import { TEAM_ROLE_LABEL } from '@/lib/types/ctms';

interface PersonalInfoFormProps {
  onSuccess: () => void;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  avatarUrl: string;
}

interface FormErrors {
  [key: string]: string;
}

interface StudyAssignmentDisplay {
  id: string;
  studyTitle: string;
  protocolNumber: string | null;
  roleLabel: string;
  siteLabel: string | null;
}

function studyRoleLabel(role: string, customRoleName: string | null | undefined): string {
  if (role === 'custom' && customRoleName?.trim()) {
    return customRoleName.trim();
  }
  if (Object.prototype.hasOwnProperty.call(TEAM_ROLE_LABEL, role)) {
    return TEAM_ROLE_LABEL[role as TeamMemberRole];
  }
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Supabase may return embedded FK rows as an object or a single-element array. */
function embedOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}


export function PersonalInfoForm({ onSuccess }: PersonalInfoFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadError, setUploadError] = useState<string>('');
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    jobTitle: '',
    phone: '',
    avatarUrl: '',
  });
  const [studyAssignments, setStudyAssignments] = useState<StudyAssignmentDisplay[]>([]);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);


  const loadProfile = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError;
      
      setUserId(user.id);

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        setFormData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          jobTitle: profile.job_title || '',
          phone: formatPhoneNumber(profile.phone || ''),
          avatarUrl: profile.avatar_url || '',
        });
        setIsCompanyAdmin(profile.role === 'admin');
        setIsPlatformAdmin(profile.is_platform_admin === true);

        const { data: memberships, error: membersError } = await supabase
          .from('study_team_members')
          .select(
            'id, role, studies(title, protocol_number), team_roles(role_name), study_sites(site_number, name)'
          )
          .eq('profile_id', profile.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (membersError) {
          console.error('Error loading study assignments:', membersError);
          setStudyAssignments([]);
        } else if (memberships?.length) {
          const rows: StudyAssignmentDisplay[] = memberships.map((row) => {
            const study = embedOne(
              row.studies as
                | { title: string | null; protocol_number: string | null }
                | { title: string | null; protocol_number: string | null }[]
                | null
                | undefined
            );
            const tr = embedOne(
              row.team_roles as
                | { role_name: string }
                | { role_name: string }[]
                | null
                | undefined
            );
            const site = embedOne(
              row.study_sites as
                | { site_number: string | null; name: string | null }
                | { site_number: string | null; name: string | null }[]
                | null
                | undefined
            );
            const studyTitle = study?.title?.trim() || 'Untitled study';
            let siteLabel: string | null = null;
            if (site?.name || site?.site_number) {
              const parts = [site.site_number, site.name].filter(Boolean) as string[];
              siteLabel = parts.join(' · ');
            }
            return {
              id: row.id as string,
              studyTitle,
              protocolNumber: study?.protocol_number ?? null,
              roleLabel: studyRoleLabel(row.role as string, tr?.role_name),
              siteLabel,
            };
          });
          setStudyAssignments(rows);
        } else {
          setStudyAssignments([]);
        }
      } else {
        setStudyAssignments([]);
        setIsCompanyAdmin(false);
        setIsPlatformAdmin(false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setStudyAssignments([]);
      setIsCompanyAdmin(false);
      setIsPlatformAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length > 50) {
      newErrors.firstName = 'First name must be 50 characters or less';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length > 50) {
      newErrors.lastName = 'Last name must be 50 characters or less';
    }

    if (formData.jobTitle && formData.jobTitle.length > 100) {
      newErrors.jobTitle = 'Job title must be 100 characters or less';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    setErrors({});

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          display_name: formData.firstName || null,
          job_title: formData.jobTitle || null,
          phone: formData.phone || null,
          avatar_url: formData.avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ submit: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    let processedValue = value;
    
    // Format phone number as user types
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value);
    }
    // Capitalize first letter for name fields
    else if (field === 'firstName' || field === 'lastName' || field === 'jobTitle') {
      processedValue = capitalizeFirstLetter(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const showAdminAccess = isPlatformAdmin || isCompanyAdmin;
  const showStudyList = studyAssignments.length > 0;
  const showAccessEmpty = !showAdminAccess && !showStudyList;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AvatarUpload
        currentAvatarUrl={formData.avatarUrl}
        userId={userId}
        onUploadComplete={(url) => handleChange('avatarUrl', url)}
        onUploadError={setUploadError}
      />
      
      {uploadError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {uploadError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            disabled={saving}
            aria-invalid={!!errors.firstName}
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            disabled={saving}
            aria-invalid={!!errors.lastName}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobTitle">Job Title</Label>
        <Input
          id="jobTitle"
          value={formData.jobTitle}
          onChange={(e) => handleChange('jobTitle', e.target.value)}
          placeholder="e.g., Lead Clinical Research Coordinator"
          disabled={saving}
          aria-invalid={!!errors.jobTitle}
        />
        {errors.jobTitle && (
          <p className="text-sm text-destructive">{errors.jobTitle}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => {
            const formatted = formatPhoneNumber(e.target.value);
            handleChange('phone', formatted);
          }}
          placeholder="+1 (555) 123-4567"
          disabled={saving}
          aria-invalid={!!errors.phone}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone}</p>
        )}
      </div>

      <div className="space-y-2 border-t pt-6">
        <Label className="text-muted-foreground">Roles and access</Label>
        <div
          className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {showAccessEmpty ? (
            <p>No study roles or administrator access is assigned to your account.</p>
          ) : (
            <div className="space-y-4">
              {showAdminAccess ? (
                <ul className="space-y-2 list-none m-0 p-0">
                  {isPlatformAdmin ? (
                    <li className="leading-snug">
                      <span className="font-medium text-foreground">Platform administrator</span>
                    </li>
                  ) : null}
                  {isCompanyAdmin ? (
                    <li className="leading-snug">
                      <span className="font-medium text-foreground">Company administrator</span>
                    </li>
                  ) : null}
                </ul>
              ) : null}
              {showAdminAccess && showStudyList ? (
                <div className="border-t border-dashed border-border/60 pt-3" />
              ) : null}
              {showStudyList ? (
                <ul className="space-y-3 list-none m-0 p-0">
                  {studyAssignments.map((a) => (
                    <li key={a.id} className="leading-snug">
                      <span className="font-medium text-foreground">{a.studyTitle}</span>
                      {a.protocolNumber ? (
                        <span className="block text-xs text-muted-foreground">
                          Protocol {a.protocolNumber}
                        </span>
                      ) : null}
                      <span className="block mt-0.5">
                        {a.roleLabel}
                        {a.siteLabel ? ` · ${a.siteLabel}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : showAdminAccess ? (
                <p className="m-0 text-xs">No per-study roles are assigned to your account.</p>
              ) : null}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          These assignments are managed by your organization and cannot be edited here.
        </p>
      </div>

      {errors.submit && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errors.submit}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
