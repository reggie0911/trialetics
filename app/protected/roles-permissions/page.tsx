import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/server';
import { PERMISSION_KEY_LABELS, PERMISSION_KEYS } from '@/lib/types/rbac';

type PermissionRow = {
  module_id: string;
  permission_key: string;
  label: string;
  description: string | null;
  module: { name: string; description: string | null };
};

export default async function RolesPermissionsPage() {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login');
  if (profile.role !== 'admin') redirect('/protected/studies/catalog');

  const [companyResult, usersResult] = await Promise.all([
    supabase
      .from('companies')
      .select('has_ctms_access, has_tracker_access, has_etmf_access, has_eisf_access')
      .eq('id', profile.company_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id')
      .eq('company_id', profile.company_id),
  ]);

  const company = companyResult.data;
  const enabledModules = [
    { id: 'ctms', name: 'CTMS', description: 'Core clinical trial management workflows', enabled: company?.has_ctms_access !== false },
    { id: 'tracker', name: 'Study Tracker', description: 'Custom study tracker modules', enabled: company?.has_tracker_access === true },
    { id: 'etmf', name: 'eTMF', description: 'Electronic trial master file', enabled: company?.has_etmf_access === true },
    { id: 'eisf', name: 'eISF', description: 'Electronic investigator site file', enabled: company?.has_eisf_access === true },
  ].filter((module) => module.enabled);

  const permissions: PermissionRow[] = enabledModules.flatMap((module) =>
    PERMISSION_KEYS.map((key) => ({
      module_id: module.id,
      permission_key: key,
      label: PERMISSION_KEY_LABELS[key],
      description: null,
      module: { name: module.name, description: module.description },
    })),
  );
  const moduleGroups = new Map<string, PermissionRow[]>();
  for (const permission of permissions) {
    const key = permission.module.name;
    const group = moduleGroups.get(key) ?? [];
    group.push(permission);
    moduleGroups.set(key, group);
  }

  return (
    <main className="p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin workflow</p>
            <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Read-only RBAC overview using enabled company modules and permission keys.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/protected/studies">Back to admin overview</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{moduleGroups.size}</div><div className="text-xs text-muted-foreground">Modules</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{permissions.length}</div><div className="text-xs text-muted-foreground">Permissions</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{(usersResult.data ?? []).length}</div><div className="text-xs text-muted-foreground">Users covered</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permission Matrix</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {permissions.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No module permissions are configured yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Module</th>
                      {PERMISSION_KEYS.map((key) => (
                        <th key={key} className="px-4 py-3 font-medium">{PERMISSION_KEY_LABELS[key]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...moduleGroups.entries()].map(([moduleName, rows]) => (
                      <tr key={moduleName} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{moduleName}</div>
                          <div className="text-xs text-muted-foreground">{rows[0]?.module.description ?? 'Module permissions'}</div>
                        </td>
                        {PERMISSION_KEYS.map((key) => {
                          const permission = rows.find((row) => row.permission_key === key);
                          return (
                            <td key={key} className="px-4 py-3">
                              {permission ? <Badge variant="outline">Default allow</Badge> : <span className="text-muted-foreground">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Override Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Trialetics currently treats module permissions as default-allowed for admins unless a future override model is enabled. Editing is intentionally not exposed here because the existing RBAC action only supports permission checks.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
