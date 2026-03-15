import { createClient } from '@/lib/server';
import type { ChatRequest, UserContext } from './types';

const MODULE_MAP: Record<string, string> = {
  '/protected/studies': 'studies',
  '/protected/sites': 'sites',
  '/protected/subjects': 'subjects',
  '/protected/tasks': 'tasks',
  '/protected/countries': 'countries',
  '/protected/team': 'team',
  '/protected/visits': 'visits',
  '/protected/financials': 'financials',
  '/protected/reports': 'reports',
  '/protected/settings/billing': 'billing',
  '/protected/contacts-organizations': 'contacts-organizations',
  '/protected/document-management': 'document-management',
  '/protected/patients': 'subjects',
  '/protected/visit-templates': 'visit-templates',
  '/protected/trip-reports': 'trip-reports',
  '/protected/sdv-tracker': 'sdv-tracker',
  '/protected/source-data-verification': 'source-data-verification',
  '/protected/clinical-payments': 'clinical-payments',
  '/protected/clinical-training': 'clinical-training',
  '/protected/vw': 'visit-window',
  '/protected/dashboard': 'dashboard',
  '/protected/ae': 'ae-metrics',
  '/protected/ecrf-query-tracker': 'ecrf-query-tracker',
  '/protected/mc': 'med-compliance',
  '/protected/clinical-trials': 'clinical-trials',
  '/protected/admin': 'admin',
};

export function identifyModule(pagePath: string): string {
  for (const [prefix, module] of Object.entries(MODULE_MAP)) {
    if (pagePath.startsWith(prefix)) return module;
  }
  return 'general';
}

export async function buildContext(request: ChatRequest): Promise<UserContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single();

  return {
    currentPage: request.context.currentPage,
    protocolId: request.context.protocolId ?? null,
    companyId: profile?.company_id ?? null,
    userId: user.id,
    userRole: profile?.role ?? 'user',
  };
}
