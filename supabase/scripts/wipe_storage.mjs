// wipe_storage.mjs — empty every Storage bucket via the Supabase Storage API.
//
// Hosted Supabase blocks direct SQL DELETE on storage.objects (storage.protect_delete).
// Run this before or after supabase/scripts/wipe_all_data.sql so files and DB rows stay in sync.
//
// Usage (from repo root):
//   set SUPABASE_SERVICE_ROLE_KEY=... (PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY="...")
//   set NEXT_PUBLIC_SUPABASE_URL=...    (or SUPABASE_URL)
//   node supabase/scripts/wipe_storage.mjs
//
// Requires: @supabase/supabase-js (workspace dependency)

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function listPage(bucket, path, offset, limit) {
  const folder = path === '' ? undefined : path;
  const { data, error } = await sb.storage.from(bucket).list(folder, {
    limit,
    offset,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw error;
  return data ?? [];
}

/** List all entries at `path` (folder prefix inside bucket), paginated. */
async function listAllAtPath(bucket, path) {
  const limit = 1000;
  const all = [];
  let offset = 0;
  for (;;) {
    const page = await listPage(bucket, path, offset, limit);
    if (!page.length) break;
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  return all;
}

function childPath(prefix, name) {
  return prefix ? `${prefix}/${name}` : name;
}

/** Depth-first: empty subfolders, then delete files at this level. */
async function emptyPath(bucket, pathPrefix) {
  const entries = await listAllAtPath(bucket, pathPrefix);

  for (const entry of entries) {
    if (entry.id === null) {
      await emptyPath(bucket, childPath(pathPrefix, entry.name));
    }
  }

  const files = entries
    .filter((e) => e.id !== null)
    .map((e) => childPath(pathPrefix, e.name));

  if (!files.length) return;

  const { error } = await sb.storage.from(bucket).remove(files);
  if (error) throw error;
}

async function emptyBucket(bucketName) {
  await emptyPath(bucketName, '');
}

async function main() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw error;
  if (!buckets?.length) {
    console.log('No buckets.');
    return;
  }

  for (const b of buckets) {
    process.stdout.write(`Emptying "${b.name}"... `);
    await emptyBucket(b.name);
    console.log('done.');
  }

  console.log(`Finished ${buckets.length} bucket(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
