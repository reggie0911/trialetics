import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { PsdvPageClient } from '@/components/psdv/psdv-page-client';
import { Suspense } from 'react';

export default async function SourceDataVerificationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

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
        <Suspense fallback={<div className="h-10" />}>
          <PsdvPageClient
            companyId={profile.company_id}
            profileId={profile.id}
            email={profile.email || user.email || ''}
          />
        </Suspense>
      </main>
    </div>
  );
}
