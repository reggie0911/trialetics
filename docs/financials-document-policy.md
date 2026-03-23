# Financials document uploads (contracts & invoices)

## Storage

- **Bucket:** `finance-documents` (private).
- **Object path:** `{company_id}/{...}` — first segment must match the signed-in user’s company.
- **Allowed MIME types (enforced in bucket):** PDF, PNG, JPEG, Word (DOCX).
- **Max size:** 50 MB per object (configured on the bucket).

## Retention and malware

- **Retention:** Align file retention with your sponsor / QA policy for trial records; this app does not auto-delete financial files.
- **Malware:** Prefer scanning uploads in your organization’s pipeline; the app does not run antivirus on upload in v1.

## RLS

- Access is scoped by `company_id` in the storage policy. Do not share object URLs outside the tenant.

## Next steps (optional)

- Hook invoice/contract rows (`financial_contracts.storage_path`, future invoice attachment column) to signed URLs from this bucket.
- Add server action to request a signed upload URL with a generated key under `{company_id}/studies/{study_id}/...`.
