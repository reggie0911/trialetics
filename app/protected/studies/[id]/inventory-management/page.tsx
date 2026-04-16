import { notFound } from 'next/navigation';
import { getStudies } from '@/lib/actions/studies';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { createClient } from '@/lib/server';
import { IpManagementPageClient } from '@/components/ctms/ip-management/ip-management-page-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyInventoryManagementPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

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
    <div className="p-6">
      <IpManagementPageClient
        studies={studies}
        profileRole={profileRole}
        isPlatformAdmin={isPlatformAdmin}
        initialStudyId={studyId}
      />
    </div>
  );
}
