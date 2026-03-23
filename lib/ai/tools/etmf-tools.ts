import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/server';

export const autoClassifyDocument = tool({
  description: 'Suggest Zone, Section, and Artifact classification for a document based on its name and content.',
  inputSchema: zodSchema(
    z.object({
      documentName: z.string().describe('The name of the document to classify'),
      documentContent: z.string().optional().describe('Optional extracted text content from the document'),
    })
  ),
  execute: async ({ documentName, documentContent }) => {
    const supabase = await createClient();

    const { data: tmfRefs } = await supabase
      .from('tmf_reference_model')
      .select('zone_number, zone_name, section_number, section_name, artifact_number, artifact_name, recommended_sub_artifact')
      .limit(100);

    const normalizedName = documentName.toLowerCase();

    const matches = (tmfRefs || [])
      .map((ref) => {
        let score = 0;
        const artifactName = ref.artifact_name?.toLowerCase() || '';
        const subArtifact = ref.recommended_sub_artifact?.toLowerCase() || '';

        if (normalizedName.includes(artifactName)) score += 10;
        if (normalizedName.includes(subArtifact)) score += 8;
        if (artifactName.split(' ').some((word: string) => normalizedName.includes(word) && word.length > 3)) score += 3;
        if (subArtifact.split(' ').some((word: string) => normalizedName.includes(word) && word.length > 3)) score += 2;

        return { ...ref, score };
      })
      .filter((ref) => ref.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (matches.length === 0) {
      return {
        suggestions: [],
        message: 'No matching TMF classifications found. Manual classification required.',
      };
    }

    return {
      suggestions: matches.map((m) => ({
        zone: { number: m.zone_number, name: m.zone_name },
        section: { number: m.section_number, name: m.section_name },
        artifact: { number: m.artifact_number, name: m.artifact_name },
        subArtifact: m.recommended_sub_artifact,
        confidence: m.score > 10 ? 'high' : m.score > 5 ? 'medium' : 'low',
      })),
      message: `Found ${matches.length} potential classification(s) for "${documentName}"`,
    };
  },
});

export const qcReviewDocument = tool({
  description: 'Validate document completeness and metadata for QC review.',
  inputSchema: zodSchema(
    z.object({
      documentId: z.string().uuid().describe('The ID of the document to review'),
    })
  ),
  execute: async ({ documentId }) => {
    const supabase = await createClient();

    const { data: doc } = await supabase
      .from('etmf_documents')
      .select('*, tmf_reference:tmf_ref_id(*)')
      .eq('id', documentId)
      .single();

    if (!doc) {
      return { valid: false, issues: ['Document not found'] };
    }

    const issues: string[] = [];

    if (!doc.storage_path) issues.push('No file uploaded');
    if (!doc.tmf_ref_id) issues.push('No TMF classification assigned');
    if (!doc.version) issues.push('Version not specified');
    if (!doc.document_date && !doc.version_date) issues.push('No date information provided');
    if (!doc.language) issues.push('Language not specified');

    if (doc.tmf_reference) {
      const tmf = doc.tmf_reference as any;
      if (tmf.core_or_recommended?.trim() === 'Core' && !doc.storage_path) {
        issues.push('Core document requires uploaded file');
      }
    }

    return {
      valid: issues.length === 0,
      documentName: doc.document_name,
      status: doc.document_status,
      issues,
      recommendations: issues.length > 0
        ? ['Address the issues above before approving this document']
        : ['Document is ready for approval'],
    };
  },
});

export const predictMissingDocuments = tool({
  description: 'Predict missing documents and highlight compliance risks based on EDL.',
  inputSchema: zodSchema(
    z.object({
      studyId: z.string().uuid().describe('The study ID to analyze'),
      siteId: z.string().uuid().optional().describe('Optional site ID to scope the analysis'),
    })
  ),
  execute: async ({ studyId, siteId }) => {
    const supabase = await createClient();

    const { data: edl } = await supabase
      .from('etmf_expected_documents')
      .select('*, tmf_reference:tmf_ref_id(*)')
      .eq('study_id', studyId)
      .eq('edl_yes', true);

    let docsQuery = supabase
      .from('etmf_documents')
      .select('tmf_ref_id, document_status')
      .eq('study_id', studyId);

    if (siteId) {
      docsQuery = docsQuery.eq('site_id', siteId);
    }

    const { data: docs } = await docsQuery;

    const docsByRef = new Map<string, { count: number; approved: number }>();
    (docs || []).forEach((d) => {
      if (!d.tmf_ref_id) return;
      const existing = docsByRef.get(d.tmf_ref_id) || { count: 0, approved: 0 };
      existing.count++;
      if (d.document_status === 'approved') existing.approved++;
      docsByRef.set(d.tmf_ref_id, existing);
    });

    const missing: Array<{ artifactName: string; subArtifact: string | null; core: boolean }> = [];
    const atRisk: Array<{ artifactName: string; subArtifact: string | null; reason: string }> = [];

    (edl || []).forEach((e) => {
      const tmf = e.tmf_reference as any;
      if (!tmf) return;

      const docInfo = docsByRef.get(e.tmf_ref_id);
      const isCore = tmf.core_or_recommended?.trim() === 'Core';

      if (!docInfo || docInfo.count === 0) {
        missing.push({
          artifactName: tmf.artifact_name,
          subArtifact: tmf.recommended_sub_artifact,
          core: isCore,
        });
      } else if (docInfo.approved === 0) {
        atRisk.push({
          artifactName: tmf.artifact_name,
          subArtifact: tmf.recommended_sub_artifact,
          reason: 'Document exists but not approved',
        });
      }
    });

    const coreMissing = missing.filter((m) => m.core).length;
    const riskLevel = coreMissing > 10 ? 'high' : coreMissing > 5 ? 'medium' : 'low';

    return {
      totalExpected: edl?.length || 0,
      totalUploaded: docs?.length || 0,
      missingCount: missing.length,
      atRiskCount: atRisk.length,
      coreMissingCount: coreMissing,
      riskLevel,
      missing: missing.slice(0, 10),
      atRisk: atRisk.slice(0, 10),
      summary: `${missing.length} documents missing (${coreMissing} core), ${atRisk.length} at risk. Risk level: ${riskLevel}.`,
    };
  },
});

export const detectComplianceGaps = tool({
  description: 'Detect gaps between current document status and CDISC TMF Reference Model requirements.',
  inputSchema: zodSchema(
    z.object({
      studyId: z.string().uuid().describe('The study ID to analyze'),
    })
  ),
  execute: async ({ studyId }) => {
    const supabase = await createClient();

    const { data: tmfRefs } = await supabase
      .from('tmf_reference_model')
      .select('id, zone_name, section_name, artifact_name, recommended_sub_artifact, core_or_recommended, trial_level_document, country_level_document, site_level_document');

    const { data: docs } = await supabase
      .from('etmf_documents')
      .select('tmf_ref_id, document_status')
      .eq('study_id', studyId);

    const docsByRef = new Set((docs || []).filter((d) => d.document_status === 'approved').map((d) => d.tmf_ref_id));

    const coreArtifacts = (tmfRefs || []).filter((r) => r.core_or_recommended?.trim() === 'Core');
    const trialLevelCore = coreArtifacts.filter((r) => r.trial_level_document);
    const countryLevelCore = coreArtifacts.filter((r) => r.country_level_document);
    const siteLevelCore = coreArtifacts.filter((r) => r.site_level_document);

    const gapsByZone: Record<string, number> = {};
    const gaps: Array<{ zone: string; artifact: string; subArtifact: string | null; level: string }> = [];

    coreArtifacts.forEach((ref) => {
      if (!docsByRef.has(ref.id)) {
        const zone = ref.zone_name || 'Unknown';
        gapsByZone[zone] = (gapsByZone[zone] || 0) + 1;
        
        let level = 'Trial';
        if (ref.site_level_document) level = 'Site';
        else if (ref.country_level_document) level = 'Country';

        gaps.push({
          zone,
          artifact: ref.artifact_name,
          subArtifact: ref.recommended_sub_artifact,
          level,
        });
      }
    });

    const completeness = {
      trial: {
        total: trialLevelCore.length,
        complete: trialLevelCore.filter((r) => docsByRef.has(r.id)).length,
        pct: trialLevelCore.length > 0 ? Math.round((trialLevelCore.filter((r) => docsByRef.has(r.id)).length / trialLevelCore.length) * 100) : 100,
      },
      country: {
        total: countryLevelCore.length,
        complete: countryLevelCore.filter((r) => docsByRef.has(r.id)).length,
        pct: countryLevelCore.length > 0 ? Math.round((countryLevelCore.filter((r) => docsByRef.has(r.id)).length / countryLevelCore.length) * 100) : 100,
      },
      site: {
        total: siteLevelCore.length,
        complete: siteLevelCore.filter((r) => docsByRef.has(r.id)).length,
        pct: siteLevelCore.length > 0 ? Math.round((siteLevelCore.filter((r) => docsByRef.has(r.id)).length / siteLevelCore.length) * 100) : 100,
      },
    };

    const overallPct = coreArtifacts.length > 0
      ? Math.round((coreArtifacts.filter((r) => docsByRef.has(r.id)).length / coreArtifacts.length) * 100)
      : 100;

    return {
      overallCompleteness: overallPct,
      completeness,
      gapsByZone,
      totalGaps: gaps.length,
      topGaps: gaps.slice(0, 10),
      inspectionReady: overallPct >= 90,
      summary: `CDISC compliance at ${overallPct}%. ${gaps.length} core document gaps detected. ${overallPct >= 90 ? 'Inspection ready.' : 'Additional documents required before inspection.'}`,
    };
  },
});

export const etmfTools = {
  autoClassifyDocument,
  qcReviewDocument,
  predictMissingDocuments,
  detectComplianceGaps,
};
