import { Section, Text } from '@react-email/components';

import { CtaButton } from './_components/cta-button';
import { EmailLayout, emailColors } from './_components/layout';
import { ReportMeta } from './_components/report-meta';

export interface ReportApprovedProps {
  studyLabel: string;
  siteLabel: string;
  visitTypeLabel: string;
  visitDate: string | null;
  authorName: string | null;
  approvedAt: string;
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

export function ReportApproved({
  studyLabel,
  siteLabel,
  visitTypeLabel,
  visitDate,
  authorName,
  approvedAt,
  reportUrl,
}: ReportApprovedProps) {
  return (
    <EmailLayout
      preview={`Trip report approved - ${studyLabel} / ${siteLabel}`}
    >
      <Text style={paragraph}>
        A trip report has been approved and signed on {approvedAt}.
      </Text>
      <ReportMeta
        studyLabel={studyLabel}
        siteLabel={siteLabel}
        visitTypeLabel={visitTypeLabel}
        visitDate={visitDate}
        authorName={authorName}
      />
      <Section style={{ margin: '8px 0 4px' }}>
        <CtaButton href={reportUrl}>View approved report</CtaButton>
      </Section>
      <Text style={muted}>
        The official PDF is available from the trip report page.
      </Text>
    </EmailLayout>
  );
}

ReportApproved.PreviewProps = {
  studyLabel: 'TRI-DEMO-204',
  siteLabel: 'Site 042 - Boston General',
  visitTypeLabel: 'Interim Monitoring Visit',
  visitDate: 'Apr 18, 2026',
  authorName: 'Jordan Kim',
  approvedAt: 'Apr 19, 2026',
  reportUrl:
    'https://app.trialetics.io/protected/studies/preview/trip-reports/preview/author',
} satisfies ReportApprovedProps;

export default ReportApproved;
