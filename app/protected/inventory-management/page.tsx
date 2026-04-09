import { getStudies } from '@/lib/actions/studies';
import { createClient } from '@/lib/server';
import { IpManagementPageClient } from '@/components/ctms/ip-management/ip-management-page-client';

export default async function InventoryManagementPage() {
  const [studies, supabase] = await Promise.all([getStudies(), createClient()]);
  const { data: userData } = await supabase.auth.getUser();
  let profileRole: string = 'user';
  let isPlatformAdmin = false;
  if (userData?.user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_platform_admin')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    profileRole = profile?.role ?? 'user';
    isPlatformAdmin = profile?.is_platform_admin === true;
  }
  return (
    <IpManagementPageClient
      studies={studies}
      profileRole={profileRole}
      isPlatformAdmin={isPlatformAdmin}
    />
  );
}
