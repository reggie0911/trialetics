// Compliance Scorecard Types

export interface CategoryScore {
  categoryId: string;
  categoryName: string;
  totalDocs: number;
  presentOnSite: number;
  presentInTMF: number;
  completionPercent: number;
}

export interface MissingDocument {
  documentId: string;
  documentName: string;
  categoryId: string;
  categoryName: string;
  siteId: string;
  siteName: string;
  missingFrom: "site" | "tmf" | "both";
}

export interface SiteComplianceScore {
  siteId: string;
  siteName: string;
  siteNumber: string;
  lastUpdated: string;
  totalDocuments: number;
  presentOnSite: number;
  presentInTMF: number;
  missingDocuments: number;
  overallCompletionPercent: number;
  tmfCompliancePercent: number;
  siteCompliancePercent: number;
  categoryScores: CategoryScore[];
  missingDocumentsList: MissingDocument[];
}

export interface StudyComplianceSummary {
  studyName: string;
  studyId: string;
  totalSites: number;
  avgCompletionPercent: number;
  avgTmfCompliancePercent: number;
  avgSiteCompliancePercent: number;
  totalMissingDocuments: number;
  siteScores: SiteComplianceScore[];
}

// Sorting options for the site table
export type SortField =
  | "siteNumber"
  | "siteName"
  | "lastUpdated"
  | "overallCompletionPercent"
  | "tmfCompliancePercent"
  | "siteCompliancePercent"
  | "missingDocuments";

export type SortDirection = "asc" | "desc";
