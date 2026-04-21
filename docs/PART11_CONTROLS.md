# 21 CFR Part 11 — Trip Report Electronic Signature Controls

This document maps each technical control we implement for trip-report
electronic signatures to the corresponding 21 CFR Part 11 clause and
points to the file, migration, or test that evidences it. It is the
companion artifact to [`REPORT_SUBMISSION_APPROVAL_WORKFLOW.md`](./REPORT_SUBMISSION_APPROVAL_WORKFLOW.md)
and is the document a regulator (or internal QA) should reach for when
asking *"how do you satisfy 11.10 / 11.50 / 11.70 / 11.300?"*.

> Scope: this document covers signing actions on `trip_reports` —
> author submission (`submitReport`), reviewer approval (`approveReport`),
> and admin void (`voidApproval`). Other electronic-record systems in
> the platform may or may not be Part-11 scoped; do not extrapolate.

---

## Quick reference

| Clause | Requirement | Where it lives |
|---|---|---|
| 11.10(a) — System validation | Validated workflow with documented controls and tests | This doc + `lib/actions/visit-reports-part11.test.ts`, `lib/visit-report-signature.test.ts` |
| 11.10(b) — Accurate copies | PDF + on-screen rendering reflect the signed record verbatim | `components/ctms/trip-reports/visit-report-pdf-document.tsx`, `lib/utils/build-visit-report-pdf-data.ts` |
| 11.10(c) — Record retention | Signed columns are persisted; audit tables are append-only | Migration `20260602000000_trip_report_part11_controls.sql` |
| 11.10(d) — Limit access to authorized individuals | RBAC + RLS on `trip_reports` writes | `lib/visit-report-permissions.ts`, RLS in `20260602000000_*.sql` |
| 11.10(e) — Secure, computer-generated, time-stamped audit trail | Server-side timestamps + append-only audit table + immutability triggers | `trip_report_signature_audit`, `tg_trip_report_signature_audit_immutable`, `tg_trip_report_status_events_immutable` |
| 11.10(f) — Operational checks | Status machine prevents out-of-sequence signing | `submitReport` / `approveReport` status guards; trigger `tg_trip_reports_lock_signed_columns` |
| 11.10(g) — Authority checks | Author / Reviewer / Admin gates | `assertReportAuthorPermission`, `assertReportReviewerPermission`, `getProfileRole` |
| 11.10(k) — Documentation controls | This doc, plus inline JSDoc on signing actions | `docs/PART11_CONTROLS.md`, `lib/actions/visit-reports.ts` |
| 11.50(a)(1) — Printed name of signer | Typed printed name captured & validated against profile | `signature-capture-modal.tsx` (UI), `namesMatch` (validator), `*_printed_name` columns |
| 11.50(a)(2) — Date and time of signing | Server-generated `*_signed_at_db` (NOT trusted from client) | `submitReport` / `approveReport` use `new Date().toISOString()` |
| 11.50(a)(3) — Meaning of signature | Canonical attestation paragraph captured verbatim per role | `lib/visit-report-signature-attestations.ts`, `*_attestation_text` columns |
| 11.50(b) — Manifestations on display & print | Printed name + attestation + server timestamp + content hash on screen and in PDF | `digital-signature-block.tsx`, PDF `PdfDigitalSignatureBlock` |
| 11.70 — Signature/record linking | SHA-256 over canonical content payload, stored on the signing row | `computeReportContentHash`, `*_content_hash` columns |
| 11.100(a) — Unique to one individual | Signatures key off `actor_profile_id` (FK to `profiles`); one user account per individual is a Supabase Auth invariant | `trip_report_signature_audit.actor_profile_id` |
| 11.100(b) — Verified identity before allocation | Account creation goes through invitation + admin approval (out of scope of this doc; see Auth flow) | `lib/auth/*` |
| 11.200(a)(1)(i) — Two distinct identification components for first signing of a session | Email (session) + password (challenge), challenged at every sign | `assertPasswordReverified` re-runs `signInWithPassword` per signature |
| 11.200(a)(1)(ii) — Subsequent signings reuse one component, but only if the session is continuous | Per-report flow requires BOTH components on every signing (exceeds the minimum). Bulk-approve flow uses the §11.200(a)(1)(ii) allowance: one credential challenge, then per-record manifestations stamped with a shared `signing_session_id`. | `approveReportsBulk` in `lib/actions/visit-reports.ts`; migration `20260603000000_trip_report_signature_session.sql` |
| 11.200(a)(2) — Used only by their genuine owners | Password challenge cannot be bypassed; client-side check is UX-only | `assertPasswordReverified` is server-side and runs before any write |
| 11.200(a)(3) — Designed such that attempted use by anyone other than genuine owner requires collaboration of two or more individuals | Password is private to the user; admin cannot impersonate to sign | Supabase Auth + `assertPasswordReverified` |
| 11.300(a) — Uniqueness of each combined identification code and password | Supabase Auth enforces email uniqueness | Supabase Auth |
| 11.300(b) — Periodically check, recall, or revise codes/passwords | Out of scope of this module — see Supabase Auth password policy | n/a |
| 11.300(d) — Use transaction safeguards to prevent unauthorized use of passwords | Server-side reverification with generic error message; no enumeration leak | `assertPasswordReverified` returns a single generic error |

