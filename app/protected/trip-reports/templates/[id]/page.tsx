import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { TripReportTemplatePageClient } from '@/components/trip-reports/trip-report-template-page-client';
import { createClient } from '@/lib/server';
import { getTripReportTemplate } from '@/lib/actions/trip-report-templates';
import { ArrowLeft } from 'lucide-react';

export default async function TemplateEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const { id } = await params;
  if (searchParams) await searchParams;

  if (id === 'new') {
    redirect('/protected/trip-reports/templates/new');
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id, role, email')
    .eq('user_id', data.user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/auth/login');
  }

  const templateResult = await getTripReportTemplate(id);
  if (!templateResult.success || !templateResult.data) {
    redirect('/protected/trip-reports');
  }

  return (
    <div className="min-h-screen bg-[#E9E9E9] font-[var(--font-poppins)]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
              Clinical Trip Reports
            </h1>
            <div className="flex items-center gap-2">
              <Link
                href="/protected/trip-reports"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <p className="text-xs text-muted-foreground">
                Edit trip report template
              </p>
            </div>
          </div>
          <ModuleNavbar />
        </div>

        <TripReportTemplatePageClient
          template={templateResult.data}
          companyId={profile.company_id}
        />
      </main>
    </div>
  );
}
