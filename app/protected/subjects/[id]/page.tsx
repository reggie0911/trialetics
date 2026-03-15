import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getSubjectById } from '@/lib/actions/subjects';
import { getStudyById } from '@/lib/actions/studies';
import { getStudySites } from '@/lib/actions/sites';
import { SubjectDetailTabs } from '@/components/ctms/subjects/subject-detail-tabs';

interface SubjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectDetailPage({ params }: SubjectDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const subject = await getSubjectById(id);
  if (!subject) notFound();

  const [study, sitesRaw] = await Promise.all([
    getStudyById(subject.study_id),
    getStudySites(subject.study_id),
  ]);

  if (!study) notFound();

  const sites = sitesRaw.map((s) => ({
    id: s.id,
    site_number: s.site_number,
    name: s.name,
  }));

  return (
    <div className="p-6">
      <SubjectDetailTabs
        subject={subject}
        study={{
          id: study.id,
          title: study.title,
          protocol_number: study.protocol_number,
        }}
        sites={sites}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  );
}
