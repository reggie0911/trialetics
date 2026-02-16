'use server';

import { createClient } from '@/lib/server';
import type {
  DashboardTrackerMetrics,
  SiteMetrics,
} from '@/lib/types/dashboard-metrics';
import { getAEUploads, getAERecords } from '@/lib/actions/ae-data';
import { getMCUploads, getMCRecords } from '@/lib/actions/mc-data';
import { getVWUploads, getVWRecords } from '@/lib/actions/vw-data';
import {
  getECRFUploads,
  getECRFAggregations,
} from '@/lib/actions/ecrf-query-tracker-data';
import {
  getSDVReports,
  getSDVAggregations,
  getSDVSiteSummary,
} from '@/lib/actions/sdv-tracker';
import {
  getPatientUploads,
  getPatientData,
} from '@/lib/actions/patient-data';
import {
  getDocumentUploads,
  getDocumentAggregations,
} from '@/lib/actions/document-management-data';
import { getAllClinicalSites } from '@/lib/actions/clinical-sites';

const EMPTY_AE = {
  totalAEs: 0,
  totalSAEs: 0,
  totalResolved: 0,
  deaths: 0,
  percentResolved: 0,
  hasData: false,
};

const EMPTY_MC = {
  totalMeds: 0,
  missingStartDate: 0,
  startDateUnknown: 0,
  missingStopDate: 0,
  missingDoseOrUnit: 0,
  invalidFreq: 0,
  partialData: 0,
  hasData: false,
};

const EMPTY_VW = {
  totalSubjects: 0,
  activeFollowUps: 0,
  alertRate: '0.0%',
  hasData: false,
};

const EMPTY_ECRF = {
  totalQueries: 0,
  openQueries: 0,
  closedQueries: 0,
  resolvedQueries: 0,
  overdue: 0,
  queriesPerSubject: '0',
  queriesPerVisit: '0',
  missingDataCount: 0,
  avgResolutionTime: 0,
  hasData: false,
};

const EMPTY_SDV = {
  sdvPercent: 0,
  totalItems: 0,
  verifiedItems: 0,
  totalSites: 0,
  totalSubjects: 0,
  hasData: false,
};

const EMPTY_PATIENTS = { totalPatients: 0, hasData: false };

const EMPTY_DOCUMENTS = {
  totalDocuments: 0,
  approvedDocuments: 0,
  documentsPendingApproval: 0,
  expiredDocuments: 0,
  hasData: false,
};

async function fetchAllRecords<T>(
  fetchPage: (page: number) => Promise<{ data: T[]; total: number }>
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, total } = await fetchPage(page);
    all.push(...data);
    if (data.length < pageSize || all.length >= total) {
      hasMore = false;
    } else {
      page++;
    }
  }
  return all;
}

