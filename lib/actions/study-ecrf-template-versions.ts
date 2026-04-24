'use server';

import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertEcrfAdminForStudy } from '@/lib/server/require-ecrf-admin';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import type {
  EcrfTemplateVersion,
  EcrfTemplateVersionWithCounts,
} from '@/lib/types/ctms';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listTemplateVersions(
  studyId: string
): Promise<EcrfTemplateVersionWithCounts[]> {
  const supabase = await createClient();
  // Read also requires admin per §2a; surface empty list to non-admins.
  const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
  if (adminError) return [];

  const { data, error } = await supabase
    .from('study_ecrf_template_versions')
    .select('*')
    .eq('study_id', studyId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);

  const versions = (data as unknown as EcrfTemplateVersion[]) ?? [];
  if (versions.length === 0) return [];

  // Counts in three parallel grouped queries (small datasets, simple SQL).
  const versionIds = versions.map((v) => v.id);
  const [visits, crfs, questions] = await Promise.all([
    supabase
      .from('study_visit_definitions')
      .select('template_version_id')
      .in('template_version_id', versionIds),
    supabase
      .from('study_crfs')
      .select('template_version_id')
      .in('template_version_id', versionIds),
    supabase
      .from('study_crf_questions')
      .select('template_version_id')
      .in('template_version_id', versionIds),
  ]);

  const tally = (rows: Array<{ template_version_id: string }> | null | undefined) => {
    const map = new Map<string, number>();
    for (const r of rows ?? []) {
      map.set(r.template_version_id, (map.get(r.template_version_id) ?? 0) + 1);
    }
    return map;
  };

  const visitMap = tally(visits.data as { template_version_id: string }[] | null);
  const crfMap = tally(crfs.data as { template_version_id: string }[] | null);
  const questionMap = tally(questions.data as { template_version_id: string }[] | null);

  return versions.map((v) => ({
    ...v,
    visit_count: visitMap.get(v.id) ?? 0,
    crf_count: crfMap.get(v.id) ?? 0,
    question_count: questionMap.get(v.id) ?? 0,
  }));
}

/**
 * Get the version that should be the default selection in EcrfTree:
 * the live version if any, otherwise the most recently created draft,
 * otherwise null. Lazily creates v1 draft if the study has no versions.
 */