---

## Control-by-control walkthrough

### 1. Capture (UI)

The signer is presented with three required fields in
`components/ctms/trip-reports/signature-capture-modal.tsx`:

1. A signature pad (visual mark, retained on `*_signature_data` for
   backwards-compat with prior reports).
2. A **printed name** input — the user must type their full legal name.
3. A **password** input — re-challenged on every signing.
4. A read-only display of the canonical **attestation paragraph** for
   the role being signed (`TRIP_REPORT_AUTHOR_ATTESTATION`,
   `TRIP_REPORT_APPROVER_ATTESTATION`, or `TRIP_REPORT_VOID_ATTESTATION`)
   plus a checkbox the user must tick to acknowledge it.

The same constants are imported by both the client modal and the server
action via `lib/visit-report-signature-attestations.ts`, so a divergence
between what the user sees and what the server validates is impossible.

### 2. Server-side validation (the source of truth)

Inside `submitReport` / `approveReport` (`lib/actions/visit-reports.ts`):

| Step | Helper | Purpose | Failure mode |
|---|---|---|---|
| 1 | (inline) | Reject empty signature image | Returns "Electronic signature is required..." |
| 2 | (inline) | Reject empty printed name | Returns "Please type your full legal name to sign." |
| 3 | (inline) byte-equal compare | Attestation text matches the constant | Returns "Attestation text does not match..." |
| 4 | `loadSignerIdentity` | Resolve profile from current Supabase session | Returns "No profile found." |
| 5 | `assertReportAuthorPermission` / `assertReportReviewerPermission` | RBAC | Returns role-specific error |
| 6 | `assertPasswordReverified` | 11.200/11.300 password challenge | Returns generic "Incorrect password..." |
| 7 | `namesMatch` | 11.50 printed-name validation against profile | Returns "The name you typed does not match..." |
| 8 | `computeReportContentHash` | 11.70 record/signature linking | Returns underlying error |
| 9 | `update trip_reports SET ...` | Persist signed columns + server `signed_at_db` | Hard-fails the action |
| 10 | `logTripReportSignatureAudit` | 11.10(e) audit row | **Hard-fails** the entire action so a signed record without its audit row is impossible |
| 11 | `logTripReportStatusEvent` | Workflow audit row | Best-effort (logged, does not roll back the signature) |

Tests covering each gate live in `lib/actions/visit-reports-part11.test.ts`.

### 3. Persistence

Migration `supabase/migrations/20260602000000_trip_report_part11_controls.sql`
adds:

- **`trip_reports.author_submission_*` and `approval_*` columns**: the
  signing manifestation per 11.50:
  - `*_printed_name` (TEXT) — what the signer typed.
  - `*_attestation_text` (TEXT) — the canonical paragraph the signer
    bound themselves to.
  - `*_signed_at_db` (TIMESTAMPTZ DEFAULT `NOW()`) — server-generated
    timestamp; the legacy `*_signed_at` column is kept populated with
    the client-supplied value for back-compat but is **not** the
    source of truth.
  - `*_content_hash` (TEXT) — SHA-256 over the canonical signed
    payload (see `computeReportContentHash`).

- **`trip_report_signature_audit` table**: append-only audit row per
  signing event, with `kind ∈ {author_submit, approver_approve, void_approval}`,
  full attestation text, content hash, `password_verified`, and the
  request `ip_address` / `user_agent`. RLS allows
  company-scoped `SELECT` and **explicitly grants no `INSERT/UPDATE/DELETE`
  policies** to ordinary users; the only writer is the server action via
  the service-role admin client.

### 4. Immutability

Three triggers enforce append-only / post-sign-lock semantics at the
Postgres level so even an exploited service-role token cannot silently
edit history:

- `tg_trip_report_status_events_immutable` (BEFORE UPDATE OR DELETE on
  `trip_report_status_events`) — raises an exception unconditionally.
- `tg_trip_report_signature_audit_immutable` (BEFORE UPDATE OR DELETE on
  `trip_report_signature_audit`) — raises an exception unconditionally.
- `tg_trip_reports_lock_signed_columns` (BEFORE UPDATE on `trip_reports`)
  — when `OLD.report_status = 'approved_and_signed'`, raises an exception
  if any of the signed-content columns (narrative, reviewer section
  comments) or signature/approval columns change, **unless** the change
  is the void flow (status transitioning to `'returned'` and clearing
  the approval columns).

Combined with the tightened `trip_reports_update` RLS policy (added in
the same migration; restricts writes to study-team CRAs/CPMs and company
admins), this gives us defense-in-depth: app code, RLS, and triggers
all have to be wrong for an unauthorised content change to land.

### 5. Display

Both the in-app digital-signature block
(`components/ctms/trip-reports/digital-signature-block.tsx`) and the
PDF (`PdfDigitalSignatureBlock` in `visit-report-pdf-document.tsx`)
render, per 11.50(b):

- The printed name as typed.
- The full attestation paragraph.
- The server-side `*_signed_at_db` timestamp.
- The SHA-256 content hash so reviewers can cross-check.

For pre-migration reports without these columns, the components fall
back to the legacy `*_signature_data` / `*_signed_at` fields so historic
reports still render meaningfully. New signings always populate the
new columns.

### 6. Audit timeline UI

`components/ctms/trip-reports/trip-report-status-timeline-dialog.tsx`
fetches **both** `trip_report_status_events` and
`trip_report_signature_audit` rows via
`getTripReportAuditTimeline` and renders them interleaved by timestamp.
This is the user-facing surface for "show me the full provenance of
this signed report."

### 7. Continuous-session signing (bulk approve)

A CPM can select multiple `under_review` reports from the Review queue
and approve them with **one** credential challenge via the
`approveReportsBulk` action (`lib/actions/visit-reports.ts`). This is
the only place in the platform where we exercise §11.200(a)(1)(ii) —
"if executed during a single continuous period of controlled system
access, the first signing requires all components and subsequent
signings need execute at least one electronic signature component
that is only executable by, and designed to be used only by, the
individual."

How we satisfy the rule:

- **The challenge is still complete on the first signing.** Before any
  side effects, `approveReportsBulk` runs, exactly once per call, the
  same three checks the per-report flow runs: byte-equal attestation
  match against `TRIP_REPORT_APPROVER_ATTESTATION`, name match against
  the signer profile via `namesMatch`, and password reverification via
  `assertPasswordReverified` (server-side `signInWithPassword`
  round-trip). Failure of any of these aborts the whole batch with
  zero audit rows written.
- **Every subsequent signing in the batch is recorded as its own
  manifestation.** We do not "save one signature and apply it to N
  records." Per report, we compute a fresh `computeReportContentHash`,
  write the approval columns, and append a separate
  `trip_report_signature_audit` row with `kind = 'approver_approve'`,
  the canonical attestation text, and `password_verified = true`. The
  per-record §11.50 manifestation is preserved.
- **Every audit row in the batch carries a shared `signing_session_id`
  UUID** generated once via `crypto.randomUUID()` at the start of the
  action (added by migration
  `20260603000000_trip_report_signature_session.sql`). A regulator
  reviewing the audit table can re-tie any signed row in the batch to
  its siblings and to the single credential challenge that authorized
  them.
- **Single-report flows continue to write `signing_session_id = NULL`.**
  The column is partial-indexed `WHERE signing_session_id IS NOT NULL`
  so it costs nothing for the common case.

Failure isolation: per-report failures (wrong status, permission
mismatch, content hash error, write error) are surfaced in
`results: BulkApproveResult[]` per report; they never abort the rest
of the batch. The succeeded reports still share the same
`signing_session_id`, so a partial batch is still a valid continuous
session of the rows that did succeed.

Operational caps:

- **Maximum 50 reports per batch** (`APPROVE_REPORTS_BULK_MAX`). The
  CPM must see every record they are about to sign; no "select across
  pages."
- **Selection is page-scoped in the UI**
  (`components/ctms/trip-reports/trip-reports-page-client.tsx`) and is
  cleared on tab/page/filter/sort changes for the same reason.
