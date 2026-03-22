'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { getPlatformAdminContext } from '@/lib/actions/platform-module-access';
import { getDocBySlug, docsRegistry, type DocCategory, type DocIconKey } from '@/lib/docs/registry';
import {
  PLATFORM_DOC_CATEGORIES,
  PLATFORM_DOC_ICON_KEYS,
  type PlatformDocAdminListItem,
  type PlatformDocDraft,
} from '@/lib/docs/platform-documentation-shared';
import { loadDoc, parseMarkdownDocument } from '@/lib/docs/loader';
import {
  listRepoManualTemplates,
  normalizeRepoManualRelativePath,
  readAllowlistedRepoManualRaw,
} from '@/lib/docs/repo-manual-templates';
import { isPlatformDocumentationTableMissingError } from '@/lib/docs/resolve-doc';
import type { Database } from '@/lib/types/database.types';

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const DOC_TABLE_SETUP_ERROR =
  'The documentation database table is not available. Apply the migration `supabase/migrations/*_platform_documentation.sql` (see docs/PLATFORM_ADMIN.md).';

const DOC_SCREENSHOTS_BUCKET_SETUP_ERROR =
  'The Supabase Storage bucket `documentation-screenshots` does not exist yet. Apply the migration `supabase/migrations/20260334300000_documentation_screenshots_bucket.sql` on your project (e.g. run `supabase db push`, or paste that file into the Supabase SQL editor). Until then, paste a public https:// image URL in markdown instead of uploading. See docs/PLATFORM_ADMIN.md — Screenshots in docs.';

function isDocumentationScreenshotsBucketMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('bucket not found') || m.includes('the specified bucket does not exist');
}

const VALID_CATEGORIES = PLATFORM_DOC_CATEGORIES;
const VALID_ICON_KEYS = PLATFORM_DOC_ICON_KEYS;

const DOC_SCREENSHOT_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
] as const;

const DOC_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

function mimeToDocScreenshotExt(mime: string): string | null {
  const m = mime.toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  return null;
}

export async function listDocumentationForAdmin(): Promise<{
  ok: boolean;
  items?: PlatformDocAdminListItem[];
  error?: string;
  /** False when `platform_documentation` is missing — list still shows built-in registry entries. */
  documentationTableAvailable?: boolean;
}> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('platform_documentation')
    .select('slug, title, module_route');

  let documentationTableAvailable = true;
  let rowList = rows ?? [];

  if (error) {
    if (isPlatformDocumentationTableMissingError(error.message)) {
      documentationTableAvailable = false;
      rowList = [];
    } else {
      return { ok: false, error: error.message };
    }
  }

  const dbSlugs = new Set(rowList.map((r) => r.slug));
  const rowBySlug = new Map(rowList.map((r) => [r.slug, r]));
  const items: PlatformDocAdminListItem[] = [];
  const registrySlugs = new Set(docsRegistry.map((d) => d.slug));

  for (const reg of docsRegistry) {
    const row = rowBySlug.get(reg.slug);
    const fromDb = row?.module_route?.trim();
    items.push({
      slug: reg.slug,
      source: 'registry',
      title: reg.title,
      hasDbRow: dbSlugs.has(reg.slug),
      moduleRoute: fromDb || reg.moduleRoute || '',
    });
  }

  for (const row of rowList) {
    if (registrySlugs.has(row.slug)) continue;
    items.push({
      slug: row.slug,
      source: 'database',
      title: row.title?.trim() || row.slug,
      hasDbRow: true,
      moduleRoute: row.module_route?.trim() || '',
    });
  }

  items.sort((a, b) => a.slug.localeCompare(b.slug));
  return { ok: true, items, documentationTableAvailable };
}

