'use server';

import { createClient } from '@/lib/server';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function updateCompany(
  companyId: string,
  data: { name?: string; logo_url?: string | null; settings?: Record<string, unknown> },
  profileId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (profile.company_id !== companyId || profile.role !== 'admin') {
      return { success: false, error: 'Unauthorized to update this company' };
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;
    if (data.settings !== undefined) updateData.settings = data.settings;

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const { error: updateError } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId);

    if (updateError) {
      console.error('Error updating company:', updateError);
      return { success: false, error: updateError.message || 'Failed to update company' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

export async function uploadCompanyLogo(
  companyId: string,
  formData: FormData,
  profileId: string
): Promise<ActionResponse<{ logoUrl: string }>> {
  try {
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (profile.company_id !== companyId || profile.role !== 'admin') {
      return { success: false, error: 'Unauthorized to update this company' };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 2MB' };
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'File must be PNG, JPG, WebP, or SVG' };
    }

    const ext = file.name.split('.').pop() || 'png';
    const filePath = `companies/${companyId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message || 'Failed to upload logo' };
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const logoUrl = urlData.publicUrl;

    const updateResult = await updateCompany(companyId, { logo_url: logoUrl }, profileId);
    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    return { success: true, data: { logoUrl } };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error' };
  }
}
