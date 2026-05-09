import { NextResponse } from 'next/server';

import { runDueFinanceScheduledReportsWithSupabase } from '@/lib/actions/study-finance-module';
import { createAdminClient } from '@/lib/server-admin';

/**
 * Vercel Cron: runs hourly (see `vercel.json`). Processes due `fm_scheduled_report` rows
 * and materializes CSV exports into `fm_export_job` + `finance-documents` storage.
 *
 * Auth: `Authorization: Bearer <FINANCE_MODULE_CRON_SECRET or CRON_SECRET>`, or
 * Vercel’s `x-vercel-cron: 1` header on scheduled invocations.
 */
export async function GET(request: Request) {
  const secret = process.env.FINANCE_MODULE_CRON_SECRET ?? process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');
  const okBearer = secret && auth === `Bearer ${secret}`;
  if (!okBearer && vercelCron !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const result = await runDueFinanceScheduledReportsWithSupabase(admin);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Cron failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
