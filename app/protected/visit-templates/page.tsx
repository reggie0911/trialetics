import { Suspense } from 'react';
import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import VisitTemplatesPageClient from '@/components/visit-templates/visit-templates-page-client';

export default async function VisitTemplatesPage() {
  const supabase = await createClient();

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile with company
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, email')
    .eq('user_id', user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/protected');
  }

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Module Navigation */}
        <div className="mb-6">
          <Suspense fallback={<div className="h-10" />}>
            <ModuleNavbar />
          </Suspense>
        </div>
        <Suspense fallback={<div className="p-8">Loading...</div>}>
          <VisitTemplatesPageClient
            companyId={profile.company_id}
            profileId={profile.id}
            email={profile.email || user.email || ''}
          />
        </Suspense>
      </main>
    </div>
  );
}
