import { redirect } from 'next/navigation';

import { createClient } from '@/lib/server';
import { listFinanceApprovalTemplates } from '@/lib/actions/finance-approval-templates';
import { FinanceApprovalTemplatesClient } from '@/components/ctms/financials/finance-approval-templates-client';

export default async function FinanceApprovalTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/protected/financials');

  let templates: Awaited<ReturnType<typeof listFinanceApprovalTemplates>> = [];
  try {
    templates = await listFinanceApprovalTemplates();
  } catch {
    redirect('/protected/financials');
  }

  return (
    <div className="p-6">
      <FinanceApprovalTemplatesClient initialTemplates={templates} />
    </div>
  );
}
