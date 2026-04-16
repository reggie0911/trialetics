/**
 * Backfill latitude/longitude for study_sites rows missing coordinates.
 *
 * Required env:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *
 * Run:
 *   node --env-file=.env.local scripts/backfill-site-coordinates.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
    break;
  }
}

function buildAddressQuery(site) {
  return [site.address, site.city, site.state, site.postal_code]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

async function geocodeAddress(addressQuery, apiKey) {
  if (!addressQuery) return { status: 'missing_address', latitude: null, longitude: null };
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { status: 'error', latitude: null, longitude: null };
  const payload = await res.json();
  const location = payload?.results?.[0]?.geometry?.location;
  if (payload?.status !== 'OK' || !location) {
    return { status: 'no_results', latitude: null, longitude: null };
  }
  return { status: 'success', latitude: location.lat, longitude: location.lng };
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!url || !serviceRoleKey || !mapsApiKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sites, error } = await supabase
    .from('study_sites')
    .select('id, address, city, state, postal_code, latitude, longitude')
    .or('latitude.is.null,longitude.is.null')
    .order('updated_at', { ascending: false })
    .limit(5000);

  if (error) {
    throw error;
  }

  const rows = sites ?? [];
  console.log(`Found ${rows.length} site(s) missing coordinates.`);

  let successCount = 0;
  let failureCount = 0;

  for (const site of rows) {
    const addressQuery = buildAddressQuery(site);
    const geocoded = await geocodeAddress(addressQuery, mapsApiKey);

    const payload =
      geocoded.status === 'success'
        ? {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            geocode_status: geocoded.status,
            geocoded_at: new Date().toISOString(),
          }
        : {
            latitude: geocoded.status === 'missing_address' ? null : site.latitude,
            longitude: geocoded.status === 'missing_address' ? null : site.longitude,
            geocode_status: geocoded.status,
            geocoded_at: null,
          };

    const { error: updateError } = await supabase
      .from('study_sites')
      .update(payload)
      .eq('id', site.id);

    if (updateError) {
      failureCount += 1;
      console.warn(`Site ${site.id}: update failed (${updateError.message})`);
      continue;
    }

    if (geocoded.status === 'success') successCount += 1;
    else failureCount += 1;
    console.log(`Site ${site.id}: ${geocoded.status}`);
  }

  console.log(`Backfill complete. Success: ${successCount}, Non-success: ${failureCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
