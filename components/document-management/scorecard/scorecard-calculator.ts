// Scorecard Calculator Utilities

import {
  ReconciliationCategory,
  ReconciliationDocument,
  ReconciliationSite,
} from "../reconciliation/reconciliation-types";
import {
  CategoryScore,
  MissingDocument,
  SiteComplianceScore,
  StudyComplianceSummary,
} from "./scorecard-types";

/**
 * Calculate compliance score for a single category
 */
export function calculateCategoryScore(
  category: ReconciliationCategory
): CategoryScore {
  const documents = category.documents;
  
  // Count documents excluding those with "na" status
  let totalDocs = 0;
  let presentOnSite = 0;
  let presentInTMF = 0;

  documents.forEach((doc) => {
    // Skip documents where both statuses are "na"
    if (doc.presentOnSite === "na" && doc.presentInTMF === "na") {
      return;
    }

    totalDocs++;

    if (doc.presentOnSite === "yes") {
      presentOnSite++;
    }

    if (doc.presentInTMF === "yes") {
      presentInTMF++;
    }
  });

  // Calculate completion percentage (average of site and TMF compliance)
  const sitePercent = totalDocs > 0 ? (presentOnSite / totalDocs) * 100 : 100;
  const tmfPercent = totalDocs > 0 ? (presentInTMF / totalDocs) * 100 : 100;
  const completionPercent = (sitePercent + tmfPercent) / 2;

  return {
    categoryId: category.id,
    categoryName: category.name,
    totalDocs,
    presentOnSite,
    presentInTMF,
    completionPercent: Math.round(completionPercent * 10) / 10,
  };
}

/**
 * Get list of missing documents for a category
 */
export function getMissingDocuments(
  category: ReconciliationCategory,
  site: ReconciliationSite
): MissingDocument[] {
  const missing: MissingDocument[] = [];

  category.documents.forEach((doc) => {
    const missingFromSite = doc.presentOnSite === "no";
    const missingFromTMF = doc.presentInTMF === "no";

    if (missingFromSite || missingFromTMF) {
      // Get document name from first text field or use a default
      const docName = getDocumentName(doc, category);

      missing.push({
        documentId: doc.id,
        documentName: docName,
        categoryId: category.id,
        categoryName: category.name,
        siteId: site.id,
        siteName: site.siteName,
        missingFrom:
          missingFromSite && missingFromTMF
            ? "both"
            : missingFromSite
            ? "site"
            : "tmf",
      });
    }
  });

  return missing;
}

/**
 * Get a display name for a document from its fields
 */
function getDocumentName(
  doc: ReconciliationDocument,
  category: ReconciliationCategory
): string {
  // Try to find a name field
  const nameFields = ["principalName", "investigatorName", "name", "description", "version"];
  
  for (const fieldId of nameFields) {
    if (doc.fields[fieldId]) {
      return doc.fields[fieldId] as string;
    }
  }

  // Fallback to first non-empty text field
  for (const column of category.columns) {
    if (column.type === "text" && doc.fields[column.id]) {
      return doc.fields[column.id] as string;
    }
  }

  // Ultimate fallback
  return `${category.name} Document`;
}

/**
 * Calculate compliance score for a single site
 */
export function calculateSiteScore(
  site: ReconciliationSite,
  categories: ReconciliationCategory[]
): SiteComplianceScore {
  const categoryScores: CategoryScore[] = [];
  const missingDocumentsList: MissingDocument[] = [];

  let totalDocuments = 0;
  let totalPresentOnSite = 0;
  let totalPresentInTMF = 0;

  categories.forEach((category) => {
    const categoryScore = calculateCategoryScore(category);
    categoryScores.push(categoryScore);

    totalDocuments += categoryScore.totalDocs;
    totalPresentOnSite += categoryScore.presentOnSite;
    totalPresentInTMF += categoryScore.presentInTMF;

    // Get missing documents
    const missing = getMissingDocuments(category, site);
    missingDocumentsList.push(...missing);
  });

  const tmfCompliancePercent =
    totalDocuments > 0 ? (totalPresentInTMF / totalDocuments) * 100 : 100;
  const siteCompliancePercent =
    totalDocuments > 0 ? (totalPresentOnSite / totalDocuments) * 100 : 100;
  const overallCompletionPercent = (tmfCompliancePercent + siteCompliancePercent) / 2;

  return {
    siteId: site.id,
    siteName: site.siteName,
    siteNumber: site.siteNumber,
    lastUpdated: site.lastUpdated,
    totalDocuments,
    presentOnSite: totalPresentOnSite,
    presentInTMF: totalPresentInTMF,
    missingDocuments: missingDocumentsList.length,
    overallCompletionPercent: Math.round(overallCompletionPercent * 10) / 10,
    tmfCompliancePercent: Math.round(tmfCompliancePercent * 10) / 10,
    siteCompliancePercent: Math.round(siteCompliancePercent * 10) / 10,
    categoryScores,
    missingDocumentsList,
  };
}

/**
 * Calculate study-wide compliance summary
 */
export function calculateStudySummary(
  studyName: string,
  studyId: string,
  siteScores: SiteComplianceScore[]
): StudyComplianceSummary {
  const totalSites = siteScores.length;

  if (totalSites === 0) {
    return {
      studyName,
      studyId,
      totalSites: 0,
      avgCompletionPercent: 0,
      avgTmfCompliancePercent: 0,
      avgSiteCompliancePercent: 0,
      totalMissingDocuments: 0,
      siteScores: [],
    };
  }

  const totalCompletion = siteScores.reduce(
    (sum, site) => sum + site.overallCompletionPercent,
    0
  );
  const totalTmf = siteScores.reduce(
    (sum, site) => sum + site.tmfCompliancePercent,
    0
  );
  const totalSiteCompliance = siteScores.reduce(
    (sum, site) => sum + site.siteCompliancePercent,
    0
  );
  const totalMissing = siteScores.reduce(
    (sum, site) => sum + site.missingDocuments,
    0
  );

  return {
    studyName,
    studyId,
    totalSites,
    avgCompletionPercent: Math.round((totalCompletion / totalSites) * 10) / 10,
    avgTmfCompliancePercent: Math.round((totalTmf / totalSites) * 10) / 10,
    avgSiteCompliancePercent:
      Math.round((totalSiteCompliance / totalSites) * 10) / 10,
    totalMissingDocuments: totalMissing,
    siteScores,
  };
}

/**
 * Get color class based on percentage value
 */
export function getComplianceColor(percent: number): string {
  if (percent >= 80) return "text-green-600";
  if (percent >= 50) return "text-amber-600";
  return "text-red-600";
}

/**
 * Get background color class based on percentage value
 */
export function getComplianceBgColor(percent: number): string {
  if (percent >= 80) return "bg-green-500";
  if (percent >= 50) return "bg-amber-500";
  return "bg-red-500";
}
