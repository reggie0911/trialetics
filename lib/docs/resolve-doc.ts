import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database.types';
import { loadDoc, parseMarkdownDocument, type ParsedDoc } from './loader';

type PlatformDocRow = Database['public']['Tables']['platform_documentation']['Row'];

/** Supabase/PostgREST when the table has not been migrated yet */
export function isPlatformDocumentationTableMissingError(message: string): boolean {
  const m = (message ?? '').toLowerCase();
  return (
    m.includes('could not find the table') ||
    (m.includes('schema cache') && m.includes('platform_documentation')) ||
    (m.includes('relation') && m.includes('platform_documentation') && m.includes('does not exist'))
  );
}

let devWarnedMissingPlatformDocumentationTable = false;

function warnMissingPlatformDocumentationTableOnce(): void {
  if (process.env.NODE_ENV !== 'development' || devWarnedMissingPlatformDocumentationTable) return;
  devWarnedMissingPlatformDocumentationTable = true;
  console.warn(
    '[docs] Table public.platform_documentation is missing. Apply the migration (e.g. supabase db push or run SQL from supabase/migrations/*_platform_documentation.sql). Docs will use file content only until then.',
  );
}

/**
 * DB body wins when non-empty; otherwise load from disk when filePath is set.
 */
export async function loadDocResolved(
  slug: string,
  filePath: string | undefined,
  supabase: SupabaseClient<Database>
): Promise<ParsedDoc | null> {
  const { data: row, error } = await supabase
    .from('platform_documentation')
    .select('body_markdown')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    if (isPlatformDocumentationTableMissingError(error.message)) {
      warnMissingPlatformDocumentationTableOnce();
    } else {
      console.error('loadDocResolved', error.message);
    }
  }

  const body = row?.body_markdown?.trim();
  if (body) {
    return parseMarkdownDocument(row!.body_markdown);
  }

  if (filePath) {
    return loadDoc(filePath);
  }

  return null;
}

export async function fetchAllPlatformDocumentation(
  supabase: SupabaseClient<Database>
): Promise<PlatformDocRow[]> {
  const { data, error } = await supabase.from('platform_documentation').select('*').order('slug');
  if (error) {
    if (isPlatformDocumentationTableMissingError(error.message)) {
      warnMissingPlatformDocumentationTableOnce();
    } else {
      console.error('fetchAllPlatformDocumentation', error.message);
    }
    return [];
  }
  return (data as PlatformDocRow[]) ?? [];
}
