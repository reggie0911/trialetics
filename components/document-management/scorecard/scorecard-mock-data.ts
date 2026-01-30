// Mock data for Compliance Scorecard - Multiple sites with varying compliance levels

import {
  ReconciliationCategory,
  ReconciliationSite,
  CATEGORY_IDS,
} from "../reconciliation/reconciliation-types";
import {
  calculateSiteScore,
  calculateStudySummary,
} from "./scorecard-calculator";
import { StudyComplianceSummary, SiteComplianceScore } from "./scorecard-types";

// Sites for scorecard
export const SCORECARD_SITES: ReconciliationSite[] = [
  { id: "site-203", siteNumber: "203", siteName: "Metro Health Center", lastUpdated: "2/22/2021" },
  { id: "site-101", siteNumber: "101", siteName: "University Medical", lastUpdated: "2/20/2021" },
  { id: "site-102", siteNumber: "102", siteName: "Regional Hospital", lastUpdated: "2/18/2021" },
  { id: "site-205", siteNumber: "205", siteName: "Valley Clinic", lastUpdated: "2/15/2021" },
];

// Helper to generate category data with specific compliance levels
function generateSiteCategories(
  siteId: string,
  tmfCompliance: number,
  siteCompliance: number
): ReconciliationCategory[] {
  const categories: ReconciliationCategory[] = [
    // Clinical Trial Agreement
    {
      id: CATEGORY_IDS.CLINICAL_TRIAL_AGREEMENT,
      name: "Clinical Trial Agreement",
      columns: [
        { id: "piSignatureDate", label: "PI Signature Date", type: "date", width: 120 },
        { id: "principalName", label: "Principal Name", type: "text", width: 180 },
      ],
      documents: [
        {
          id: `${siteId}-cta-1`,
          categoryId: CATEGORY_IDS.CLINICAL_TRIAL_AGREEMENT,
          fields: { piSignatureDate: "3-Oct-19", principalName: "Dr. Smith" },
          presentOnSite: siteCompliance > 70 ? "yes" : "no",
          presentInTMF: tmfCompliance > 60 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
    // Statement of Investigator
    {
      id: CATEGORY_IDS.STATEMENT_OF_INVESTIGATOR,
      name: "Statement of Investigator",
      columns: [
        { id: "signatureDate", label: "Signature Date", type: "date", width: 120 },
        { id: "investigatorName", label: "Investigator Name", type: "text", width: 200 },
      ],
      allowMultipleRows: true,
      documents: [
        {
          id: `${siteId}-soi-1`,
          categoryId: CATEGORY_IDS.STATEMENT_OF_INVESTIGATOR,
          fields: { signatureDate: "12-Dec-19", investigatorName: "Dr. Johnson" },
          presentOnSite: siteCompliance > 50 ? "yes" : "no",
          presentInTMF: tmfCompliance > 70 ? "yes" : "no",
          documentLink: null,
        },
        {
          id: `${siteId}-soi-2`,
          categoryId: CATEGORY_IDS.STATEMENT_OF_INVESTIGATOR,
          fields: { signatureDate: "3-Aug-20", investigatorName: "Dr. Williams" },
          presentOnSite: siteCompliance > 80 ? "yes" : "no",
          presentInTMF: tmfCompliance > 50 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
    // Investigator Agreement
    {
      id: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
      name: "Investigator Agreement",
      columns: [
        { id: "signatureDate", label: "Signature Date", type: "date", width: 120 },
        { id: "name", label: "Name", type: "text", width: 180 },
      ],
      documents: [
        {
          id: `${siteId}-ia-1`,
          categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
          fields: { signatureDate: "21-Nov-19", name: "Dr. Brown" },
          presentOnSite: siteCompliance > 60 ? "yes" : "no",
          presentInTMF: tmfCompliance > 80 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
    // Debarment Statement
    {
      id: CATEGORY_IDS.DEBARMENT_STATEMENT,
      name: "Debarment Statement",
      columns: [
        { id: "signatureDate", label: "Signature Date", type: "date", width: 120 },
        { id: "staffMember", label: "Staff Member", type: "text", width: 180 },
      ],
      allowMultipleRows: true,
      documents: [
        {
          id: `${siteId}-ds-1`,
          categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
          fields: { signatureDate: "23-Apr-19", staffMember: "Dr. Davis" },
          presentOnSite: "yes",
          presentInTMF: tmfCompliance > 40 ? "yes" : "no",
          documentLink: null,
        },
        {
          id: `${siteId}-ds-2`,
          categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
          fields: { signatureDate: "15-May-19", staffMember: "Nurse Wilson" },
          presentOnSite: siteCompliance > 40 ? "yes" : "no",
          presentInTMF: tmfCompliance > 60 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
    // Delegation of Authority
    {
      id: CATEGORY_IDS.DELEGATION_OF_AUTHORITY,
      name: "Delegation of Authority",
      columns: [
        { id: "staffName", label: "Staff Name", type: "text", width: 180 },
        { id: "role", label: "Role", type: "text", width: 150 },
        { id: "versionDate", label: "Version Date", type: "date", width: 120 },
      ],
      allowMultipleRows: true,
      documents: [
        {
          id: `${siteId}-doa-1`,
          categoryId: CATEGORY_IDS.DELEGATION_OF_AUTHORITY,
          fields: { staffName: "Dr. Smith", role: "Principal Investigator", versionDate: "17-Oct-19" },
          presentOnSite: siteCompliance > 30 ? "yes" : "no",
          presentInTMF: tmfCompliance > 50 ? "yes" : "no",
          documentLink: null,
        },
        {
          id: `${siteId}-doa-2`,
          categoryId: CATEGORY_IDS.DELEGATION_OF_AUTHORITY,
          fields: { staffName: "Dr. Johnson", role: "Sub-Investigator", versionDate: "17-Oct-19" },
          presentOnSite: "yes",
          presentInTMF: tmfCompliance > 70 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
    // IRB Protocol Amendments
    {
      id: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
      name: "IRB Protocol Amendments",
      columns: [
        { id: "amendmentNumber", label: "Amendment #", type: "text", width: 100 },
        { id: "approvalDate", label: "Approval Date", type: "date", width: 120 },
        { id: "versionDate", label: "Version Date", type: "date", width: 120 },
      ],
      allowMultipleRows: true,
      documents: [
        {
          id: `${siteId}-irb-1`,
          categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
          fields: { amendmentNumber: "Amendment 1", approvalDate: "15-Jan-20", versionDate: "" },
          presentOnSite: siteCompliance > 55 ? "yes" : "no",
          presentInTMF: tmfCompliance > 45 ? "yes" : "no",
          documentLink: null,
        },
        {
          id: `${siteId}-irb-2`,
          categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
          fields: { amendmentNumber: "Amendment 2", approvalDate: "20-Mar-20", versionDate: "" },
          presentOnSite: siteCompliance > 65 ? "yes" : "no",
          presentInTMF: tmfCompliance > 55 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
    // Logs
    {
      id: CATEGORY_IDS.LOGS,
      name: "Logs",
      columns: [
        { id: "logType", label: "Log Type", type: "text", width: 200 },
        { id: "currentVersion", label: "Current Version", type: "text", width: 120 },
      ],
      allowMultipleRows: true,
      documents: [
        {
          id: `${siteId}-log-1`,
          categoryId: CATEGORY_IDS.LOGS,
          fields: { logType: "Screening Log", currentVersion: "V3" },
          presentOnSite: "yes",
          presentInTMF: "yes",
          documentLink: null,
        },
        {
          id: `${siteId}-log-2`,
          categoryId: CATEGORY_IDS.LOGS,
          fields: { logType: "Enrollment Log", currentVersion: "V2" },
          presentOnSite: siteCompliance > 75 ? "yes" : "no",
          presentInTMF: tmfCompliance > 75 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
    // Informed Consents
    {
      id: CATEGORY_IDS.INFORMED_CONSENTS,
      name: "Informed Consents",
      columns: [
        { id: "version", label: "Version", type: "text", width: 100 },
        { id: "irbApprovalDate", label: "IRB Approval Date", type: "date", width: 130 },
        { id: "effectiveDate", label: "Effective Date", type: "date", width: 130 },
      ],
      allowMultipleRows: true,
      documents: [
        {
          id: `${siteId}-ic-1`,
          categoryId: CATEGORY_IDS.INFORMED_CONSENTS,
          fields: { version: "V1.0", irbApprovalDate: "28-Aug-19", effectiveDate: "10/23/2019" },
          presentOnSite: "yes",
          presentInTMF: "yes",
          documentLink: null,
        },
        {
          id: `${siteId}-ic-2`,
          categoryId: CATEGORY_IDS.INFORMED_CONSENTS,
          fields: { version: "V2.0", irbApprovalDate: "15-Jan-20", effectiveDate: "02/01/2020" },
          presentOnSite: siteCompliance > 45 ? "yes" : "no",
          presentInTMF: tmfCompliance > 65 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
    // Laboratory
    {
      id: CATEGORY_IDS.LABORATORY,
      name: "Laboratory",
      columns: [
        { id: "labName", label: "Lab Name", type: "text", width: 200 },
        { id: "certExpiry", label: "Certification Expiry", type: "date", width: 130 },
      ],
      documents: [
        {
          id: `${siteId}-lab-1`,
          categoryId: CATEGORY_IDS.LABORATORY,
          fields: { labName: "Central Lab Inc", certExpiry: "16-Oct-19" },
          presentOnSite: siteCompliance > 50 ? "yes" : "no",
          presentInTMF: tmfCompliance > 50 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
    // Certificate of Insurance
    {
      id: CATEGORY_IDS.CERTIFICATE_OF_INSURANCE,
      name: "Certificate of Insurance",
      columns: [
        { id: "expiryDate", label: "Expiry Date", type: "date", width: 120 },
        { id: "provider", label: "Provider", type: "text", width: 200 },
      ],
      documents: [
        {
          id: `${siteId}-coi-1`,
          categoryId: CATEGORY_IDS.CERTIFICATE_OF_INSURANCE,
          fields: { expiryDate: "31-Dec-21", provider: "Medical Insurance Corp" },
          presentOnSite: "yes",
          presentInTMF: tmfCompliance > 35 ? "yes" : "no",
          documentLink: null,
        },
      ],
    },
  ];

  return categories;
}

// Generate site data with different compliance levels
export const SITE_CATEGORIES_MAP: Map<string, ReconciliationCategory[]> = new Map([
  ["site-203", generateSiteCategories("site-203", 90, 85)], // High compliance
  ["site-101", generateSiteCategories("site-101", 75, 70)], // Medium-high compliance
  ["site-102", generateSiteCategories("site-102", 60, 55)], // Medium compliance
  ["site-205", generateSiteCategories("site-205", 45, 40)], // Low compliance
]);

// Calculate scores for each site
export function getScoreCardData(): StudyComplianceSummary {
  const siteScores: SiteComplianceScore[] = SCORECARD_SITES.map((site) => {
    const categories = SITE_CATEGORIES_MAP.get(site.id) || [];
    return calculateSiteScore(site, categories);
  });

  return calculateStudySummary("HealthyCore Protocol ABC-123", "ABC-123", siteScores);
}

// Export pre-calculated mock data
export const MOCK_SCORECARD_DATA = getScoreCardData();
