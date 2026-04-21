import { Section, Text } from '@react-email/components';

import { CtaButton } from './_components/cta-button';
import { EmailLayout, emailColors } from './_components/layout';
import { ReportMeta } from './_components/report-meta';

export interface ReviewerAssignedProps {
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

export function ReviewerAssigned({
  studyLabel,
  siteLabel,
  visitTypeLabel,
  visitDate,
  authorName,
  reportUrl,
}: ReviewerAssignedProps) {
  return (
    <EmailLayout
      preview={`You were assigned as reviewer - ${studyLabel} / ${siteLabel}`}
    >
      <Text style={paragraph}>
        You have been assigned as the reviewer for a trip report.
      </Text>
      <ReportMeta
        studyLabel={studyLabel}
        siteLabel={siteLabel}
        visitTypeLabel={visitTypeLabel}
        visitDate={visitDate}
        authorName={authorName}
      />
      <Section style={{ margin: '8px 0 4px' }}>
        <CtaButton href={reportUrl}>Open report for review</CtaButton>
      </Section>
    </EmailLayout>
  );
}

ReviewerAssigned.PreviewProps = {
  studyLabel: 'TRI-DEMO-204',
  siteLabel: 'Site 042 - Boston General',
  visitTypeLabel: 'Interim Monitoring Visit',
  visitDate: 'Apr 18, 2026',
  authorName: 'Jordan Kim',
  reportUrl:
    'https://app.trialetics.io/protected/studies/preview/trip-reports/preview/author',
} satisfies ReviewerAssignedProps;

export default ReviewerAssigned;