export async function getDocumentationDraft(slug: string): Promise<{
  ok: boolean;
  data?: PlatformDocDraft;
  error?: string;
}> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!SLUG_REGEX.test(slug)) return { ok: false, error: 'Invalid slug' };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('platform_documentation')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    if (!isPlatformDocumentationTableMissingError(error.message)) {
      return { ok: false, error: error.message };
    }
    // Table not migrated — behave as no DB row (file/registry draft only).
  }

  const reg = getDocBySlug(slug);
  if (!reg && !row) {
    return { ok: false, error: 'Documentation page not found' };
  }
  const fileParsed = reg?.filePath ? loadDoc(reg.filePath) : null;
  const defaultBodyFromFile = fileParsed
    ? `---\ntitle: ${reg!.title}\ndescription: ${reg!.description}\n---\n\n${fileParsed.content}`
    : '';

  const bodyMarkdown =
    row?.body_markdown?.trim() ? row.body_markdown : defaultBodyFromFile;

  const rolesNorm = normalizeRolesArray(row?.roles);

  const draft: PlatformDocDraft = {
    slug,
    bodyMarkdown,
    title: row?.title?.trim() || reg?.title || '',
    description: row?.description?.trim() || reg?.description || '',
    category: ((row?.category as DocCategory) || reg?.category || '') as DocCategory | '',
    iconKey: (
      reg
        ? reg.iconKey
        : row && VALID_ICON_KEYS.includes(row.icon_key as DocIconKey)
          ? (row.icon_key as DocIconKey)
          : 'bookOpen'
    ) as DocIconKey,
    roles: rolesNorm.length ? rolesNorm : reg?.roles || ['admin', 'user'],
    moduleRoute: row?.module_route?.trim() || reg?.moduleRoute || '',
    sortOrder: row?.sort_order != null ? String(row.sort_order) : reg ? String(reg.order) : '100',
    isRegistry: !!reg,
    hasDbRow: !!row,
  };

  return { ok: true, data: draft };
}

function normalizeRolesArray(arr: string[] | null | undefined): ('admin' | 'user')[] {
  if (!arr?.length) return [];
  const out: ('admin' | 'user')[] = [];
  if (arr.includes('admin')) out.push('admin');
  if (arr.includes('user')) out.push('user');
  return out;
}

