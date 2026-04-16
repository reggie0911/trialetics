import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getSubjectById } from '@/lib/actions/subjects';
import { getStudyById } from '@/lib/actions/studies';
import { getStudySites } from '@/lib/actions/sites';
import { SubjectDetailTabs } from '@/components/ctms/subjects/subject-detail-tabs';

interface PageProps {
  params: Promise<{ id: string; subjectId: string }>;
}

export default async function StudySubjectDetailPage({ params }: PageProps) {
  const { id: studyId, subjectId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const subject = await getSubjectById(subjectId);
  if (!subject) notFound();
  if (subject.study_id !== studyId) notFound();

  const [study, sitesRaw] = await Promise.all([
    getStudyById(studyId),
    getStudySites(studyId),
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
        studyId={studyId}
      />
    </div>
  );
}
