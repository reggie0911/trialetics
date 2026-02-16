// Dashboard metrics types for tracker KPIs and site heatmap

export interface MetricStat {
  label: string;
  value: string | number;
  highlight?: boolean;
  delta?: number;
}

export type MetricStatus = "success" | "warning" | "danger";

export interface DashboardModuleMetric {
  id: string;
  title: string;
  status: MetricStatus;
  stats: MetricStat[];
  detailsLink: string;
  hasData: boolean;
}

export interface DashboardTrackerMetrics {
  ae: {
    totalAEs: number;
    totalSAEs: number;
    totalResolved: number;
    deaths: number;
    percentResolved: number;
    hasData: boolean;
  };
  mc: {
    totalMeds: number;
    missingStartDate: number;
    startDateUnknown: number;
    missingStopDate: number;
    missingDoseOrUnit: number;
    invalidFreq: number;
    partialData: number;
    hasData: boolean;
  };
  vw: {
    totalSubjects: number;
    activeFollowUps: number;
    alertRate: string;
    hasData: boolean;
  };
  ecrf: {
    totalQueries: number;
    openQueries: number;
    closedQueries: number;
    resolvedQueries: number;
    overdue: number;
    queriesPerSubject: string;
    queriesPerVisit: string;
    missingDataCount: number;
    avgResolutionTime: number;
    hasData: boolean;
  };
  sdv: {
    sdvPercent: number;
    totalItems: number;
    verifiedItems: number;
    totalSites: number;
    totalSubjects: number;
    hasData: boolean;
  };
  patients: {
    totalPatients: number;
    hasData: boolean;
  };
  documents: {
    totalDocuments: number;
    approvedDocuments: number;
    documentsPendingApproval: number;
    expiredDocuments: number;
    hasData: boolean;
  };
}

export interface SiteMetrics {
  siteNumber: string;
  studyName: string;
  siteName: string;
  isCompliant: boolean;
  crfsVerified: number;
  openQueries: number;
  answeredQueries: number;
  sdvPercentage: number;
}