export async function getDashboardTrackerMetrics(
  companyId: string,
  protocolId: string
): Promise<DashboardTrackerMetrics> {
  // Fetch protocol-scoped uploads first; fall back to company-wide if none found
  // (uploads may have protocol_id null if created before protocol scoping was added)
  const [
    aeUploadsRes,
    mcUploadsRes,
    vwUploadsRes,
    ecrfUploadsRes,
    sdvReports,
    patientUploadsRes,
    documentUploadsRes,
  ] = await Promise.all([
    getAEUploads(companyId, protocolId),
    getMCUploads(companyId, protocolId),
    getVWUploads(companyId, protocolId),
    getECRFUploads(companyId, protocolId),
    getSDVReports(companyId, protocolId),
    getPatientUploads(companyId, protocolId),
    getDocumentUploads(companyId),
  ]);

  // Fallback: if protocol-scoped returns no uploads, use company-wide (protocol_id null)
  // so existing uploads created before protocol scoping still appear
  let aeUploads =
    aeUploadsRes.success && aeUploadsRes.data?.length
      ? aeUploadsRes.data
      : [];
  let mcUploads =
    mcUploadsRes.success && mcUploadsRes.data?.length ? mcUploadsRes.data : [];
  let vwUploads =
    vwUploadsRes.success && vwUploadsRes.data?.length ? vwUploadsRes.data : [];
  let ecrfUploads =
    ecrfUploadsRes.success && ecrfUploadsRes.data?.length
      ? ecrfUploadsRes.data
      : [];
  let patientUploads =
    patientUploadsRes.success && patientUploadsRes.data?.length
      ? patientUploadsRes.data
      : [];

  let sdvReportsList = sdvReports ?? [];
  if (protocolId) {
    const [aeFb, mcFb, vwFb, ecrfFb, patientFb, sdvFb] = await Promise.all([
      aeUploads.length ? null : getAEUploads(companyId, null),
      mcUploads.length ? null : getMCUploads(companyId, null),
      vwUploads.length ? null : getVWUploads(companyId, null),
      ecrfUploads.length ? null : getECRFUploads(companyId, null),
      patientUploads.length ? null : getPatientUploads(companyId, null),
      sdvReportsList.length ? null : getSDVReports(companyId, null),
    ]);
    if (aeFb?.success && aeFb.data?.length) aeUploads = aeFb.data;
    if (mcFb?.success && mcFb.data?.length) mcUploads = mcFb.data;
    if (vwFb?.success && vwFb.data?.length) vwUploads = vwFb.data;
    if (ecrfFb?.success && ecrfFb.data?.length) ecrfUploads = ecrfFb.data;
    if (patientFb?.success && patientFb.data?.length) patientUploads = patientFb.data;
    if (sdvFb?.length) sdvReportsList = sdvFb;
  }

  const aeUploadId = aeUploads[0]?.id;
  const mcUploadId = mcUploads[0]?.id;
  const vwUploadId = vwUploads[0]?.id;
  const ecrfUploadId = ecrfUploads[0]?.id;
  const latestSdvReport = sdvReportsList[0];
  const patientUploadId = patientUploads[0]?.id;
  const documentUploadId =
    documentUploadsRes.success && documentUploadsRes.data?.[0]?.id;

  const [aeMetrics, mcMetrics, vwMetrics, ecrfMetrics, sdvMetrics, patientCount, documentMetrics] =
    await Promise.all([
      aeUploadId ? computeAEMetrics(aeUploadId) : Promise.resolve(EMPTY_AE),
      mcUploadId ? computeMCMetrics(mcUploadId) : Promise.resolve(EMPTY_MC),
      vwUploadId ? computeVWMetrics(vwUploadId) : Promise.resolve(EMPTY_VW),
      ecrfUploadId
        ? computeECRFMetrics(ecrfUploadId)
        : Promise.resolve(EMPTY_ECRF),
      latestSdvReport
        ? computeSDVMetrics(latestSdvReport.id)
        : Promise.resolve(EMPTY_SDV),
      patientUploadId
        ? getPatientCount(patientUploadId)
        : Promise.resolve(0),
      documentUploadId
        ? computeDocumentMetrics(documentUploadId)
        : Promise.resolve(EMPTY_DOCUMENTS),
    ]);

  return {
    ae: aeMetrics,
    mc: mcMetrics,
    vw: vwMetrics,
    ecrf: ecrfMetrics,
    sdv: sdvMetrics,
    patients: {
      totalPatients: patientCount,
      hasData: patientCount > 0,
    },
    documents: documentMetrics,
  };
}

