import { Section, Text } from '@react-email/components';

import { CtaButton } from './_components/cta-button';
import { EmailLayout, emailColors } from './_components/layout';
import { ReportMeta } from './_components/report-meta';

export interface ReportReturnedProps {
  studyLabel: string;
  siteLabel: string;
  visitTypeLabel: string;
  visitDate: string | null;
  /** Name of the reviewer who returned it (best-effort, may be null). */
  returnedByName: string | null;
  /** Truncated comment from the reviewer (caller trims to ~240 chars). */
  reviewerComment: string | null;
  reportUrl: string;
}

const paragraph = {
  color: emailColors.textPrimary,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px',
};

const commentBlock = {
  backgroundColor: '#fffbeb',
  border: `1px solid #fde68a`,
  borderRadius: '6px',
  color: emailColors.textPrimary,
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 16px',
  padding: '12px 14px',
  whiteSpace: 'pre-wrap' as const,
};

export function ReportReturned({
  studyLabel,
  siteLabel,
  visitTypeLabel,
  visitDate,
  returnedByName,
  reviewerComment,
  reportUrl,
}: ReportReturnedProps) {
  const returnedBy = returnedByName?.trim() || 'A reviewer';

  return (
    <EmailLayout
      preview={`Trip report returned for corrections - ${studyLabel} / ${siteLabel}`}
    >
      <Text style={paragraph}>
        {returnedBy} returned your trip report and has requested corrections.
      </Text>
      <ReportMeta
        studyLabel={studyLabel}
        siteLabel={siteLabel}
        visitTypeLabel={visitTypeLabel}
        visitDate={visitDate}
      />
      {reviewerComment ? (
        <Text style={commentBlock}>{reviewerComment}</Text>
      ) : null}
      <Section style={{ margin: '8px 0 4px' }}>
        <CtaButton href={reportUrl}>Open report</CtaButton>
      </Section>
    </EmailLayout>
  );
}

ReportReturned.PreviewProps = {
  studyLabel: 'TRI-DEMO-204',
  siteLabel: 'Site 042 - Boston General',
  visitTypeLabel: 'Interim Monitoring Visit',
  visitDate: 'Apr 18, 2026',
  returnedByName: 'Reggie Walton',
  reviewerComment:
    'Please clarify the source-doc verification numbers in section 3 and re-attach the updated drug accountability log.',
  reportUrl:
    'https://app.trialetics.io/protected/studies/preview/trip-reports/preview/author',
} satisfies ReportReturnedProps;

export default ReportReturned;
