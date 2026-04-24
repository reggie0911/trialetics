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

  const subject = await getSubjectById(subjectId);
  if (!subject) notFound();
  if (subject.study_id !== studyId) notFound();

  const [study, sitesRaw, liveVersion] = await Promise.all([
    getStudyById(studyId),
    getStudySites(studyId),
    supabase
      .from('study_ecrf_template_versions')
      .select('id')
      .eq('study_id', studyId)
      .eq('status', 'live')
      .maybeSingle(),
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
        sites={sites}
        liveTemplateVersionId={liveVersion.data?.id ?? null}
      />
    </div>
  );
}
