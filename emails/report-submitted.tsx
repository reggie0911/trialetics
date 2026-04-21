import { Section, Text } from '@react-email/components';

import { CtaButton } from './_components/cta-button';
import { EmailLayout, emailColors } from './_components/layout';
import { ReportMeta } from './_components/report-meta';

export interface ReportSubmittedProps {
  studyLabel: string;
  siteLabel: string;
  visitTypeLabel: string;
  visitDate: string | null;
  authorName: string | null;
  reportUrl: string;
}

const paragraph = {
  color: emailColors.textPrimary,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px',
};

const muted = {
  color: emailColors.textMuted,
  fontSize: '12px',
  lineHeight: '18px',
  margin: '12px 0 0',
};

export function ReportSubmitted({
  studyLabel,
  siteLabel,
  visitTypeLabel,
  visitDate,
  authorName,
  reportUrl,
}: ReportSubmittedProps) {
  return (
    <EmailLayout
      preview={`Trip report submitted for review - ${studyLabel} / ${siteLabel}`}
    >
      <Text style={paragraph}>
        A trip report has been submitted for your review.
      </Text>
      <ReportMeta
        studyLabel={studyLabel}
        siteLabel={siteLabel}
        visitTypeLabel={visitTypeLabel}
        visitDate={visitDate}
        authorName={authorName}
      />
      <Section style={{ margin: '8px 0 4px' }}>
        <CtaButton href={reportUrl}>Review report</CtaButton>
      </Section>
      <Text style={muted}>
        You are receiving this because you are a Clinical Project Manager on
        this study or the assigned reviewer for this report.
      </Text>
    </EmailLayout>
  );
}

ReportSubmitted.PreviewProps = {
  studyLabel: 'TRI-DEMO-204',
  siteLabel: 'Site 042 - Boston General',
  visitTypeLabel: 'Interim Monitoring Visit',
  visitDate: 'Apr 18, 2026',
  authorName: 'Jordan Kim',
  reportUrl:
    'https://app.trialetics.io/protected/studies/preview/trip-reports/preview/author',
} satisfies ReportSubmittedProps;

export default ReportSubmitted;
