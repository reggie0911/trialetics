import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getStudyById } from '@/lib/actions/studies';
import { createClient } from '@/lib/server';
import { StudyForm } from '@/components/ctms/studies/study-form';

interface EditStudyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStudyPage({ params }: EditStudyPageProps) {
  const { id } = await params;
  const study = await getStudyById(id);

  if (!study) notFound();

  if (study.status === 'closed') {
    redirect(`/protected/studies/${id}?tab=overview&readOnly=1`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

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

      <StudyForm study={study} mode="edit" isAdmin={isAdmin} />
    </div>
  );
}
