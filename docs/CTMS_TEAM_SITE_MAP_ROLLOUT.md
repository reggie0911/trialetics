# CTMS Team-to-Site Map Rollout

## Environment requirements

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` must be configured for:
  - server-side geocoding persistence during site create/update
  - client-side map rendering
- Supabase migration `20260490000000_study_sites_coordinates.sql` must be applied.

## Backfill existing sites

Run once per environment after migration:

```bash
npm run backfill:site-coordinates
```

Script behavior:

- finds `study_sites` rows missing `latitude` or `longitude`
- geocodes using Google Geocoding API
- writes:
  - `latitude`
  - `longitude`
  - `geocode_status`
  - `geocoded_at`

## QA checklist

### Study-scoped map (`/protected/studies/[id]/team`)

- Open a study with sites and team assignments.
- Confirm map loads and markers appear for sites with coordinates.
- Confirm marker details show assigned members and roles.
- Confirm filters work:
  - assigned/unassigned
  - role
  - active assignments only
- Confirm unassigned sites appear as gray markers.

### Global map (`/protected/studies/map`)

- Open global map from Studies page “Team map” button.
- Confirm study filter narrows markers correctly.
- Confirm cross-study counts update with filters.

### Geocoding persistence

- Create a new site with valid address; verify `latitude/longitude` are saved.
- Update site address; verify coordinates update.
- Create/update site with missing address; verify save succeeds and `geocode_status` is non-success.

## Operational safeguards

- Geocoding failures are best-effort:
  - site create/update should still succeed
  - status is captured in `geocode_status`
- Use `geocode_status` to monitor quality:
  - `success` expected for fully mappable sites
  - non-success statuses indicate retry candidates
