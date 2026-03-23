import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getStudyById } from '@/lib/actions/studies';
import { listInstitutions } from '@/lib/actions/directory-institutions';
import { StudyForm } from '@/components/ctms/studies/study-form';

interface EditStudyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStudyPage({ params }: EditStudyPageProps) {
  const { id } = await params;
  const study = await getStudyById(id);

  if (!study) notFound();

  const { data: institutions } = await listInstitutions({ limit: 100 });
  const institutionOptions = (institutions ?? []).map((i) => ({ id: i.id, name: i.name }));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" render={<Link href={`/protected/studies/${id}`} />} nativeButton={false} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Study
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Study</h1>
        <p className="text-muted-foreground">
          Update protocol details for {study.title}.
        </p>
      </div>

      <StudyForm study={study} mode="edit" institutionOptions={institutionOptions} />
    </div>
  );
}