async function computeAEMetrics(uploadId: string) {
  const records = await fetchAllRecords(async (page) => {
    const res = await getAERecords(uploadId, page, 1000);
    if (!res.success || !res.data) return { data: [], total: 0 };
    return {
      data: res.data.records.map((r) => ({
        AESER: r.AESER,
        AEOUT: r.AEOUT,
        AESERCAT1: r.AESERCAT1,
      })),
      total: res.data.total,
    };
  });

  if (records.length === 0) return EMPTY_AE;

  const totalAEs = records.length;
  const totalSAEs = records.filter(
    (r) => r.AESER && r.AESER.toUpperCase().includes('SERIOUS')
  ).length;
  const totalResolved = records.filter(
    (r) => r.AEOUT && r.AEOUT.toUpperCase().includes('RESOLVED')
  ).length;
  const deaths = records.filter(
    (r) =>
      r.AESERCAT1 && r.AESERCAT1.toUpperCase().includes('DEATH')
  ).length;
  const percentResolved =
    totalAEs > 0 ? Math.round((totalResolved / totalAEs) * 100) : 0;

  return {
    totalAEs,
    totalSAEs,
    totalResolved,
    deaths,
    percentResolved,
    hasData: true,
  };
}

async function computeMCMetrics(uploadId: string) {
  const records = await fetchAllRecords(async (page) => {
    const res = await getMCRecords(uploadId, page, 1000);
    if (!res.success || !res.data) return { data: [], total: 0 };
    return {
      data: res.data.records,
      total: res.data.total,
    };
  });

  if (records.length === 0) return EMPTY_MC;

  const totalMeds = records.length;
  const missingStartDate = records.filter(
    (r) => !r['1.CCSTDAT'] || (r['1.CCSTDAT'] as string).trim() === ''
  ).length;
  const startDateUnknown = records.filter(
    (r) =>
      r['1.CMSTDATUN1'] === 'Unknown' || r['1.CMSTDATUN1'] === 'Y'
  ).length;
  const missingStopDate = records.filter(
    (r) =>
      r['1.CCONGO1'] !== 'Ongoing' &&
      (!r['1.CCSPDAT'] || (r['1.CCSPDAT'] as string).trim() === '')
  ).length;
  const missingDoseOrUnit = records.filter(
    (r) => !r['1.CC1'] || !r['1.CCUNIT']
  ).length;
  const validFreqs = ['QD', 'BID', 'TID', 'QID', 'PRN', '1x', 'Other'];
  const invalidFreq = records.filter((r) => {
    const freq = r['1.CCFREQ'];
    return freq && !validFreqs.some((v) => (freq as string).includes(v));
  }).length;
  const partialData = records.filter((r) => {
    const fields = [
      r['1.CCMED'],
      r['1.CC1'],
      r['1.CCUNIT'],
      r['1.CCFREQ'],
      r['1.CCSTDAT'],
    ];
    const filledFields = fields.filter(
      (f) => f && (f as string).trim() !== ''
    ).length;
    return filledFields > 0 && filledFields < fields.length;
  }).length;

  return {
    totalMeds,
    missingStartDate,
    startDateUnknown,
    missingStopDate,
    missingDoseOrUnit,
    invalidFreq,
    partialData,
    hasData: true,
  };
}

async function computeVWMetrics(uploadId: string) {
  const records = await fetchAllRecords(async (page) => {
    const res = await getVWRecords(uploadId, page, 1000);
    if (!res.success || !res.data) return { data: [], total: 0 };
    return { data: res.data.records, total: res.data.total };
  });

  if (records.length === 0) return EMPTY_VW;

  const uniqueSubjects = new Set(records.map((r) => r.SubjectId)).size;
  const subjectsWithAlerts = new Set(
    records
      .filter(
        (r) =>
          r.AlertStatus === 'YELLOW' || r.AlertStatus === 'RED'
      )
      .map((r) => r.SubjectId)
  ).size;
  const totalVisits = records.length;
  const alertVisits = records.filter(
    (r) => r.AlertStatus === 'YELLOW' || r.AlertStatus === 'RED'
  ).length;
  const alertRate =
    totalVisits > 0
      ? ((alertVisits / totalVisits) * 100).toFixed(1)
      : '0.0';

  return {
    totalSubjects: uniqueSubjects,
    activeFollowUps: subjectsWithAlerts,
    alertRate: `${alertRate}%`,
    hasData: true,
  };
}