- **One row in the audit append-only triggers blocks UPDATE / DELETE
  of any audit row** (added by migration
  `20260602000000_trip_report_part11_controls.sql`); the new
  `signing_session_id` column is bound by the same trigger, so the
  session id is set once at INSERT and is immutable thereafter.

Tests for this flow live in `lib/actions/visit-reports-bulk.test.ts`:
wholesale-rejection paths, happy-path session id sharing across N=3,
mixed-batch failure isolation (one wrong-status report does not abort
the rest), and per-report permission failure isolation.

---

## Test coverage matrix

| Concern | Test file | Test name |
|---|---|---|
| Printed-name validation (case/whitespace, blank rejects) | `lib/visit-report-signature.test.ts` | `namesMatch` |
| Password reverification — generic error on failure | `lib/visit-report-signature.test.ts` | `assertPasswordReverified` |
| Content hash — stable, content-sensitive, order-invariant | `lib/visit-report-signature.test.ts` | `computeReportContentHash` |
| Submit — printed name / attestation / password / name mismatch gates | `lib/actions/visit-reports-part11.test.ts` | `submitReport — Part 11 signing manifestations` |
| Submit — server timestamp + audit row + content hash on success | `lib/actions/visit-reports-part11.test.ts` | "writes server-side signed_at_db..." |
| Submit — audit failure rolls back the signing | `lib/actions/visit-reports-part11.test.ts` | "hard-fails when the audit row cannot be written" |
| Approve — wrong-role attestation rejected | `lib/actions/visit-reports-part11.test.ts` | `approveReport — Part 11 signing manifestations` |
| Void — clears approval columns and writes void audit | `lib/actions/visit-reports-part11.test.ts` | `voidApproval — clears approval columns and writes void audit` |
| Post-approval edit lock | `lib/actions/visit-reports-part11.test.ts` | `post-approval content lock` |
| Bulk approve — wholesale rejection on bad password / name / attestation / cap | `lib/actions/visit-reports-bulk.test.ts` | `approveReportsBulk — wholesale rejection paths` |
| Bulk approve — N audit rows share one `signing_session_id` per 11.200(a)(1)(ii) | `lib/actions/visit-reports-bulk.test.ts` | `approveReportsBulk — happy path` |
| Bulk approve — mixed batch and per-row permission failures do not abort the batch | `lib/actions/visit-reports-bulk.test.ts` | `approveReportsBulk — failure isolation across the batch` |

DB-level immutability triggers and the tightened RLS policy are
exercised by the migration tests in CI when the migration runs against
a fresh Postgres instance; they are documented here because they form
the last line of defense and a regulator will ask for them by name.

---

## 8. Visit-report attachment scanning

Visit-report attachments are uploaded into the private
`visit-report-attachments` bucket and are included verbatim in the
`computeReportContentHash` payload that becomes part of every Part 11
signature. To preserve hash integrity over the lifetime of a signed
report we maintain two invariants:

1. **Uploads are blocked once the report leaves
   `AUTHOR_EDIT_STATUSES`** (`report_pending`, `authoring`, `returned`).
   Both the application-layer `assertAuthorCanEditReport` and the
   storage-layer RLS policy in
   `supabase/migrations/20260604000000_visit_report_attachments_scan_and_rls.sql`
   enforce this. A signed report can never gain a new attachment.
2. **Attachments are immutable in storage** — the bucket has no
   `UPDATE` policy on `storage.objects`. Replacements happen via
   delete + insert, which is itself blocked once the report is signed
   (per invariant 1).

Newly uploaded attachments are scanned asynchronously by the
`scan-visit-report-attachment` Edge Function. Until the scan resolves,
`getAttachmentDownloadUrl` short-circuits with a "still being scanned"
message; infected files are removed from storage but the metadata row
is retained as audit evidence. Because of invariant 1, an infected
attachment can never appear on a *signed* report — the report cannot
be signed unless the attachment is already in `clean` (or `skipped` in
non-production) state, so a post-signing infection verdict is
impossible by construction.

See [`docs/VISIT_REPORT_ATTACHMENTS_SECURITY.md`](./VISIT_REPORT_ATTACHMENTS_SECURITY.md)
for the full threat model, RLS policy text, and operational playbook.

---

## Known gaps and conscious omissions

- **Periodic password rotation (11.300(b))**: deferred to Supabase Auth
  policy; no application-level enforcement.
- **Identity verification before account allocation (11.100(b))**: handled
  by the invitation/onboarding flow upstream of this module.
- **Biometric / smart card signing**: not implemented.
- **Signature on individual responses**: only the report as a whole is
  signed; per-question signatures are out of scope.