export async function saveDocumentation(input: {
  slug: string;
  bodyMarkdown: string;
  title?: string;
  description?: string;
  category?: DocCategory | '';
  iconKey?: DocIconKey;
  roles?: ('admin' | 'user')[];
  moduleRoute?: string;
  sortOrder?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };
  if (!gate.profileId) return { ok: false, error: 'No profile' };

  const slug = input.slug.trim();
  if (!SLUG_REGEX.test(slug)) return { ok: false, error: 'Invalid slug' };

  const reg = getDocBySlug(slug);

  let roles = input.roles?.length ? input.roles : reg?.roles ?? ['admin', 'user'];
  roles = [...new Set(roles)].filter((r): r is 'admin' | 'user' => r === 'admin' || r === 'user');
  if (!roles.length) roles = ['admin', 'user'];

  const category = reg
    ? reg.category
    : input.category && VALID_CATEGORIES.includes(input.category)
      ? input.category
      : null;

  const iconKey =
    input.iconKey && VALID_ICON_KEYS.includes(input.iconKey)
      ? input.iconKey
      : reg?.iconKey ?? 'bookOpen';

  const sortOrder =
    input.sortOrder != null ? input.sortOrder : reg?.order ?? null;

  const payload: Database['public']['Tables']['platform_documentation']['Insert'] = {
    slug,
    body_markdown: input.bodyMarkdown,
    title: input.title?.trim() || null,
    description: input.description?.trim() || null,
    category,
    icon_key: reg ? null : iconKey,
    roles,
    module_route: input.moduleRoute?.trim() || reg?.moduleRoute || null,
    sort_order: sortOrder,
    updated_by: gate.profileId,
  };

  if (!reg && !payload.category) {
    return { ok: false, error: 'Category is required for new documentation' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('platform_documentation').upsert(payload, { onConflict: 'slug' });

  if (error) {
    if (isPlatformDocumentationTableMissingError(error.message)) {
      return { ok: false, error: DOC_TABLE_SETUP_ERROR };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/protected/docs');
  revalidatePath(`/protected/docs/${slug}`);
  revalidatePath('/protected/platform/docs');
  return { ok: true };
}

export async function createDocumentation(input: {
  slug: string;
  bodyMarkdown: string;
  title: string;
  description: string;
  category: DocCategory;
  iconKey: DocIconKey;
  roles: ('admin' | 'user')[];
  moduleRoute?: string;
  sortOrder?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };

  const slug = input.slug.trim().toLowerCase();
  if (!SLUG_REGEX.test(slug)) return { ok: false, error: 'Invalid slug (use lowercase letters, numbers, hyphens)' };

  if (getDocBySlug(slug)) {
    return { ok: false, error: 'This slug is reserved by a built-in doc. Edit it from the list instead.' };
  }

  const supabase = await createClient();
  const { data: existing, error: existingErr } = await supabase
    .from('platform_documentation')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();
  if (existingErr) {
    if (isPlatformDocumentationTableMissingError(existingErr.message)) {
      return { ok: false, error: DOC_TABLE_SETUP_ERROR };
    }
    return { ok: false, error: existingErr.message };
  }
  if (existing) return { ok: false, error: 'A documentation page with this slug already exists' };

  if (!VALID_CATEGORIES.includes(input.category)) return { ok: false, error: 'Invalid category' };

  return saveDocumentation({
    slug,
    bodyMarkdown: input.bodyMarkdown,
    title: input.title,
    description: input.description,
    category: input.category,
    iconKey: input.iconKey,
    roles: input.roles,
    moduleRoute: input.moduleRoute,
    sortOrder: input.sortOrder,
  });
}

/** Deletes the DB row. Built-in docs fall back to repo markdown; DB-only docs are removed from the catalog. */
export async function deleteDocumentation(slug: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!SLUG_REGEX.test(slug)) return { ok: false, error: 'Invalid slug' };

  const supabase = await createClient();
  const { error } = await supabase.from('platform_documentation').delete().eq('slug', slug);
  if (error) {
    if (isPlatformDocumentationTableMissingError(error.message)) {
      return { ok: false, error: DOC_TABLE_SETUP_ERROR };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/protected/docs');
  revalidatePath(`/protected/docs/${slug}`);
  revalidatePath('/protected/platform/docs');
  return { ok: true };
}

/** Upload an image to public storage; platform admins only. Returns a URL suitable for markdown `![](url)`. */
export async function uploadDocumentationScreenshot(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };

  const raw = formData.get('file');
  if (!raw || typeof raw === 'string') {
    return { ok: false, error: 'No file uploaded' };
  }

  const file = raw as Blob & { name?: string; type?: string };
  if (file.size === 0) {
    return { ok: false, error: 'File is empty' };
  }
  if (file.size > DOC_SCREENSHOT_MAX_BYTES) {
    return { ok: false, error: 'Image must be 5 MB or smaller.' };
  }

  const mime = (file.type || 'application/octet-stream').toLowerCase();
  if (!DOC_SCREENSHOT_ALLOWED_TYPES.includes(mime as (typeof DOC_SCREENSHOT_ALLOWED_TYPES)[number])) {
    return { ok: false, error: 'Invalid image type. Use PNG, JPEG, WebP, or GIF.' };
  }

  const ext = mimeToDocScreenshotExt(mime);
  if (!ext) return { ok: false, error: 'Invalid image type.' };

  const buffer = await file.arrayBuffer();
  const path = `screenshots/${crypto.randomUUID()}.${ext}`;

  const supabase = await createClient();
  const { error } = await supabase.storage.from('documentation-screenshots').upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    if (isDocumentationScreenshotsBucketMissingError(error.message)) {
      return { ok: false, error: DOC_SCREENSHOTS_BUCKET_SETUP_ERROR };
    }
    return { ok: false, error: error.message };
  }

  const { data } = supabase.storage.from('documentation-screenshots').getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export type LoadRepoManualForEditorResult =
  | {
      ok: true;
      rawMarkdown: string;
      suggestedTitle: string;
      suggestedDescription: string;
      registrySlug?: string;
      category?: DocCategory;
      iconKey?: DocIconKey;
      moduleRoute?: string;
    }
  | { ok: false; error: string };

/** Load allowlisted repo Markdown for the platform documentation editor (platform admins only). */
export async function loadRepoManualForEditor(filePath: string): Promise<LoadRepoManualForEditorResult> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error ?? 'Not allowed' };

  const raw = readAllowlistedRepoManualRaw(filePath);
  if (raw === null) {
    return { ok: false, error: 'Invalid path, or file not found.' };
  }

  const parsed = parseMarkdownDocument(raw);
  const fmTitle = parsed.frontmatter.title?.trim();
  const fmDesc = parsed.frontmatter.description?.trim();
  const firstHeading = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();

  let suggestedTitle = fmTitle || firstHeading || 'New documentation page';
  let suggestedDescription = fmDesc || '';

  const normalized = normalizeRepoManualRelativePath(filePath);
  const template = normalized
    ? listRepoManualTemplates().find((t) => t.filePath === normalized)
    : undefined;
  const registrySlug = template?.registrySlug;

  if (registrySlug) {
    const reg = getDocBySlug(registrySlug);
    if (reg) {
      if (!fmTitle) suggestedTitle = reg.title;
      if (!fmDesc && reg.description) suggestedDescription = reg.description;
      return {
        ok: true,
        rawMarkdown: raw,
        suggestedTitle,
        suggestedDescription,
        registrySlug,
        category: reg.category,
        iconKey: reg.iconKey,
        moduleRoute: reg.moduleRoute,
      };
    }
  }

  return {
    ok: true,
    rawMarkdown: raw,
    suggestedTitle,
    suggestedDescription,
  };
}

