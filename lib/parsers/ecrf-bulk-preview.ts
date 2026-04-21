import type { EcrfBulkRow } from './ecrf-csv';

export type EcrfBulkMode = 'append' | 'upsert' | 'replace';

export interface ExistingVisit {
  id: string;
  visit_name: string;
}
export interface ExistingCrf {
  id: string;
  visit_definition_id: string;
  name: string;
}
export interface ExistingQuestion {
  id: string;
  crf_id: string;
  label: string;
}

export interface ExistingEcrfState {
  visits: ExistingVisit[];
  crfs: ExistingCrf[];
  questions: ExistingQuestion[];
}

export interface EcrfBulkPreview {
  visitsToCreate: number;
  visitsToUpdate: number;
  crfsToCreate: number;
  crfsToUpdate: number;
  questionsToCreate: number;
  questionsToUpdate: number;
  visitsToDelete: number;
  crfsToDelete: number;
  questionsToDelete: number;
}

export function emptyEcrfBulkPreview(): EcrfBulkPreview {
  return {
    visitsToCreate: 0,
    visitsToUpdate: 0,
    crfsToCreate: 0,
    crfsToUpdate: 0,
    questionsToCreate: 0,
    questionsToUpdate: 0,
    visitsToDelete: 0,
    crfsToDelete: 0,
    questionsToDelete: 0,
  };
}

/**
 * Pure preview of how a bulk import would affect the database, given the
 * current rows being imported and the existing state of the target version.
 *
 * Mirrors the row-resolution logic of the `bulk_import_ecrf` SQL RPC so the
 * UI's preview matches what the server will actually do, modulo concurrent
 * writes (which the server is the source of truth for).
 */
export function computeEcrfBulkPreview(
  rows: EcrfBulkRow[],
  mode: EcrfBulkMode,
  existing: ExistingEcrfState
): EcrfBulkPreview {
  const preview = emptyEcrfBulkPreview();

  const visitByName = new Map(existing.visits.map((v) => [v.visit_name, v.id]));
  const crfByVisitAndName = new Map(
    existing.crfs.map((c) => [`${c.visit_definition_id}|${c.name}`, c.id])
  );
  const questionByCrfAndLabel = new Map(
    existing.questions.map((q) => [`${q.crf_id}|${q.label}`, q.id])
  );

  const seenVisitName = new Set<string>();
  const seenCrfKey = new Set<string>();
  const seenQuestionKey = new Set<string>();

  // Synthetic id namespace for visits/CRFs that don't yet exist in the DB.
  const newVisitId = (name: string) => `new:${name}`;

  for (const row of rows) {
    const name = row.visit_name;
    let visitId: string;

    if (mode === 'replace') {
      visitId = newVisitId(name);
      if (!seenVisitName.has(name)) {
        seenVisitName.add(name);
        preview.visitsToCreate += 1;
      }
    } else if (mode === 'upsert' && visitByName.has(name)) {
      visitId = visitByName.get(name)!;
      if (!seenVisitName.has(name)) {
        seenVisitName.add(name);
        preview.visitsToUpdate += 1;
      }
    } else if (visitByName.has(name) && mode === 'append') {
      // Append always creates a brand-new visit row even if the name matches.
      visitId = newVisitId(`${name}#${seenVisitName.size}`);
      if (!seenVisitName.has(visitId)) {
        seenVisitName.add(visitId);
        preview.visitsToCreate += 1;
      }
    } else if (visitByName.has(name)) {
      visitId = visitByName.get(name)!;
    } else {
      visitId = newVisitId(name);
      if (!seenVisitName.has(name)) {
        seenVisitName.add(name);
        preview.visitsToCreate += 1;
      }
    }

    if (!row.crf_name) continue;
    const crfKey = `${visitId}|${row.crf_name}`;
    let crfId: string;

    const existingCrfId = !visitId.startsWith('new:')
      ? crfByVisitAndName.get(crfKey)
      : undefined;

    if (mode === 'replace') {
      crfId = `new:${crfKey}`;
      if (!seenCrfKey.has(crfKey)) {
        seenCrfKey.add(crfKey);
        preview.crfsToCreate += 1;
      }
    } else if (mode === 'upsert' && existingCrfId) {
      crfId = existingCrfId;
      if (!seenCrfKey.has(crfKey)) {
        seenCrfKey.add(crfKey);
        preview.crfsToUpdate += 1;
      }
    } else if (mode === 'append' && existingCrfId) {
      crfId = `new:${crfKey}#${seenCrfKey.size}`;
      preview.crfsToCreate += 1;
    } else {
      crfId = existingCrfId ?? `new:${crfKey}`;
      if (!seenCrfKey.has(crfKey)) {
        seenCrfKey.add(crfKey);
        if (existingCrfId) preview.crfsToUpdate += 1;
        else preview.crfsToCreate += 1;
      }
    }

    if (!row.question_label) continue;
    const qKey = `${crfId}|${row.question_label}`;
    if (seenQuestionKey.has(qKey)) continue;
    seenQuestionKey.add(qKey);

    const existingQId = !crfId.startsWith('new:')
      ? questionByCrfAndLabel.get(`${crfId}|${row.question_label}`)
      : undefined;

    if (mode === 'replace') {
      preview.questionsToCreate += 1;
    } else if (mode === 'upsert' && existingQId) {
      preview.questionsToUpdate += 1;
    } else {
      preview.questionsToCreate += 1;
    }
  }

  if (mode === 'replace') {
    preview.visitsToDelete = existing.visits.length;
    preview.crfsToDelete = existing.crfs.length;
    preview.questionsToDelete = existing.questions.length;
  }

  return preview;
}
