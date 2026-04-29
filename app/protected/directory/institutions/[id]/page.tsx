import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getInstitutionById } from '@/lib/actions/directory-institutions';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { listDirectoryComments } from '@/lib/actions/directory-comments';
import { getStudies } from '@/lib/actions/studies';
import { createClient } from '@/lib/server';
import { Button } from '@/components/ui/button';
import { DirectoryInstitutionDetailClient } from '@/components/ctms/directory/directory-institution-detail-client';
import type { InstitutionRow } from '@/lib/types/directory';

type InstitutionDetailProps = InstitutionRow & {
  institution_study: {
    id: string;
    study_id: string;
    relationship_type: string;
    studies?: unknown;
  }[];
  institution_study_site: {
    id: string;
    study_site_id: string;
    study_sites?: unknown;
  }[];
  directory_contact_institution: {
    id: string;
    directory_contact_id: string;
    is_primary: boolean;
    directory_contacts?: unknown;
  }[];
  parent?: { id: string; name: string } | null;
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
}

const STUDY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DirectoryInstitutionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const fromStudy = sp.from && STUDY_UUID.test(sp.from) ? sp.from : null;
  const backHref = fromStudy ? `/protected/studies/${fromStudy}/directory` : '/protected/studies#studies';
  const access = await getDirectoryAccess();
  if (!access.ok) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [inst, studies, commentsRes] = await Promise.all([
    getInstitutionById(id),
    getStudies(),
    listDirectoryComments('institution', id),
  ]);

  if (!inst.data) notFound();

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" className="text-xs -ml-2 h-8" asChild>
        <Link href={backHref}>
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          {fromStudy ? 'Back to Directory' : 'Contacts & Organizations'}
        </Link>
      </Button>
      <DirectoryInstitutionDetailClient
        institution={inst.data as InstitutionDetailProps}
        canEdit={access.canEdit}
        studies={studies}
        currentUserId={user.id}
        initialComments={commentsRes.data}
      />
    </div>
  );
}