async function computeECRFMetrics(uploadId: string) {
  const res = await getECRFAggregations(uploadId, {});
  if (!res.success || !res.data) return EMPTY_ECRF;

  const d = res.data;
  return {
    totalQueries: d.totalQueries,
    openQueries: d.openQueries,
    closedQueries: d.closedQueries,
    resolvedQueries: d.resolvedQueries,
    overdue: d.overdue,
    queriesPerSubject: d.queriesPerSubject,
    queriesPerVisit: d.queriesPerVisit,
    missingDataCount: d.missingDataCount,
    avgResolutionTime: d.avgResolutionTime,
    hasData: d.totalQueries > 0,
  };
}

async function computeSDVMetrics(reportId: string) {
  const agg = await getSDVAggregations(reportId);
  if (!agg) return EMPTY_SDV;

  return {
    sdvPercent: agg.sdv_percent,
    totalItems: agg.total_items,
    verifiedItems: agg.verified_items,
    totalSites: agg.total_sites,
    totalSubjects: agg.total_subjects,
    hasData: agg.total_items > 0,
  };
}

async function getPatientCount(uploadId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('upload_id', uploadId);
  if (error) return 0;
  return count ?? 0;
}

async function computeDocumentMetrics(uploadId: string) {
  const res = await getDocumentAggregations(uploadId, {});
  if (!res.success || !res.data) return EMPTY_DOCUMENTS;

  const d = res.data;
  return {
    totalDocuments: d.totalDocuments,
    approvedDocuments: d.approvedDocuments,
    documentsPendingApproval: d.documentsPendingApproval,
    expiredDocuments: d.expiredDocuments,
    hasData: d.totalDocuments > 0,
  };
}

function normalizeSiteName(name: string): string {
  return (name || '').trim().toLowerCase();
}

