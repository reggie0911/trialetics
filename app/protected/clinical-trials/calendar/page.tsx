import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { ActivityCalendarPage } from '@/components/clinical-trials/activity-calendar-page';

export default async function CalendarPage() {
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

  return <ActivityCalendarPage companyId={profile.company_id} />;
}
