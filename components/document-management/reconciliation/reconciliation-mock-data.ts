// Mock data matching the Excel "Investigator Study File Tracker" screenshots

import {
  ReconciliationData,
  ReconciliationCategory,
  ReconciliationSite,
  CATEGORY_IDS,
} from "./reconciliation-types";

// Sites
export const MOCK_SITES: ReconciliationSite[] = [
  { id: "site-203", siteNumber: "203", siteName: "Site 203", lastUpdated: "2/22/2021" },
  { id: "site-101", siteNumber: "101", siteName: "Site 101", lastUpdated: "2/20/2021" },
  { id: "site-102", siteNumber: "102", siteName: "Site 102", lastUpdated: "2/18/2021" },
  { id: "site-205", siteNumber: "205", siteName: "Site 205", lastUpdated: "2/15/2021" },
];

// Category definitions with their specific column structures
export const MOCK_CATEGORIES: ReconciliationCategory[] = [
  // 1. Clinical Trial Agreement
  {
    id: CATEGORY_IDS.CLINICAL_TRIAL_AGREEMENT,
    name: "Clinical Trial Agreement",
    columns: [
      { id: "piSignatureDate", label: "PI Signature Date", type: "date", width: 120 },
      { id: "principalName", label: "Principal Name", type: "text", width: 180 },
      { id: "coPrincipalName", label: "Co-Principal Name:", type: "text", width: 180 },
    ],
    documents: [
      {
        id: "cta-1",
        categoryId: CATEGORY_IDS.CLINICAL_TRIAL_AGREEMENT,
        fields: {
          piSignatureDate: "3-Oct-19",
          principalName: "Theodore Schreiber, MD",
          coPrincipalName: "",
        },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
    ],
  },

  // 2. Statement of Investigator
  {
    id: CATEGORY_IDS.STATEMENT_OF_INVESTIGATOR,
    name: "Statement of Investigator",
    columns: [
      { id: "signatureDate", label: "Signature Date", type: "date", width: 120 },
      { id: "investigatorName", label: "Investigator Name", type: "text", width: 200 },
      { id: "version", label: "Version", type: "text", width: 120 },
    ],
    allowMultipleRows: true,
    documents: [
      {
        id: "soi-1",
        categoryId: CATEGORY_IDS.STATEMENT_OF_INVESTIGATOR,
        fields: {
          signatureDate: "12-Dec-19",
          investigatorName: "Thomas Lalonde, MD",
          version: "V5, 04-Feb-2019",
        },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "soi-2",
        categoryId: CATEGORY_IDS.STATEMENT_OF_INVESTIGATOR,
        fields: {
          signatureDate: "3-Aug-20",
          investigatorName: "Thomas Lalonde, MD",
          version: "V5, 04-Feb-2019",
        },
        presentOnSite: null,
        presentInTMF: "no",
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "blue",
      },
      {
        id: "soi-3",
        categoryId: CATEGORY_IDS.STATEMENT_OF_INVESTIGATOR,
        fields: {
          signatureDate: "12/2/2020 (email12/2/2020)",
          investigatorName: "Thomas Lalonde, MD",
          version: "V5, 04-Feb-2019",
        },
        presentOnSite: null,
        presentInTMF: "no",
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "blue",
      },
    ],
  },

  // 3. Investigator Agreement
  {
    id: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
    name: "Investigator Agreement",
    columns: [
      { id: "signatureDate", label: "Signature Date", type: "date", width: 150 },
      { id: "investigatorName", label: "Investigator Name", type: "text", width: 200 },
      { id: "version", label: "Version", type: "text", width: 80 },
    ],
    allowMultipleRows: true,
    documents: [
      {
        id: "ia-1",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "21-Nov-19", investigatorName: "Theodore Schreiber, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ia-2",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "21-Nov-19", investigatorName: "Thomas Lalonde, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ia-3",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "21-Nov-19", investigatorName: "Amir Kaki, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ia-4",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "25-Nov-19", investigatorName: "Mohammed Joumaa, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ia-5",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "25-Nov-19", investigatorName: "Edouard Daher, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ia-6",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "25-Nov-19", investigatorName: "David Rodriguez, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ia-7",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "11-Dec-19", investigatorName: "Hiroshi Yamasaki, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ia-8",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "11-Dec-19", investigatorName: "Marc Gosselin, DO", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ia-9",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "11-Dec-19", investigatorName: "Anthony Alcantara, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ia-10",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "7/30/2020 (email 9/30/2020)", investigatorName: "Rami Zein, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "no",
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "blue",
      },
      {
        id: "ia-11",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "30-Jul-20", investigatorName: "Magdy Hanna, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "no",
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "blue",
      },
      {
        id: "ia-12",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "30-Jul-20", investigatorName: "Pooja Swammy, MD", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "no",
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "blue",
      },
      {
        id: "ia-13",
        categoryId: CATEGORY_IDS.INVESTIGATOR_AGREEMENT,
        fields: { signatureDate: "13-Aug-20", investigatorName: "Adrian Mercado- Alamo", version: "1, 2" },
        presentOnSite: null,
        presentInTMF: "no",
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "blue",
      },
    ],
  },

  // 4. Debarment Statement
  {
    id: CATEGORY_IDS.DEBARMENT_STATEMENT,
    name: "Debarment Statement",
    columns: [
      { id: "signatureDate", label: "Signature Date", type: "date", width: 150 },
      { id: "investigatorName", label: "Investigator Name", type: "text", width: 250 },
    ],
    allowMultipleRows: true,
    documents: [
      {
        id: "ds-1",
        categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
        fields: { signatureDate: "23-Apr-19", investigatorName: "Theodore Schreiber, MD" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ds-2",
        categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
        fields: { signatureDate: "9-Oct-19", investigatorName: "Thomas Lalonde, MD" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ds-3",
        categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
        fields: { signatureDate: "23-Apr-19", investigatorName: "Amir Kaki, MD" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ds-4",
        categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
        fields: { signatureDate: "9-Oct-19", investigatorName: "Mohammed Joumaa, MD" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ds-5",
        categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
        fields: { signatureDate: "10-Dec-19", investigatorName: "Edouard Daher, MD" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ds-6",
        categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
        fields: { signatureDate: "10-Dec-19", investigatorName: "David Rodriguez, MD" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ds-7",
        categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
        fields: { signatureDate: "9-Oct-19", investigatorName: "Hiroshi Yamasaki, MD" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ds-8",
        categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
        fields: { signatureDate: "9-Oct-19", investigatorName: "Marc Gosselin, DO" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ds-9",
        categoryId: CATEGORY_IDS.DEBARMENT_STATEMENT,
        fields: { signatureDate: "10-Dec-19", investigatorName: "Anthony Alcantara, MD" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
    ],
  },

  // 5. Delegation of Authority - Investigator Declaration
  {
    id: CATEGORY_IDS.DELEGATION_OF_AUTHORITY,
    name: "Delegation of Authority - Investigator Declaration",
    columns: [
      { id: "rowLabel", label: "", type: "readonly", width: 120 },
      { id: "declarationVersion", label: "Investigator Declaration Version", type: "text", width: 200 },
      { id: "versionDate", label: "Version Date", type: "date", width: 150 },
      { id: "dateSubmitted", label: "Date Submitted, Approved or Signed", type: "date", width: 180 },
    ],
    hasSubSections: true,
    documents: [
      {
        id: "doa-1-principal",
        categoryId: CATEGORY_IDS.DELEGATION_OF_AUTHORITY,
        fields: {
          rowLabel: "Principal Name :",
          declarationVersion: "Theodore Schreiber, MD",
          versionDate: "V4, 04-Feb-2019",
          dateSubmitted: "17-Oct-19",
        },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "doa-1-coprincipal",
        categoryId: CATEGORY_IDS.DELEGATION_OF_AUTHORITY,
        fields: {
          rowLabel: "Co-Principal Name :",
          declarationVersion: "Thomas Lalonde, MD",
          versionDate: "",
          dateSubmitted: "23-Oct-19",
        },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
    ],
  },

  // 6. IRB Protocol Amendments & Signature Pages
  {
    id: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
    name: "IRB Protocol Amendments & Signature Pages",
    columns: [
      { id: "rowLabel", label: "", type: "readonly", width: 120 },
      { id: "protocolVersion", label: "Protocol / Amendments", type: "text", width: 200 },
      { id: "versionDate", label: "Version Date", type: "date", width: 200 },
      { id: "dateSubmitted", label: "Date Submitted, Approved or Signed", type: "date", width: 180 },
    ],
    hasSubSections: true,
    documents: [
      // Protocol Version 1
      {
        id: "irb-pa-v1",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "", protocolVersion: "Protocol Version 1", versionDate: "MMMM YYYY", dateSubmitted: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-pa-v1-sig",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "Signature Page", protocolVersion: "", versionDate: "Thomas LaLonde/Theodore Schreiber, MD", dateSubmitted: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "blue",
      },
      // Protocol Version 2
      {
        id: "irb-pa-v2",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "", protocolVersion: "Protocol Version 2", versionDate: "MMMM YYYY", dateSubmitted: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-pa-v2-sig",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "Signature Page", protocolVersion: "", versionDate: "Thomas LaLonde/Theodore Schreiber, MD", dateSubmitted: "14-Oct-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "blue",
      },
      // Protocol Version 3
      {
        id: "irb-pa-v3",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "", protocolVersion: "Protocol Version 3", versionDate: "", dateSubmitted: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-pa-v3-sig1",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "Signature Page", protocolVersion: "", versionDate: "Theodore Schreiber, MD", dateSubmitted: "03-Oct-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-pa-v3-sig2",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "", protocolVersion: "Protocol Version 3", versionDate: "", dateSubmitted: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-pa-v3-sig3",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "Signature Page", protocolVersion: "", versionDate: "Thomas Lalonde, MD", dateSubmitted: "14-Oct-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      // Protocol Version 4
      {
        id: "irb-pa-v4",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "", protocolVersion: "Protocol Version 4", versionDate: "MMMM YYYY", dateSubmitted: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-pa-v4-sig",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "Signature Page", protocolVersion: "", versionDate: "Thomas LaLonde/Theodore Schreiber, MD", dateSubmitted: "3/6/2020 : 03/12/2020" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      // Protocol Version 5
      {
        id: "irb-pa-v5",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "", protocolVersion: "Protocol Version 5", versionDate: "MMMM YYYY", dateSubmitted: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-pa-v5-sig",
        categoryId: CATEGORY_IDS.IRB_PROTOCOL_AMENDMENTS,
        fields: { rowLabel: "Signature Page", protocolVersion: "", versionDate: "Thomas LaLonde/Theodore Schreiber, MD", dateSubmitted: "04-May-20" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
    ],
  },

  // 7. Logs
  {
    id: CATEGORY_IDS.LOGS,
    name: "Logs",
    columns: [
      { id: "typeOfLog", label: "Type of Log", type: "text", width: 200 },
      { id: "description", label: "Description", type: "text", width: 300 },
    ],
    allowMultipleRows: true,
    documents: [
      {
        id: "log-1",
        categoryId: CATEGORY_IDS.LOGS,
        fields: { typeOfLog: "Monitor Site Visit Log", description: "Site Visit Log" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "log-2",
        categoryId: CATEGORY_IDS.LOGS,
        fields: { typeOfLog: "Screen Log", description: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "log-3",
        categoryId: CATEGORY_IDS.LOGS,
        fields: { typeOfLog: "Enrollment Log", description: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
    ],
  },

  // 8. IRB Adverse Events Reporting Policies
  {
    id: CATEGORY_IDS.IRB_ADVERSE_EVENTS,
    name: "IRB Adverse Events Reporting Policies",
    columns: [
      { id: "type", label: "Type", type: "text", width: 100 },
      { id: "versionDate", label: "Version Date", type: "date", width: 120 },
      { id: "usedBySite", label: "Used By Site (Y/N)", type: "text", width: 100 },
      { id: "submittedApproved", label: "Submitted and Approved by IRB (Y/N)", type: "text", width: 200 },
    ],
    documents: [],
  },

  // 9. Non-Disclosure Agreement
  {
    id: CATEGORY_IDS.NON_DISCLOSURE_AGREEMENT,
    name: "Non-Disclosure Agreement",
    columns: [
      { id: "dateSigned", label: "Date Signed", type: "date", width: 120 },
      { id: "piName", label: "PI Name", type: "text", width: 200 },
    ],
    documents: [
      {
        id: "nda-1",
        categoryId: CATEGORY_IDS.NON_DISCLOSURE_AGREEMENT,
        fields: { dateSigned: "2/11/2019", piName: "Theodore Schreiber, MD" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
    ],
  },

  // 10. Patient Recruitment Materials
  {
    id: CATEGORY_IDS.PATIENT_RECRUITMENT,
    name: "Patient Recruitment Materials",
    columns: [
      { id: "type", label: "Type", type: "text", width: 100 },
      { id: "versionDate", label: "Version Date", type: "date", width: 120 },
      { id: "usedBySite", label: "Used By Site (Y/N)", type: "text", width: 100 },
      { id: "submittedApproved", label: "Submitted and Approved by IRB (Y/N)", type: "text", width: 200 },
    ],
    documents: [],
  },

  // 11. IRB Protocol Deviation Reporting Requirements
  {
    id: CATEGORY_IDS.IRB_PROTOCOL_DEVIATION,
    name: "IRB Protocol Deviation Reporting Requirements",
    columns: [
      { id: "type", label: "Type", type: "text", width: 100 },
      { id: "versionDate", label: "Version Date", type: "date", width: 120 },
      { id: "usedBySite", label: "Used By Site (Y/N)", type: "text", width: 100 },
      { id: "submittedApproved", label: "Submitted and Approved by IRB (Y/N)", type: "text", width: 200 },
    ],
    documents: [],
  },

  // 12. IRB Informed Consent Policies
  {
    id: CATEGORY_IDS.IRB_INFORMED_CONSENT_POLICIES,
    name: "IRB Informed Consent Policies",
    columns: [
      { id: "type", label: "Type", type: "text", width: 100 },
      { id: "versionDate", label: "Version Date", type: "date", width: 120 },
      { id: "usedBySite", label: "Used By Site (Y/N)", type: "text", width: 100 },
      { id: "submittedApproved", label: "Submitted and Approved by IRB (Y/N)", type: "text", width: 200 },
    ],
    documents: [],
  },

  // 13. eCRF Completion Guidelines Manual
  {
    id: CATEGORY_IDS.ECRF_COMPLETION_MANUAL,
    name: "eCRF Completion Guidelines Manual",
    columns: [
      { id: "versionNumber", label: "Version Number", type: "text", width: 150 },
      { id: "versionDate", label: "Version Date", type: "date", width: 300 },
    ],
    documents: [],
  },

  // 14. Certificate of Insurance
  {
    id: CATEGORY_IDS.CERTIFICATE_OF_INSURANCE,
    name: "Certificate of Insurance",
    columns: [
      { id: "type", label: "Type", type: "text", width: 80 },
      { id: "year", label: "Year", type: "text", width: 80 },
      { id: "policyExpiration", label: "Policy Expiration", type: "date", width: 150 },
      { id: "expirationDate", label: "Expiration Date", type: "date", width: 150 },
    ],
    documents: [],
  },

  // 15. Notes to File
  {
    id: CATEGORY_IDS.NOTES_TO_FILE,
    name: "Notes to File",
    columns: [
      { id: "type", label: "Type", type: "text", width: 80 },
      { id: "date", label: "Date", type: "date", width: 100 },
      { id: "title", label: "Title", type: "text", width: 150 },
      { id: "ntfDescription", label: "NTF Description", type: "text", width: 300 },
      { id: "tmfVaultNumber", label: "TMF Vault Document Number", type: "text", width: 150 },
    ],
    allowMultipleRows: true,
    documents: [
      {
        id: "ntf-1",
        categoryId: CATEGORY_IDS.NOTES_TO_FILE,
        fields: { type: "Memo", date: "22-Mar-30", title: "", ntfDescription: "V4 protocol & WIRB submission", tmfVaultNumber: "VV-TMF-16392" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ntf-2",
        categoryId: CATEGORY_IDS.NOTES_TO_FILE,
        fields: { type: "", date: "24-Jun-20", title: "Note to File Dr. Alcantar", ntfDescription: "Note to File Dr. Alcantara late signature on training log", tmfVaultNumber: "VV-TMF-19475" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ntf-3",
        categoryId: CATEGORY_IDS.NOTES_TO_FILE,
        fields: { type: "", date: "29-May-20", title: "", ntfDescription: "EDC entry enrolled", tmfVaultNumber: "VV-TMF-18771" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ntf-4",
        categoryId: CATEGORY_IDS.NOTES_TO_FILE,
        fields: { type: "", date: "14-May-20", title: "", ntfDescription: "V5 of IRB approvals", tmfVaultNumber: "VV-TMF-18291" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ntf-5",
        categoryId: CATEGORY_IDS.NOTES_TO_FILE,
        fields: { type: "", date: "29-Jul-20", title: "", ntfDescription: "Investigator's Agreement that has an incorrect footer on pages 2 and 3", tmfVaultNumber: "VV-TMF-20985" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ntf-6",
        categoryId: CATEGORY_IDS.NOTES_TO_FILE,
        fields: { type: "", date: "21-Jul-20", title: "", ntfDescription: "All new Subi- training is covered in re-training powerpoint", tmfVaultNumber: "VV-TMF-20781" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ntf-7",
        categoryId: CATEGORY_IDS.NOTES_TO_FILE,
        fields: { type: "", date: "21-Sep-20", title: "Rami Zein late sign", ntfDescription: "Rami Zein lat signature on training log", tmfVaultNumber: "VV-TMF-23366" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
    ],
  },

  // 16. External Relevant Communications
  {
    id: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
    name: "External Relevant Communications",
    columns: [
      { id: "type", label: "Type", type: "text", width: 80 },
      { id: "date", label: "Date", type: "date", width: 100 },
      { id: "to", label: "To", type: "text", width: 80 },
      { id: "from", label: "From", type: "text", width: 100 },
      { id: "subject", label: "Subject", type: "text", width: 250 },
    ],
    allowMultipleRows: true,
    documents: [
      {
        id: "ext-1",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "12-Dec-19", to: "Site", from: "Abiomed", subject: "V3 activation letter and checklist" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ext-2",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "24-Jul-19", to: "Site", from: "Abiomed", subject: "Start-up Packet Letter" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ext-3",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "02-Jul-19", to: "Site", from: "Abiomed", subject: "Site Invitation letter" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ext-4",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "08-Nov-19", to: "Site", from: "Abiomed", subject: "CRA Transfer Letter - Tara West" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ext-5",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "", to: "Site", from: "Abiomed", subject: "CRA Transfer Letter - Janet Ortiz" },
        presentOnSite: null,
        presentInTMF: "no",
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "yellow",
      },
      {
        id: "ext-6",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "24-Jul-20", to: "Site", from: "Abiomed", subject: "Site Re-activation letter" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ext-7",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "22-Jun-20", to: "Site", from: "Abiomed", subject: "CRA Transfer Letter to Andrew Thorpe" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ext-8",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "16-Aug-19", to: "Site", from: "Abiomed", subject: "Site Feasibility Questionaire" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ext-9",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "21-Sep-20", to: "Site", from: "Abiomed", subject: "Edouard Daher Reactivation Letter" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ext-10",
        categoryId: CATEGORY_IDS.EXTERNAL_COMMUNICATIONS,
        fields: { type: "Letter", date: "12-Feb-21", to: "Site", from: "Abiomed", subject: "Madgy Hanna Reactivation Letter" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
    ],
  },

  // 17. IRB Continue Reviews
  {
    id: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
    name: "IRB Continue Reviews",
    columns: [
      { id: "document", label: "Document", type: "text", width: 300 },
      { id: "year", label: "Year", type: "text", width: 80 },
      { id: "irbExpirationDate", label: "IRB Expiration Date:", type: "date", width: 150 },
    ],
    hasSubSections: true,
    documents: [
      // 2019
      {
        id: "irb-cr-2019-header",
        categoryId: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
        fields: { document: "", year: "2019", irbExpirationDate: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-cr-2019-sub",
        categoryId: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
        fields: { document: "IRB Submission Document|Submission Date:", year: "", irbExpirationDate: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-cr-2019-approval",
        categoryId: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
        fields: { document: "IRB Approval Document|IRB Effective Date:", year: "", irbExpirationDate: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-cr-2019-amend",
        categoryId: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
        fields: { document: "IRB Approval Document_CR Amendment (If applicable)|IRB Effective Date:", year: "", irbExpirationDate: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      // 2020
      {
        id: "irb-cr-2020-header",
        categoryId: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
        fields: { document: "", year: "2020", irbExpirationDate: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "yellow",
      },
      {
        id: "irb-cr-2020-note",
        categoryId: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
        fields: { document: "", year: "", irbExpirationDate: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-cr-2020-sub",
        categoryId: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
        fields: { document: "IRB Submission Document|Submission Date:", year: "", irbExpirationDate: "02-Jan-20" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-cr-2020-approval",
        categoryId: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
        fields: { document: "IRB Approval Document|IRB Effective Date:", year: "", irbExpirationDate: "01-Jun-20" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-cr-2020-amend",
        categoryId: CATEGORY_IDS.IRB_CONTINUE_REVIEWS,
        fields: { document: "IRB Approval Document_CR Amendment (If applicable)|IRB Effective Date:", year: "", irbExpirationDate: "27-Jun-21" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
    ],
  },

  // 18. Laboratory
  {
    id: CATEGORY_IDS.LABORATORY,
    name: "Laboratory",
    columns: [
      { id: "nameAddress", label: "Name & Address of Lab", type: "text", width: 200 },
      { id: "document", label: "Document", type: "text", width: 150 },
      { id: "effectiveDate", label: "Effective Date", type: "date", width: 120 },
      { id: "expirationDate", label: "Expiration Date", type: "date", width: 120 },
    ],
    allowMultipleRows: true,
    documents: [
      {
        id: "lab-1",
        categoryId: CATEGORY_IDS.LABORATORY,
        fields: { nameAddress: "Ascension Michigan Lab Services\n22101 Moross Road\nDetroit, MI  48236-2148 (Martha J Higgins)", document: "CV of Lab Director", effectiveDate: "16-Oct-19", expirationDate: "" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "lab-2",
        categoryId: CATEGORY_IDS.LABORATORY,
        fields: { nameAddress: "", document: "ML of Lab Director", effectiveDate: "7-Jan-88", expirationDate: "31-Jan-22" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "lab-3",
        categoryId: CATEGORY_IDS.LABORATORY,
        fields: { nameAddress: "", document: "Certification:  CAP", effectiveDate: "", expirationDate: "" },
        presentOnSite: null,
        presentInTMF: "no",
        collectedDate: null,
      },
      {
        id: "lab-4",
        categoryId: CATEGORY_IDS.LABORATORY,
        fields: { nameAddress: "", document: "Certification:  CLIA", effectiveDate: "28-Feb-19", expirationDate: "27-Feb-21" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "lab-5",
        categoryId: CATEGORY_IDS.LABORATORY,
        fields: { nameAddress: "", document: "Lab Reference Ranges", effectiveDate: "1-Sep-19", expirationDate: "" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
        isHighlighted: true,
        highlightColor: "blue",
      },
    ],
  },

  // 19. Informed Consents
  {
    id: CATEGORY_IDS.INFORMED_CONSENTS,
    name: "Informed Consents",
    columns: [
      { id: "year", label: "Year", type: "text", width: 60 },
      { id: "icfVersion", label: "ICF Version Number", type: "text", width: 100 },
      { id: "icfVersionDate", label: "ICF Version Date", type: "date", width: 120 },
      { id: "irbApprovalDate", label: "IRB Approval Date", type: "date", width: 120 },
      { id: "comments", label: "Comments, If necessary.", type: "text", width: 250 },
    ],
    allowMultipleRows: true,
    documents: [
      {
        id: "ic-1",
        categoryId: CATEGORY_IDS.INFORMED_CONSENTS,
        fields: { year: "2019", icfVersion: "4", icfVersionDate: "28-Aug-19", irbApprovalDate: "10/23/2019", comments: "Short ICF Checklist" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ic-2",
        categoryId: CATEGORY_IDS.INFORMED_CONSENTS,
        fields: { year: "2019", icfVersion: "4", icfVersionDate: "28-Aug-19", irbApprovalDate: "10/23/2019", comments: "IRB Approved short Form" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ic-3",
        categoryId: CATEGORY_IDS.INFORMED_CONSENTS,
        fields: { year: "2019", icfVersion: "5", icfVersionDate: "28-Aug-19", irbApprovalDate: "11/6/2019", comments: "Long ICF Checklist" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ic-4",
        categoryId: CATEGORY_IDS.INFORMED_CONSENTS,
        fields: { year: "2019", icfVersion: "5", icfVersionDate: "28-Aug-19", irbApprovalDate: "11/6/2019", comments: "IRB Approved Long Form" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ic-5",
        categoryId: CATEGORY_IDS.INFORMED_CONSENTS,
        fields: { year: "2020", icfVersion: "6", icfVersionDate: "2/11/2020", irbApprovalDate: "24-Feb-20", comments: "Short ICF Checklist" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "ic-6",
        categoryId: CATEGORY_IDS.INFORMED_CONSENTS,
        fields: { year: "2021", icfVersion: "7", icfVersionDate: "2/11/2020", irbApprovalDate: "2/24/2020", comments: "Full ICF Version Checklist" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
    ],
  },

  // 20. IRB
  {
    id: CATEGORY_IDS.IRB,
    name: "IRB",
    columns: [
      { id: "year", label: "Year", type: "text", width: 60 },
      { id: "document", label: "Document", type: "text", width: 200 },
      { id: "irbNameTitle", label: "IRB Name", type: "text", width: 200 },
      { id: "date", label: "Date", type: "date", width: 120 },
    ],
    allowMultipleRows: true,
    documents: [
      {
        id: "irb-1",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "2019", document: "IRB Membership /Composition List", irbNameTitle: "WIRB", date: "10-Oct-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-2",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "2020", document: "IRB Membership /Composition List", irbNameTitle: "WIRB", date: "01-May-20" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-3",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "2021", document: "IRB Membership /Composition List", irbNameTitle: "", date: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-4",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "2022", document: "IRB Membership /Composition List", irbNameTitle: "", date: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-5",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "2023", document: "IRB Membership /Composition List", irbNameTitle: "", date: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      // IRB/IEC Acknowledgements
      {
        id: "irb-ack-1",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "Initial Protocol Submission", date: "18-Sep-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-ack-2",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "Initial IRB Approval", date: "16-Oct-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-ack-3",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "IRB Submission - Addision of Thomas Lalonde, Revised Consent Forms", date: "17-Oct-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-ack-4",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "IRB Approval -Dr. Lalonde and Revised ICFs", date: "23-Oct-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-ack-5",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "IRB Submission - Revised ICF", date: "06-Nov-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-ack-6",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "IRB Approval - Revised ICF (long form)", date: "06-Nov-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-ack-7",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "Ascension IRB notification of modifications required", date: "16-Sep-19" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-ack-8",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "IRB Statement of compliance", date: "26-Mar-18" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      {
        id: "irb-ack-9",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "OHRP registration", date: "" },
        presentOnSite: null,
        presentInTMF: null,
        collectedDate: null,
      },
      {
        id: "irb-ack-10",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB/IEC Acknowledgement", irbNameTitle: "IRB Approval -  Protocol Version 4 ICF", date: "24-Feb-20" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
      // IRB Assurance Number
      {
        id: "irb-assurance",
        categoryId: CATEGORY_IDS.IRB,
        fields: { year: "", document: "IRB Assurance Number", irbNameTitle: "IRB00001313 (VV-TMF-12084)", date: "exp 6/22/2022" },
        presentOnSite: null,
        presentInTMF: "yes",
        collectedDate: null,
      },
    ],
  },
];

// Complete mock data
export const MOCK_RECONCILIATION_DATA: ReconciliationData = {
  studyName: "DTU Study",
  studyId: "DTU-2021-001",
  sites: MOCK_SITES,
  categories: MOCK_CATEGORIES,
};

// Helper to calculate KPI metrics
export function calculateKPIMetrics(categories: ReconciliationCategory[]): {
  totalDocuments: number;
  presentInTMF: number;
  missingFromTMF: number;
  presentOnSite: number;
  pendingCollection: number;
} {
  let totalDocuments = 0;
  let presentInTMF = 0;
  let missingFromTMF = 0;
  let presentOnSite = 0;
  let pendingCollection = 0;

  categories.forEach((category) => {
    category.documents.forEach((doc) => {
      totalDocuments++;
      if (doc.presentInTMF === "yes") presentInTMF++;
      if (doc.presentInTMF === "no") missingFromTMF++;
      if (doc.presentOnSite === "yes") presentOnSite++;
      if (!doc.collectedDate && doc.presentInTMF !== "yes") pendingCollection++;
    });
  });

  return {
    totalDocuments,
    presentInTMF,
    missingFromTMF,
    presentOnSite,
    pendingCollection,
  };
}
