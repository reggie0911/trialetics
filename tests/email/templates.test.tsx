import { render } from '@react-email/render';
import { describe, expect, it } from 'vitest';

import { InviteUser } from '@/emails/invite-user';
import { ReportApproved } from '@/emails/report-approved';
import { ReportReturned } from '@/emails/report-returned';
import { ReportSubmitted } from '@/emails/report-submitted';
import { ReviewerAssigned } from '@/emails/reviewer-assigned';

const acceptUrl = 'https://app.trialetics.io/auth/confirm?token_hash=test&type=invite';
const reportUrl =
  'https://app.trialetics.io/protected/studies/study-1/trip-reports/visit-1/author';

async function renderBoth(node: Parameters<typeof render>[0]) {
  const html = await render(node);
  const text = await render(node, { plainText: true });
  return { html, text };
}

describe('email templates', () => {
  it('renders InviteUser with study + role context and CTA url', async () => {
    const node = (
      <InviteUser
        inviteeFirstName="Jordan"
        inviterName="Reggie Walton"
        companyName="Trialetics"
        studyLabel="TRI-DEMO-204"
        roleLabel="Clinical Project Manager"
        acceptUrl={acceptUrl}
      />
    );
    const { html, text } = await renderBoth(node);
    expect(html).toContain(`href="${acceptUrl.replace(/&/g, '&amp;')}"`);
    expect(html).toContain('alt="Trialetics"');
    expect(text).toContain("You're invited to Trialetics");
    expect(text).toContain('Reggie Walton');
    expect(text).toContain('TRI-DEMO-204');
    expect(text).toContain('Clinical Project Manager');
    expect(html).toContain('Accept invitation');
    expect(html).toMatchSnapshot();
  });

  it('renders InviteUser without study assignment', async () => {
    const node = (
      <InviteUser
        inviteeFirstName=""
        inviterName="Reggie Walton"
        companyName="Trialetics"
        studyLabel={null}
        roleLabel={null}
        acceptUrl={acceptUrl}
      />
    );
    const { html, text } = await renderBoth(node);
    expect(text).toContain("You're invited to Trialetics");
    expect(text).toContain('Reggie Walton added you to Trialetics on Trialetics');
    expect(html).toContain(`href="${acceptUrl.replace(/&/g, '&amp;')}"`);
  });

  it('renders ReportSubmitted with study + site + visit context', async () => {
    const node = (
      <ReportSubmitted
        studyLabel="TRI-DEMO-204"
        siteLabel="Site 042 - Boston General"
        visitTypeLabel="Interim Monitoring Visit"
        visitDate="Apr 18, 2026"
        authorName="Jordan Kim"
        reportUrl={reportUrl}
      />
    );
    const { html, text } = await renderBoth(node);
    expect(text).toContain('Site 042 - Boston General');
    expect(text).toContain('Interim Monitoring Visit');
    expect(text).toContain('Jordan Kim');
    expect(html).toContain(`href="${reportUrl}"`);
    expect(html).toContain('Review report');
    expect(html).toMatchSnapshot();
  });

  it('renders ReportReturned with reviewer comment', async () => {
    const comment = 'Please clarify the SDV numbers in section 3.';
    const node = (
      <ReportReturned
        studyLabel="TRI-DEMO-204"
        siteLabel="Site 042 - Boston General"
        visitTypeLabel="Interim Monitoring Visit"
        visitDate="Apr 18, 2026"
        returnedByName="Reggie Walton"
        reviewerComment={comment}
        reportUrl={reportUrl}
      />
    );
    const { html, text } = await renderBoth(node);
    expect(text).toContain(comment);
    expect(text).toContain('Reggie Walton returned your trip report');
    expect(html).toContain(`href="${reportUrl}"`);
    expect(html).toContain('Open report');
    expect(html).toMatchSnapshot();
  });

  it('renders ReportApproved with approval date', async () => {
    const node = (
      <ReportApproved
        studyLabel="TRI-DEMO-204"
        siteLabel="Site 042 - Boston General"
        visitTypeLabel="Interim Monitoring Visit"
        visitDate="Apr 18, 2026"
        authorName="Jordan Kim"
        approvedAt="Apr 19, 2026"
        reportUrl={reportUrl}
      />
    );
    const { html, text } = await renderBoth(node);
    expect(text).toContain('approved and signed on Apr 19, 2026');
    expect(html).toContain('View approved report');
    expect(html).toContain(`href="${reportUrl}"`);
    expect(html).toMatchSnapshot();
  });

  it('renders ReviewerAssigned with study + site context', async () => {
    const node = (
      <ReviewerAssigned
        studyLabel="TRI-DEMO-204"
        siteLabel="Site 042 - Boston General"
        visitTypeLabel="Interim Monitoring Visit"
        visitDate="Apr 18, 2026"
        authorName="Jordan Kim"
        reportUrl={reportUrl}
      />
    );
    const { html, text } = await renderBoth(node);
    expect(text).toContain('You have been assigned as the reviewer');
    expect(html).toContain('Open report for review');
    expect(html).toContain(`href="${reportUrl}"`);
    expect(html).toMatchSnapshot();
  });
});
