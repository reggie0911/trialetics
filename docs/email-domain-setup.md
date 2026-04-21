# Email sending domain setup (Resend)

All transactional email is sent through [Resend](https://resend.com) by the
single `sendEmail` helper in [`lib/email/send.ts`](../lib/email/send.ts).
Before the production cutover, the sending domain must be verified in the
Resend dashboard with SPF, DKIM, and DMARC DNS records. Until then sends
fall back to a Resend-owned domain - acceptable for dev, **blocking for
production**.

## Domains

| Environment | Sending domain    | `From` address                       |
| ----------- | ----------------- | ------------------------------------ |
| Production  | `trialetics.io`   | `Trialetics <noreply@trialetics.io>` |
| Staging     | `trialetics.io` (same account, separate API key) | same |
| Local dev   | n/a (Resend default) | same `From`, but Resend rewrites |

The `From` address is set by `RESEND_FROM_EMAIL` and defaults to
`Trialetics <noreply@trialetics.io>`.

## One-time DNS setup

1. In the Resend dashboard go to **Domains** -> **Add Domain** and enter
   `trialetics.io`. Resend will display the DNS records you must add.
2. In the DNS provider for `trialetics.io`, add the records below. Use the
   exact values displayed in the Resend dashboard - the placeholder
   suffixes shown here are illustrative.

   | Type  | Name                        | Value (example)                                                       | Notes                          |
   | ----- | --------------------------- | --------------------------------------------------------------------- | ------------------------------ |
   | TXT   | `send.trialetics.io`        | `v=spf1 include:amazonses.com ~all`                                   | SPF (Resend uses Amazon SES)   |
   | TXT   | `resend._domainkey.trialetics.io` | (long DKIM public key from Resend)                              | DKIM                           |
   | MX    | `send.trialetics.io`        | `feedback-smtp.us-east-1.amazonses.com` (priority 10)                 | Bounce processing              |
   | TXT   | `_dmarc.trialetics.io`      | `v=DMARC1; p=none; rua=mailto:dmarc@trialetics.io`                    | Start with `p=none`, monitor reports for 2-4 weeks, then move to `p=quarantine` and finally `p=reject` once aligned. |

3. Wait for DNS propagation (usually <1 hour, sometimes up to 24h) and
   click **Verify** in the Resend dashboard. All four records should show
   green.
4. Capture a screenshot of the verified state and store it next to this
   file (or in the team password manager) for the audit trail.

## App configuration

After the domain is verified, set the following secrets in each environment:

| Variable                  | Required | Notes                                                                                                                                |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `RESEND_API_KEY`          | Yes      | API key from Resend dashboard. Without it, `sendEmail` no-ops and writes a `status='skipped'` row to `email_log`.                    |
| `RESEND_FROM_EMAIL`       | No       | Defaults to `Trialetics <noreply@trialetics.io>`. Override per-environment if you want, e.g. `Trialetics Staging <noreply@stg...>`. |
| `EMAIL_REPLY_TO_DEFAULT`  | Yes      | Fallback Reply-To for trip-report notifications when no study mailbox is configured. Recommended: `support@trialetics.io`.           |
| `NEXT_PUBLIC_SITE_URL`    | Yes      | Used by all CTA links in templates. Must be the public origin (e.g. `https://app.trialetics.io`), no trailing slash.                 |

## Local preview workflow

```bash
pnpm email:dev          # opens http://localhost:3000 with all templates
pnpm test tests/email   # runs the 6 snapshot tests in tests/email/
```

`PreviewProps` on each template (in `emails/*.tsx`) drives the preview
server; keep them in sync with the real prop shapes so designers can review
realistic content.

## Verification checklist (production cutover)

- [ ] DNS: SPF, DKIM, DMARC records live and verified in Resend dashboard.
- [ ] DMARC report monitoring inbox set up (`dmarc@trialetics.io`).
- [ ] `RESEND_API_KEY`, `EMAIL_REPLY_TO_DEFAULT`, `NEXT_PUBLIC_SITE_URL`
      configured in Vercel (or equivalent) for the prod environment.
- [ ] Manual test: invite a user from the Team page; confirm the email
      lands in the inbox (not Spam) and the SPF/DKIM/DMARC headers in the
      raw message all show `pass`.
- [ ] Manual test: submit + approve a trip report in dev, confirm the
      `email_log` table records both sends with `status='sent'`, the
      correct `idempotency_key`, and `bcc_addresses` populated for the
      CPM list.

## Rotating or revoking keys

- Generate a new `RESEND_API_KEY` in the dashboard, deploy with both keys
  briefly (the helper only reads one - just swap and redeploy), then
  revoke the old key.
- If a key is suspected leaked, revoke immediately. `sendEmail` will
  no-op (skip with audit row) until a new key is configured, no errors
  bubble to user-facing actions.
