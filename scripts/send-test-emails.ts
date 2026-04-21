/**
 * One-off script to send all 6 transactional email templates to a test inbox.
 *
 * Usage:
 *   TEST_EMAIL_TO="you@example.com" pnpm exec tsx scripts/send-test-emails.ts
 *
 * Reads RESEND_API_KEY (and optional RESEND_FROM_EMAIL) from .env.local.
 * Bypasses lib/email/send.ts so this can run outside Next.js (no server-only,
 * no Supabase admin client, no email_log writes).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement as h } from 'react';
import { render } from '@react-email/render';
// Standalone test script intentionally bypasses lib/email (which depends on
// server-only, the Supabase admin client, and email_log writes that require a
// Next.js runtime). See header comment for context.
// eslint-disable-next-line no-restricted-imports
import { Resend } from 'resend';

import { InviteUser } from '@/emails/invite-user';
import { ReportApproved } from '@/emails/report-approved';
import { ReportReturned } from '@/emails/report-returned';
import { ReportSubmitted } from '@/emails/report-submitted';
import { ReviewerAssigned } from '@/emails/reviewer-assigned';

loadDotEnv('.env.local');

const TO_RAW = process.env.TEST_EMAIL_TO;
if (!TO_RAW) {
  console.error('TEST_EMAIL_TO env var is required.');
  process.exit(1);
}
/** Narrowed recipient — `process.exit` above is not always treated as never by the type checker in nested closures. */
const TO: string = TO_RAW;

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('RESEND_API_KEY is not set in .env.local.');
  process.exit(1);
}

const FROM = process.env.RESEND_FROM_EMAIL || 'Trialetics <onboarding@resend.dev>';
const resend = new Resend(apiKey);

const acceptUrl =
  'https://app.trialetics.io/auth/confirm?token_hash=preview&type=invite';
const reportUrl =
  'https://app.trialetics.io/protected/studies/study-1/trip-reports/visit-1/author';

interface SendSpec {
  label: string;
  subject: string;
  template: ReturnType<typeof h>;
}

const specs: SendSpec[] = [
  {
    label: '1/6 Invite (study + role)',
    subject: '[TEST] You are invited to Trialetics',
    template: h(InviteUser, {
      inviteeFirstName: 'Reggie',
      inviterName: 'Casey Walton',
      companyName: 'Trialetics',
      studyLabel: 'TRI-DEMO-204',
      roleLabel: 'Clinical Project Manager',
      acceptUrl,
    }),
  },
  {
    label: '2/6 Invite (no study)',
    subject: '[TEST] You are invited to Trialetics (no study)',
    template: h(InviteUser, {
      inviteeFirstName: '',
      inviterName: 'Casey Walton',
      companyName: 'Trialetics',
      studyLabel: null,
      roleLabel: null,
      acceptUrl,
    }),
  },
  {
    label: '3/6 Trip report submitted',
    subject: '[TEST] Trip report submitted - TRI-DEMO-204 / Site 042',
    template: h(ReportSubmitted, {
      studyLabel: 'TRI-DEMO-204',
      siteLabel: 'Site 042 - Boston General',
      visitTypeLabel: 'Interim Monitoring Visit',
      visitDate: 'Apr 18, 2026',
      authorName: 'Jordan Kim',
      reportUrl,
    }),
  },
  {
    label: '4/6 Trip report returned',
    subject: '[TEST] Trip report returned - TRI-DEMO-204 / Site 042',
    template: h(ReportReturned, {
      studyLabel: 'TRI-DEMO-204',
      siteLabel: 'Site 042 - Boston General',
      visitTypeLabel: 'Interim Monitoring Visit',
      visitDate: 'Apr 18, 2026',
      returnedByName: 'Casey Walton',
      reviewerComment:
        'Please clarify the SDV numbers in section 3 and re-attach the updated source data verification log.',
      reportUrl,
    }),
  },
  {
    label: '5/6 Trip report approved',
    subject: '[TEST] Trip report approved - TRI-DEMO-204 / Site 042',
    template: h(ReportApproved, {
      studyLabel: 'TRI-DEMO-204',
      siteLabel: 'Site 042 - Boston General',
      visitTypeLabel: 'Interim Monitoring Visit',
      visitDate: 'Apr 18, 2026',
      authorName: 'Jordan Kim',
      approvedAt: 'Apr 19, 2026',
      reportUrl,
    }),
  },
  {
    label: '6/6 Reviewer assigned',
    subject: '[TEST] You were assigned as reviewer - TRI-DEMO-204 / Site 042',
    template: h(ReviewerAssigned, {
      studyLabel: 'TRI-DEMO-204',
      siteLabel: 'Site 042 - Boston General',
      visitTypeLabel: 'Interim Monitoring Visit',
      visitDate: 'Apr 18, 2026',
      authorName: 'Jordan Kim',
      reportUrl,
    }),
  },
];

async function main() {
  console.log(`Sending ${specs.length} test emails`);
  console.log(`  from: ${FROM}`);
  console.log(`  to:   ${TO}`);
  console.log('');

  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];
    const html = await render(spec.template);
    const text = await render(spec.template, { plainText: true });
    const result = await resend.emails.send({
      from: FROM,
      to: TO,
      subject: spec.subject,
      html,
      text,
    });
    if (result.error) {
      console.error(`  [FAIL] ${spec.label}: ${result.error.message}`);
    } else {
      console.log(`  [OK]   ${spec.label}  id=${result.data?.id ?? 'n/a'}`);
    }
    // Resend free tier caps at 5 requests/sec. Space sends ~300ms apart.
    if (i < specs.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log('');
  console.log('Done.');
}

function loadDotEnv(path: string): void {
  let content: string;
  try {
    content = readFileSync(resolve(process.cwd(), path), 'utf8');
  } catch {
    return;
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
