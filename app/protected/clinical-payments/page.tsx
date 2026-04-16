import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { ClinicalPaymentsPageClient } from '@/components/clinical-payments/clinical-payments-page-client';
import { createClient } from '@/lib/server';

export default async function ClinicalPaymentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, email')
    .eq('user_id', user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/protected');
  }

  return (
    <div className="min-h-screen bg-[#E9E9E9] font-sans">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
              Clinical Payments
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl">
              Operational payment tools and demos. For <strong className="font-medium text-foreground">trial budgets</strong>,{' '}
              <strong className="font-medium text-foreground">invoices</strong>, and{' '}
              <strong className="font-medium text-foreground">approval-to-payment</strong> traceability, use CTMS{' '}
              <Link href="/protected/studies" className="underline font-medium text-primary hover:text-primary/90">
                Studies
              </Link>{' '}
              (open a study, then Financials — no automatic sync between these modules).
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/protected/clinical-payments/demo"
              className="inline-flex items-center rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              Demo Mode
            </Link>
            <ModuleNavbar />
          </div>
        </div>

        <ClinicalPaymentsPageClient
          companyId={profile.company_id}
          profileId={profile.id}
          email={profile.email || user.email || ''}
        />
      </main>
    </div>
  );
}
