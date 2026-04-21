/**
 * Pure helper that computes which visits / CRFs would be added to a subject if
 * a "Resync to live template" were applied right now. Mirrors the add-only
 * behaviour of the `resync_ecrf_to_subject` RPC so the UI can preview what
 * will happen without hitting the database.
 *
 * Resync is intentionally add-only — never deletes or updates existing rows
 * on the subject — so removed/renamed template entries don't cascade into
 * lost regulatory data.
 */

export interface LiveTemplateVisit {
  /** study_visit_definitions.id */
  visit_definition_id: string;
  visit_name: string;
  sort_order: number;
  /** study_crfs rows attached to this visit definition. */
  crfs: LiveTemplateCrf[];
}

export interface LiveTemplateCrf {
  /** study_crfs.id */
  crf_definition_id: string;
  name: string;
  sort_order: number;
}

export interface SubjectVisitSnapshotRef {
  /** Source visit_definition_id (null for hand-added visits, ignored by resync). */
  visit_definition_id: string | null;
  /** crf_definition_ids already linked to this subject visit. */
  crf_definition_ids: string[];
}

export interface ResyncAdditions {
  /** New visit_definition_ids that will be inserted as subject_visits. */
  visitsToAdd: string[];
  /** New (visit_definition_id, crf_definition_id) tuples to insert as subject_crfs. */
  crfsToAdd: Array<{ visit_definition_id: string; crf_definition_id: string }>;
}

/**
 * @param liveVisits  visits in the current live eCRF template
 * @param subjectVisits subject_visits already on the subject (including hand-added ones, which are ignored)
 */
export function computeResyncAdditions(
  liveVisits: LiveTemplateVisit[],
  subjectVisits: SubjectVisitSnapshotRef[],
): ResyncAdditions {
  const additions: ResyncAdditions = { visitsToAdd: [], crfsToAdd: [] };

  // Index existing subject visits by their source visit_definition_id (skip hand-added).
  const existingByVisitDef = new Map<string, Set<string>>();
  for (const sv of subjectVisits) {
    if (!sv.visit_definition_id) continue;
    const set = existingByVisitDef.get(sv.visit_definition_id) ?? new Set<string>();
    for (const id of sv.crf_definition_ids) set.add(id);
    existingByVisitDef.set(sv.visit_definition_id, set);
  }

  for (const liveVisit of liveVisits) {
    const existingCrfs = existingByVisitDef.get(liveVisit.visit_definition_id);

    if (!existingCrfs) {
      // Visit not on the subject yet — add the visit and every CRF beneath it.
      additions.visitsToAdd.push(liveVisit.visit_definition_id);
      for (const crf of liveVisit.crfs) {
        additions.crfsToAdd.push({
          visit_definition_id: liveVisit.visit_definition_id,
          crf_definition_id: crf.crf_definition_id,
        });
      }
      continue;
    }

    // Visit exists on the subject. Add only the CRFs that aren't there yet.
    for (const crf of liveVisit.crfs) {
      if (!existingCrfs.has(crf.crf_definition_id)) {
        additions.crfsToAdd.push({
          visit_definition_id: liveVisit.visit_definition_id,
          crf_definition_id: crf.crf_definition_id,
        });
      }
    }
  }

  return additions;
}
