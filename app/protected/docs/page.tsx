import { createClient } from '@/lib/server';
import { getDocsByCategory } from '@/lib/docs/registry';
import { fetchAllPlatformDocumentation } from '@/lib/docs/resolve-doc';
import { mergeDocEntriesWithDb } from '@/lib/docs/merge-doc-entries';
import { DocsIndex } from '@/components/docs/docs-index';

export default async function DocsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role = 'user';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    role = profile?.role ?? 'user';
  }

  const dbRows = await fetchAllPlatformDocumentation(supabase);
  const entries = mergeDocEntriesWithDb(role, dbRows);
  const grouped = getDocsByCategory(entries);

  return <DocsIndex entries={entries} grouped={grouped} />;
}