export async function getDashboardSiteMetrics(
  companyId: string,
  protocolId: string,
  protocolTitle: string
): Promise<SiteMetrics[]> {
  const [clinicalSitesRes, ecrfUploadsRes, sdvReports] = await Promise.all([
    getAllClinicalSites(companyId, protocolId),
    getECRFUploads(companyId, protocolId),
    getSDVReports(companyId, protocolId),
  ]);

  let ecrfUploadId = ecrfUploadsRes.success && ecrfUploadsRes.data?.[0]?.id;
  let latestSdvReport = sdvReports?.[0];

  // Fallback: if protocol-scoped returns no data, use company-wide so existing uploads still appear
  if (!ecrfUploadId || !latestSdvReport) {
    const [ecrfFb, sdvFb] = await Promise.all([
      ecrfUploadId ? null : getECRFUploads(companyId, null),
      latestSdvReport ? null : getSDVReports(companyId, null),
    ]);
    if (!ecrfUploadId && ecrfFb?.success && ecrfFb.data?.[0]?.id) {
      ecrfUploadId = ecrfFb.data[0].id;
    }
    if (!latestSdvReport && sdvFb?.length) {
      latestSdvReport = sdvFb[0];
    }
  }

  let ecrfBySite: Map<string, { open: number; answered: number }> = new Map();
  let sdvBySite: Map<
    string,
    {
      total_items: number;
      verified_items: number;
      sdv_percent: number;
    }
  > = new Map();

  if (ecrfUploadId) {
    const supabase = await createClient();
    let allRecords: { site_name: string | null; query_state: string | null }[] =
      [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from('ecrf_records')
        .select('site_name, query_state')
        .eq('upload_id', ecrfUploadId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allRecords = allRecords.concat(data);
        if (data.length < pageSize) hasMore = false;
        else page++;
      }
    }

    for (const r of allRecords) {
      const site = (r.site_name || 'Unknown').trim() || 'Unknown';
      const current = ecrfBySite.get(site) || { open: 0, answered: 0 };
      if (r.query_state === 'Query Raised') {
        current.open++;
      } else if (
        r.query_state === 'Query Closed' ||
        r.query_state === 'Query Resolved'
      ) {
        current.answered++;
      }
      ecrfBySite.set(site, current);
    }
  }

  if (latestSdvReport) {
    const sdvSummary = await getSDVSiteSummary(latestSdvReport.id);
    for (const row of sdvSummary) {
      sdvBySite.set(row.site_name, {
        total_items: row.total_items,
        verified_items: row.verified_items,
        sdv_percent: row.sdv_percent,
      });
    }
  }

  let clinicalSites =
    clinicalSitesRes.success && clinicalSitesRes.data ? clinicalSitesRes.data : [];
  if (clinicalSites.length === 0) {
    const sitesFb = await getAllClinicalSites(companyId, undefined);
    if (sitesFb.success && sitesFb.data?.length) {
      clinicalSites = sitesFb.data;
    }
  }
  const orgNameBySiteNumber = new Map<string, string>();
  for (const s of clinicalSites) {
    const siteNum = (s as { site_number?: string }).site_number || '';
    const orgName = (s as { organization?: { name?: string } }).organization
      ?.name || '';
    orgNameBySiteNumber.set(siteNum, orgName);
  }

  const result: SiteMetrics[] = [];

  if (clinicalSites.length > 0) {
    for (const site of clinicalSites) {
      const s = site as {
        site_number?: string;
        organization?: { name?: string };
      };
      const siteNumber = s.site_number || '';
      const siteName = s.organization?.name || siteNumber || 'Unknown';

      const normOrg = normalizeSiteName(siteName);
      const normSiteNum = normalizeSiteName(siteNumber);

      let sdvRow = sdvBySite.get(siteName);
      if (!sdvRow) {
        for (const [trackerSite, data] of sdvBySite) {
          if (
            normalizeSiteName(trackerSite) === normOrg ||
            normalizeSiteName(trackerSite) === normSiteNum
          ) {
            sdvRow = data;
            break;
          }
        }
      }

      let ecrfRow = ecrfBySite.get(siteName);
      if (!ecrfRow) {
        for (const [trackerSite, data] of ecrfBySite) {
          if (
            normalizeSiteName(trackerSite) === normOrg ||
            normalizeSiteName(trackerSite) === normSiteNum
          ) {
            ecrfRow = data;
            break;
          }
        }
      }

      const openQueries = ecrfRow?.open ?? 0;
      const answeredQueries = ecrfRow?.answered ?? 0;
      const sdvPercentage = sdvRow?.sdv_percent ?? 0;
      const crfsVerified = sdvRow?.total_items ?? 0;

      const isCompliant = sdvPercentage >= 80 && openQueries <= 10;

      result.push({
        siteNumber,
        studyName: protocolTitle,
        siteName,
        isCompliant,
        crfsVerified,
        openQueries,
        answeredQueries,
        sdvPercentage,
      });
    }
  } else {
    const siteNamesSet = new Set<string>();
    for (const k of sdvBySite.keys()) {
      if (k && k !== 'Unknown') siteNamesSet.add(k);
    }
    for (const k of ecrfBySite.keys()) {
      if (k && k !== 'Unknown') siteNamesSet.add(k);
    }

    for (const siteName of Array.from(siteNamesSet).sort()) {
      const sdvRow = sdvBySite.get(siteName);
      const ecrfRow = ecrfBySite.get(siteName);

      const openQueries = ecrfRow?.open ?? 0;
      const answeredQueries = ecrfRow?.answered ?? 0;
      const sdvPercentage = sdvRow?.sdv_percent ?? 0;
      const crfsVerified = sdvRow?.total_items ?? 0;
      const isCompliant = sdvPercentage >= 80 && openQueries <= 10;

      result.push({
        siteNumber: siteName,
        studyName: protocolTitle,
        siteName,
        isCompliant,
        crfsVerified,
        openQueries,
        answeredQueries,
        sdvPercentage,
      });
    }
  }

  return result;
}
