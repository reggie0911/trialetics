import type {
  DashboardTrackerMetrics,
  DashboardModuleMetric,
} from '@/lib/types/dashboard-metrics';

export function buildModuleMetricsFromTrackerData(
  metrics: DashboardTrackerMetrics,
  protocolId: string
): DashboardModuleMetric[] {
  const baseUrl = (path: string, withProtocol: boolean) =>
    `${path}${withProtocol ? `?protocolId=${protocolId}` : ''}`;

  const deriveStatus = (
    hasData: boolean,
    isWarning?: boolean,
    isDanger?: boolean
  ): 'success' | 'warning' | 'danger' => {
    if (!hasData) return 'success';
    if (isDanger) return 'danger';
    if (isWarning) return 'warning';
    return 'success';
  };

  return [
    {
      id: 'ae-metrics',
      title: 'AE Metrics',
      status: deriveStatus(metrics.ae.hasData),
      stats: [
        { label: 'Total AEs', value: metrics.ae.totalAEs },
        {
          label: 'Deaths',
          value: metrics.ae.deaths,
          highlight: metrics.ae.deaths > 0,
        },
        { label: '% Resolved', value: `${metrics.ae.percentResolved}%` },
      ],
      detailsLink: baseUrl('/protected/ae', true),
      hasData: metrics.ae.hasData,
    },
    {
      id: 'med-compliance',
      title: 'Med Compliance',
      status: deriveStatus(
        metrics.mc.hasData,
        metrics.mc.partialData > 0,
        metrics.mc.missingStartDate > 0
      ),
      stats: [
        { label: 'Total Meds', value: metrics.mc.totalMeds },
        {
          label: 'Missing Start Date',
          value: metrics.mc.missingStartDate,
          highlight: metrics.mc.missingStartDate > 0,
        },
        { label: 'Partial Data', value: metrics.mc.partialData },
      ],
      detailsLink: baseUrl('/protected/mc', true),
      hasData: metrics.mc.hasData,
    },
    {
      id: 'visit-window',
      title: 'Visit Window',
      status: deriveStatus(metrics.vw.hasData),
      stats: [
        { label: 'Total Subjects', value: metrics.vw.totalSubjects },
        { label: 'Active Follow-Ups', value: metrics.vw.activeFollowUps },
        { label: 'Alert Rate', value: metrics.vw.alertRate },
      ],
      detailsLink: baseUrl('/protected/vw', true),
      hasData: metrics.vw.hasData,
    },
    {
      id: 'ecrf-query-tracker',
      title: 'eCRF Query Tracker',
      status: deriveStatus(
        metrics.ecrf.hasData,
        metrics.ecrf.openQueries > 0,
        metrics.ecrf.overdue > 0
      ),
      stats: [
        { label: 'Total Queries', value: metrics.ecrf.totalQueries },
        {
          label: 'Open',
          value: metrics.ecrf.openQueries,
          highlight: metrics.ecrf.openQueries > 0,
        },
      ],
      detailsLink: baseUrl('/protected/ecrf-query-tracker', true),
      hasData: metrics.ecrf.hasData,
    },
    {
      id: 'sdv-tracker',
      title: 'SDV Tracker',
      status: deriveStatus(
        metrics.sdv.hasData,
        metrics.sdv.sdvPercent < 80 && metrics.sdv.sdvPercent > 0,
        metrics.sdv.sdvPercent < 50 && metrics.sdv.sdvPercent > 0
      ),
      stats: [
        { label: 'SDV %', value: `${Math.round(metrics.sdv.sdvPercent)}%` },
        { label: 'Total Items', value: metrics.sdv.totalItems },
        { label: 'Verified', value: metrics.sdv.verifiedItems },
      ],
      detailsLink: baseUrl('/protected/sdv-tracker', true),
      hasData: metrics.sdv.hasData,
    },
  ];
}