export async function getOrCreateActiveVersion(
  studyId: string
): Promise<{ data: EcrfTemplateVersion | null; error: string | null }> {
  const supabase = await createClient();
  const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
  if (adminError) return { data: null, error: adminError };

  const { data: existing, error: selectError } = await supabase
    .from('study_ecrf_template_versions')
    .select('*')
    .eq('study_id', studyId)
    .order('status', { ascending: true })
    .order('version_number', { ascending: false });
  if (selectError) return { data: null, error: selectError.message };

  const rows = (existing as unknown as EcrfTemplateVersion[]) ?? [];
  if (rows.length > 0) {
    const live = rows.find((r) => r.status === 'live');
    const draft = rows.find((r) => r.status === 'draft');
    return { data: live ?? draft ?? rows[0], error: null };
  }

  // None exist: lazy-create v1 draft (writable check satisfied since admin).
  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
  if (writeGuard) return { data: null, error: writeGuard };

  const { data: created, error: insertError } = await supabase
    .from('study_ecrf_template_versions')
    .insert({ study_id: studyId, version_number: 1, name: 'Version 1', status: 'draft' })
    .select()
    .single();
  if (insertError) return { data: null, error: insertError.message };

  revalidateStudyCtmsLayout(studyId);
  return { data: created as unknown as EcrfTemplateVersion, error: null };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createDraftVersion(
  studyId: string,
  input: { name?: string | null } = {}
): Promise<{ data: EcrfTemplateVersion | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { data: null, error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { data: null, error: writeGuard };

    const { data: maxRow } = await supabase
      .from('study_ecrf_template_versions')
      .select('version_number')
      .eq('study_id', studyId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = ((maxRow?.version_number as number | undefined) ?? 0) + 1;
    const name = input.name?.trim() || `Version ${nextNumber}`;

    const { data, error } = await supabase
      .from('study_ecrf_template_versions')
      .insert({ study_id: studyId, version_number: nextNumber, name, status: 'draft' })
      .select()
      .single();
    if (error) return { data: null, error: error.message };

    revalidateStudyCtmsLayout(studyId);
    return { data: data as unknown as EcrfTemplateVersion, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function cloneVersion(
  studyId: string,
  sourceVersionId: string,
  input: { name?: string | null } = {}
): Promise<{ data: EcrfTemplateVersion | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { data: null, error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { data: null, error: writeGuard };

    const { data: source } = await supabase
      .from('study_ecrf_template_versions')
      .select('study_id')
      .eq('id', sourceVersionId)
      .maybeSingle();
    if (!source || source.study_id !== studyId) {
      return { data: null, error: 'Source version not found in this study.' };
    }

    const { data: newId, error } = await supabase.rpc('clone_ecrf_template_version', {
      p_source_version_id: sourceVersionId,
      p_name: input.name?.trim() || null,
    });
    if (error) return { data: null, error: error.message };

    const { data: created, error: fetchError } = await supabase
      .from('study_ecrf_template_versions')
      .select('*')
      .eq('id', newId as unknown as string)
      .single();
    if (fetchError) return { data: null, error: fetchError.message };

    revalidateStudyCtmsLayout(studyId);
    return { data: created as unknown as EcrfTemplateVersion, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export interface PublishVersionSyncSummary {
  subjects: number;
  visitsAdded: number;
  crfsAdded: number;
}

export interface PublishVersionResult {
  error: string | null;
  /**
   * Per-study fan-out summary returned by `resync_ecrf_for_study` once the
   * version is live. `null` means the publish itself succeeded but the
   * follow-up resync failed (warning surfaced separately).
   */
  syncSummary?: PublishVersionSyncSummary | null;
  /**
   * Non-fatal warning surfaced when the publish flipped to live but the
   * subject fan-out errored. Callers should toast this so admins know to
   * use the per-subject "Resync to latest live template" recovery path.
   */
  warning?: string | null;
}

export async function publishVersion(
  studyId: string,
  versionId: string
): Promise<PublishVersionResult> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { data: version } = await supabase
      .from('study_ecrf_template_versions')
      .select('study_id, status')
      .eq('id', versionId)
      .maybeSingle();
    if (!version || version.study_id !== studyId) {
      return { error: 'Version not found in this study.' };
    }

    const { error } = await supabase.rpc('publish_ecrf_template_version', {
      p_version_id: versionId,
    });
    if (error) {
      // Partial unique index violation surfaces here when two users race.
      if (error.code === '23505') {
        return { error: 'Another version was just published; please reload.' };
      }
      return { error: error.message };
    }

    // Fan a regulatory-safe (add-only) resync out to every non-terminal
    // subject so the freshly-live template appears immediately without
    // anyone needing to click the per-subject "Resync to latest live
    // template" button. Failure here is non-fatal: the publish already
    // committed.
    let syncSummary: PublishVersionSyncSummary | null = null;
    let warning: string | null = null;

    const { data: syncRaw, error: syncError } = await supabase.rpc(
      'resync_ecrf_for_study',
      { p_study_id: studyId },
    );
    if (syncError) {
      warning =
        'Version published, but auto-sync to subjects failed: ' +
        syncError.message +
        ' Use "Resync to latest live template" on each affected subject.';
    } else {
      const syncObj = (syncRaw ?? {}) as {
        subjects?: number;
        visits_added?: number;
        crfs_added?: number;
      };
      syncSummary = {
        subjects: syncObj.subjects ?? 0,
        visitsAdded: syncObj.visits_added ?? 0,
        crfsAdded: syncObj.crfs_added ?? 0,
      };
    }

    revalidateStudyCtmsLayout(studyId);
    return { error: null, syncSummary, warning };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function archiveVersion(
  studyId: string,
  versionId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { data: version } = await supabase
      .from('study_ecrf_template_versions')
      .select('study_id, status')
      .eq('id', versionId)
      .maybeSingle();
    if (!version || version.study_id !== studyId) {
      return { error: 'Version not found in this study.' };
    }
    if (version.status === 'archived') return { error: null };

    const { error } = await supabase
      .from('study_ecrf_template_versions')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', versionId);
    if (error) return { error: error.message };

    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function renameVersion(
  studyId: string,
  versionId: string,
  name: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const trimmed = name.trim();
    if (!trimmed) return { error: 'Version name is required.' };

    const { data: version } = await supabase
      .from('study_ecrf_template_versions')
      .select('study_id')
      .eq('id', versionId)
      .maybeSingle();
    if (!version || version.study_id !== studyId) {
      return { error: 'Version not found in this study.' };
    }

    const { error } = await supabase
      .from('study_ecrf_template_versions')
      .update({ name: trimmed })
      .eq('id', versionId);
    if (error) return { error: error.message };

    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function deleteDraftVersion(
  studyId: string,
  versionId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { data: version } = await supabase
      .from('study_ecrf_template_versions')
      .select('study_id, status')
      .eq('id', versionId)
      .maybeSingle();
    if (!version || version.study_id !== studyId) {
      return { error: 'Version not found in this study.' };
    }
    if (version.status !== 'draft') {
      return { error: 'Only draft versions can be deleted.' };
    }

    const { error } = await supabase
      .from('study_ecrf_template_versions')
      .delete()
      .eq('id', versionId);
    if (error) return { error: error.message };

    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}
