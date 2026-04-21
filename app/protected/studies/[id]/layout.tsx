import { notFound } from 'next/navigation';

import { StudyCompactHeader } from '@/components/ctms/studies/study-compact-header';
import { StudyHubShell } from '@/components/ctms/study-hub-shell';
import { StudyContextBridge } from '@/components/copilot/study-context-bridge';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { createClient } from '@/lib/server';

export default async function StudyScopedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await getStudyByIdCached(id);
  if (!study) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
    isAdmin = profile?.role === 'admin';
  }

  const headingName = study.study_name?.trim() || study.title;
  const isStudyReadOnly = study.status === 'closed';

  return (
    <div className="flex min-h-0 flex-col">
      <StudyContextBridge
        studyId={id}
        studyTitle={study.study_name ?? study.title ?? study.protocol_number ?? null}
        studyStatus={study.status}
        isStudyReadOnly={isStudyReadOnly}
      />
      <StudyCompactHeader
        studyId={id}
        headingName={headingName}
        protocolNumber={study.protocol_number}
        phase={study.phase}
        status={study.status}
        isStudyReadOnly={isStudyReadOnly}
      />
      <StudyHubShell studyId={id} studyStatus={study.status} isAdmin={isAdmin}>
        {children}
      </StudyHubShell>
    </div>
  );
}
