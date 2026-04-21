# Visit-Report Attachments — Security & Operations

This document describes the security model, threat surface, and operational
controls around the `visit-report-attachments` Supabase Storage bucket and the
`public.visit_report_attachments` metadata table. It is the source-of-truth
companion to:

- The bucket / RLS migration: `supabase/migrations/20260319300000_visit_report_attachments.sql`
- The hardening migration: `supabase/migrations/<scan-and-rls timestamp>_visit_report_attachments_scan_and_rls.sql`
- The shared policy module: `lib/visit-report-attachments-policy.ts`
- The upload server action: `lib/actions/visit-reports.ts` (`uploadVisitReportAttachment`)
- The download server action: `lib/actions/visit-reports.ts` (`getAttachmentDownloadUrl`)
- The scan Edge Function: `supabase/functions/scan-visit-report-attachment/index.ts`
- The upload UI: `components/ctms/trip-reports/visit-report-authoring.tsx`

## 1. Bucket configuration

| Field | Value |
| --- | --- |
| `id` / `name` | `visit-report-attachments` |
| `public` | `false` (objects are only retrievable via signed URLs) |
| `file_size_limit` | `10485760` bytes (10 MiB) |
| `allowed_mime_types` | `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/gif`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/plain`, `text/csv` |
| Object path layout | `{trip_report_id}/{uuid}-{encoded_file_name}` |

Storage Service enforces `file_size_limit` and `allowed_mime_types` at the
storage layer based on the request's declared `Content-Type`. A client that
spoofs `Content-Type` could bypass the MIME allowlist, which is why we add a
server-side magic-byte sniff (see §3) and a virus scan (see §5).

## 2. Row-level security

### `public.visit_report_attachments` (metadata)

Already company-scoped through the trip_report → monitoring_visit → study chain.
All four CRUD policies require the row's `trip_report_id` to belong to a study
in the caller's `company_id`. See the migration for the exact predicates.

### `storage.objects` (bytes) — current

Pre-hardening, the storage policies are dangerously broad: any authenticated
user could `SELECT`, `INSERT`, or `DELETE` any object whose `bucket_id` is
`visit-report-attachments`, regardless of which company or report owns it.

```sql
-- pre-hardening
FOR INSERT WITH CHECK (bucket_id = 'visit-report-attachments' AND auth.uid() IS NOT NULL);
FOR SELECT USING        (bucket_id = 'visit-report-attachments' AND auth.uid() IS NOT NULL);
FOR DELETE USING        (bucket_id = 'visit-report-attachments' AND auth.uid() IS NOT NULL);
```

In practice paths are 128-bit UUIDs and the application never lists the bucket
contents, so the in-product attack surface is small. The risk is a malicious or
compromised user who *knows* (or stumbles onto) another company's
`trip_report_id`/object key.

### `storage.objects` — after hardening

Object keys begin with the `trip_report_id` (`{report_id}/{uuid}-...`), so we
can derive the report from `(storage.foldername(name))[1]::uuid` and join to
`trip_reports → monitoring_visits → studies` to enforce a real predicate:

- `INSERT` — caller's `company_id` matches the report's study, **and** the
  report's status is in `('report_pending','authoring','returned')` (mirrors
  the application-level `assertAuthorCanEditReport`).
- `SELECT` — caller's `company_id` matches the report's study (no status gate;
  reviewers and signed-state users still need to read attachments).
- `DELETE` — caller's `company_id` matches the report's study **and** the
  report status allows author edits.
- No `UPDATE` policy. Objects are immutable at the storage layer; replacements
  are delete + insert.

The application-layer `getAttachmentDownloadUrl` adds a finer per-role
permission check (`canViewTripReportContent`) and remains the only way to
obtain a signed URL for downloads. The storage policies are the second line of
defence.

## 3. Server-side validation in `uploadVisitReportAttachment`

Layered checks, in order:

1. `assertAuthorCanEditReport` — caller is the author and the report is in
   `report_pending`, `authoring`, or `returned`.
2. `file.size <= MAX_ATTACHMENT_BYTES` (10 MiB).
3. Per-report file count `< MAX_ATTACHMENTS_PER_REPORT` (25).
4. Magic-byte sniff: read first 16 bytes and verify the file's true type is in
   `ALLOWED_MIME_TYPES`. Rejects renamed `.exe`, audio, video, RAR, 7z, etc.
5. Storage upload (bucket re-enforces size + declared MIME).
6. Insert metadata row with `scan_status='pending'`.
7. Fire-and-forget `supabase.functions.invoke('scan-visit-report-attachment')`.
   Any invoke error is logged, not surfaced — the retry sweep (see §6) will
   re-drive the row.

The shared constants and the magic-byte helper live in
`lib/visit-report-attachments-policy.ts` so the upload UI can import the same
limits and pre-flight client uploads.

## 4. Threat model

| Threat | Pre-hardening | Mitigation |
| --- | --- | --- |
| Cross-company storage access (signed-in user fetches another company's object) | Possible if path is leaked or guessed (UUIDs are infeasible to guess but can be leaked via logs / browser history) | Storage `SELECT` policy now requires company match through the path-derived `trip_report_id`. |
| Cross-company storage write (poisoning another company's bucket folder) | Possible | Storage `INSERT` policy requires company match + report-editable status. |
| Cross-company delete | Possible | Storage `DELETE` policy requires company match + report-editable status. |
| Malware delivery to reviewers (CRA uploads infected file, CPM downloads it) | Unmitigated | Asynchronous ClamAV scan; downloads short-circuit on `scan_status` ∈ {`pending`,`infected`,`error`}. Infected bytes are removed from storage; metadata row is retained for audit. |
| MIME spoofing (rename `evil.exe` to `evil.pdf`, send with `Content-Type: application/pdf`) | Bucket allowlist trusts declared MIME | Server-side magic-byte sniff before upload; ClamAV catches binaries that pass the sniff. |
| File-count DoS (one author uploads 10,000 small files) | Unmitigated | Per-report cap of 25 enforced server-side and client-side. |
| Storage RLS drift (UPDATE policy added accidentally allows mutation) | N/A | Documented "no UPDATE policy" invariant; tests assert the storage policies are exactly the four expected. |
| Signed URL leakage (URL forwarded to non-permitted user) | 1-hour TTL; URL is the bearer credential | Out of scope for this audit; tracked separately. |
| Confused-deputy via `getAttachmentDownloadUrl` (admin client returns signed URL without enough checks) | Mitigated already (company match + `canViewTripReportContent`) | Now also gated on `scan_status`. |
| Part 11 hash mismatch caused by post-signature deletion of infected bytes | Possible | Uploads are blocked after the report leaves `AUTHOR_EDIT_STATUSES`, so a scan can never re-classify a *signed* report's attachment from `clean` to `infected`. Documented in `docs/PART11_CONTROLS.md`. |

## 5. Asynchronous virus scanning

| Field | Behaviour |
| --- | --- |
| Trigger | Fire-and-forget invoke from `uploadVisitReportAttachment`. |
| Engine | `CLAMAV_SCAN_URL` (configurable; expected to point at a `clamav-rest`-style HTTP shim). |
| Auth | `CLAMAV_SCAN_TOKEN` sent as `Authorization: Bearer <token>` if present. |
| `scan_status` lifecycle | `pending` → (`clean` \| `infected` \| `error` \| `skipped`). |
| `clean` | Bytes remain in storage; downloads work normally. |
| `infected` | Bytes are deleted from storage immediately. Metadata row is retained with `scan_signature` populated for audit. Downloads short-circuit with a quarantine message. |
| `error` | Bytes remain in storage; downloads short-circuit with a "scan failed" message. Operator must investigate (see §7). |
| `skipped` | `CLAMAV_SCAN_URL` was empty (typically local dev / preview). Downloads behave like `clean`. Production deployments must set the env var. |
| Retry | `retryPendingAttachmentScans()` re-invokes the function for rows where `scan_status='pending'` and `created_at < now() - interval '5 minutes'`. |

### Operational caveat — `skipped` in non-production environments

Local development, preview deployments, and test environments are expected to
omit `CLAMAV_SCAN_URL`. In those environments uploads still succeed and
downloads still work. Production deploys MUST set both
`CLAMAV_SCAN_URL` and `CLAMAV_SCAN_TOKEN` (verified by the deployment
checklist).

## 6. Upload UI affordances

The authoring UI surfaces:

- A static helper line above the Upload button:
  *"Max 10 MB · PDF, Word, Excel, images (PNG / JPG / GIF / WebP), TXT, CSV · up to 25 files per report"*.
  Values are read from `lib/visit-report-attachments-policy.ts` so they cannot
  drift from the server.
- Pre-flight client checks (size, MIME / extension, count) so users get an
  immediate error toast for obvious failures without a round-trip.
- Per-row scan badge:
  - `pending` — muted "Scanning…" with a spinner.
  - `clean` / `skipped` — no badge.
  - `infected` — destructive "Quarantined" badge; Download button is hidden;
    Delete is still available so the author can clean up the row.
  - `error` — warning "Scan error" badge with tooltip linking to this doc.
- Lightweight 10 s polling (`router.refresh()`) while any attachment is still
  `pending`, so the badge resolves without a manual reload.

## 7. Operations playbook

### A row is stuck in `scan_status='pending'`

1. Confirm the Edge Function `scan-visit-report-attachment` is deployed:
   `supabase functions list`.
2. Tail logs: `supabase functions logs scan-visit-report-attachment --tail`.
3. Verify env vars: `CLAMAV_SCAN_URL`, `CLAMAV_SCAN_TOKEN`,
   `SUPABASE_SERVICE_ROLE_KEY` are set on the function.
4. Manually re-drive: call `retryPendingAttachmentScans()` from a server action
   smoke script or from the Admin UI button.

### A row is in `scan_status='error'`

1. Read `scan_error` on the row to see the verdict from the engine
   (HTTP error string, timeout, parse error).
2. If transient, run `retryPendingAttachmentScans()`.
3. If persistent (engine misconfigured, payload too large for the engine), fix
   the engine and re-run.

### A row is in `scan_status='infected'`

1. The bytes have already been removed from storage. The metadata row remains.
2. Capture `scan_signature`, `uploaded_by`, `trip_report_id`, `created_at` for
   the security log.
3. Notify the uploader's admin contact per the company incident-response
   policy.
4. Decide whether to delete the metadata row (`deleteVisitReportAttachment`) or
   keep it as audit evidence — typically keep for at least the retention window
   of the parent trip report.

### Storage RLS drift

If anyone adds an `UPDATE` policy on `storage.objects` for this bucket, the
"no in-place mutation" invariant breaks and the Part 11 content hashes for
signed reports are no longer reliable for attachments. The drift detection is
currently manual; reviewers must flag any `CREATE POLICY ... ON storage.objects`
that names this bucket in PR review.

## 8. Residual risks (not addressed in this audit)

- **Signed URL forwarding**: a 1-hour signed URL forwarded to a non-permitted
  user is still valid for the remainder of its TTL. Mitigation requires
  shorter TTLs and/or per-request authorization, tracked separately.
- **AV evasion**: ClamAV is a baseline scanner; sophisticated evasion is
  possible. Layering a second engine or a sandbox is out of scope for v1.
- **Disclosure via metadata**: `file_name` is user-supplied and can leak
  PHI in the filename. The product does not currently sanitize filenames; this
  is acknowledged and tracked in the broader PHI handling backlog.
