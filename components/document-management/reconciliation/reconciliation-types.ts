// Regulatory Document Reconciliation Tracker Types

export type ReconciliationStatus = "yes" | "no" | "na" | null;

export interface ReconciliationSite {
  id: string;
  siteNumber: string;
  siteName: string;
  lastUpdated: string;
}

export interface ColumnDefinition {
  id: string;
  label: string;
  type: "text" | "date" | "status" | "readonly" | "select";
  width?: number;
  options?: string[]; // For select type
}

export interface ReconciliationDocument {
  id: string;
  categoryId: string;
  fields: Record<string, string | null>;
  presentOnSite: ReconciliationStatus;
  presentInTMF: ReconciliationStatus;
  collectedDate: string | null;
  isHighlighted?: boolean;
  highlightColor?: "yellow" | "blue" | "red";
}

export interface ReconciliationCategory {
  id: string;
  name: string;
  columns: ColumnDefinition[];
  documents: ReconciliationDocument[];
  allowMultipleRows?: boolean;
  hasSubSections?: boolean;
  subSections?: ReconciliationSubSection[];
}

export interface ReconciliationSubSection {
  id: string;
  label: string;
  rowType?: "principal" | "co-principal" | "signature-page";
}

export interface ReconciliationData {
  studyName: string;
  studyId: string;
  sites: ReconciliationSite[];
  categories: ReconciliationCategory[];
}

export interface ReconciliationKPIMetrics {
  totalDocuments: number;
  presentInTMF: number;
  missingFromTMF: number;
  expiredDocuments: number;
  presentOnSite: number;
  pendingCollection: number;
}

// Category IDs for reference
export const CATEGORY_IDS = {
  CLINICAL_TRIAL_AGREEMENT: "clinical-trial-agreement",
  STATEMENT_OF_INVESTIGATOR: "statement-of-investigator",
  INVESTIGATOR_AGREEMENT: "investigator-agreement",
  DEBARMENT_STATEMENT: "debarment-statement",
  DELEGATION_OF_AUTHORITY: "delegation-of-authority",
  IRB_PROTOCOL_AMENDMENTS: "irb-protocol-amendments",
  LOGS: "logs",
  IRB_ADVERSE_EVENTS: "irb-adverse-events",
  NON_DISCLOSURE_AGREEMENT: "non-disclosure-agreement",
  PATIENT_RECRUITMENT: "patient-recruitment",
  IRB_PROTOCOL_DEVIATION: "irb-protocol-deviation",
  IRB_INFORMED_CONSENT_POLICIES: "irb-informed-consent-policies",
  ECRF_COMPLETION_MANUAL: "ecrf-completion-manual",
  CERTIFICATE_OF_INSURANCE: "certificate-of-insurance",
  NOTES_TO_FILE: "notes-to-file",
  EXTERNAL_COMMUNICATIONS: "external-communications",
  IRB_CONTINUE_REVIEWS: "irb-continue-reviews",
  LABORATORY: "laboratory",
  INFORMED_CONSENTS: "informed-consents",
  IRB: "irb",
} as const;

export type CategoryId = (typeof CATEGORY_IDS)[keyof typeof CATEGORY_IDS];
