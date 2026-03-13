import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { createClient } from '@/lib/server';
import { BarChart3, Users, FileQuestion, ClipboardCheck, Calendar, Pill } from 'lucide-react';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, company_id, email, first_name')
    .eq('user_id', data.user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/auth/login');
  }

  const trackers = [
    { href: '/protected/patients', label: 'MRace Tracker', icon: Users },
    { href: '/protected/ae', label: 'AE Metrics', icon: BarChart3 },
    { href: '/protected/ecrf-query-tracker', label: 'eCRF Query Tracker', icon: FileQuestion },
    { href: '/protected/sdv-tracker', label: 'SDV Tracker', icon: ClipboardCheck },
    { href: '/protected/vw', label: 'Visit Window', icon: Calendar },
    { href: '/protected/mc', label: 'Med Compliance', icon: Pill },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome{profile.first_name ? `, ${profile.first_name}` : ''}
            </h1>
            <p className="text-muted-foreground mt-1">
              Select a tracker to get started
            </p>
          </div>
          <ModuleNavbar />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackers.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 rounded-xl border bg-card p-6 transition-colors hover:bg-accent/50 hover:border-primary/30"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{label}</h2>
                <p className="text-sm text-muted-foreground">View and manage data</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
