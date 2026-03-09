import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { RateListsClient } from '@/components/clinical-trials/rate-lists-client';

export default async function RateListsPage() {
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Rate Lists & Position Types</h1>
        <p className="text-sm text-muted-foreground">
          Configure position types and hourly rates for team billing
        </p>
      </div>
      <RateListsClient companyId={profile.company_id} />
    </div>
  );
}
