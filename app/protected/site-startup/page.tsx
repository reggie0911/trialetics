import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { SiteStartupClient } from '@/components/site-startup/site-startup-client';

export default async function SiteStartupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) redirect('/protected');

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Site Startup</h1>
            <p className="text-sm text-muted-foreground">
              Track site activation checklists from feasibility through enrollment readiness
            </p>
          </div>
          <ModuleNavbar />
        </div>
        <SiteStartupClient companyId={profile.company_id} />
      </main>
    </div>
  );
}
