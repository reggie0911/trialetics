'use server';

import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertEcrfAdminForStudy } from '@/lib/server/require-ecrf-admin';
import { assertDraftVersion } from '@/lib/server/require-draft-ecrf-version';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import type { StudyCrf, StudyCrfQuestion, QuestionType } from '@/lib/types/ctms';

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function loadCrfRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  crfId: string
): Promise<{ study_id: string; template_version_id: string } | null> {
  const { data, error } = await supabase
    .from('study_crfs')
    .select('study_id, template_version_id')
    .eq('id', crfId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { study_id: string; template_version_id: string };
}

async function loadVisitRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitDefinitionId: string
): Promise<{ study_id: string; template_version_id: string } | null> {
  const { data, error } = await supabase
    .from('study_visit_definitions')
    .select('study_id, template_version_id')
    .eq('id', visitDefinitionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { study_id: string; template_version_id: string };
}

// ─── Study CRFs ────────────────────────────────────────────────────────────────

export async function listStudyCrfs(
  studyId: string,
  versionId?: string
): Promise<StudyCrf[]> {
  const supabase = await createClient();
  let query = supabase
    .from('study_crfs')
    .select('*')
    .eq('study_id', studyId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (versionId) query = query.eq('template_version_id', versionId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as StudyCrf[]) ?? [];
}

export async function createStudyCrf(
  studyId: string,
  input: {
    name: string;
    description?: string | null;
    visit_definition_id: string;
    sort_order?: number;
  }
): Promise<{ data: StudyCrf | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { data: null, error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { data: null, error: writeGuard };

    const trimmedName = input.name.trim();
    if (!trimmedName) return { data: null, error: 'CRF name is required.' };

    if (!input.visit_definition_id) {
      return { data: null, error: 'Visit is required.' };
    }
    const visitRow = await loadVisitRow(supabase, input.visit_definition_id);
    if (!visitRow || visitRow.study_id !== studyId) {
      return { data: null, error: 'Visit does not belong to this study.' };
    }
    // CRF inherits its version from the visit. Visit's version must be a draft.
    const { error: draftError } = await assertDraftVersion(
      supabase,
      studyId,
      visitRow.template_version_id
    );
    if (draftError) return { data: null, error: draftError };

    let sortOrder = input.sort_order;
    if (typeof sortOrder !== 'number') {
      const { count } = await supabase
        .from('study_crfs')
        .select('*', { count: 'exact', head: true })
        .eq('visit_definition_id', input.visit_definition_id);
      sortOrder = typeof count === 'number' ? count : 0;
    }

    const { data, error } = await supabase
      .from('study_crfs')
      .insert({
        study_id: studyId,
        template_version_id: visitRow.template_version_id,
        visit_definition_id: input.visit_definition_id,
        name: trimmedName,
        description: input.description?.trim() ? input.description.trim() : null,
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };

    revalidateStudyCtmsLayout(studyId);
    return { data: data as unknown as StudyCrf, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function updateStudyCrf(
  id: string,
  studyId: string,
  updates: {
    name?: string;
    description?: string | null;
    visit_definition_id?: string;
    sort_order?: number;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const crfRow = await loadCrfRow(supabase, id);
    if (!crfRow || crfRow.study_id !== studyId) {
      return { error: 'CRF not found.' };
    }
    const { error: draftError } = await assertDraftVersion(
      supabase,
      studyId,
      crfRow.template_version_id
    );
    if (draftError) return { error: draftError };

    const payload: {
      name?: string;
      description?: string | null;
      visit_definition_id?: string;
      sort_order?: number;
    } = {};

    if (typeof updates.name === 'string') {
      const trimmed = updates.name.trim();
      if (!trimmed) return { error: 'CRF name is required.' };
      payload.name = trimmed;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
      payload.description = updates.description?.trim() ? updates.description.trim() : null;
    }
    if (typeof updates.visit_definition_id === 'string') {
      const visitRow = await loadVisitRow(supabase, updates.visit_definition_id);
      if (!visitRow || visitRow.study_id !== studyId) {
        return { error: 'Visit does not belong to this study.' };
      }
      if (visitRow.template_version_id !== crfRow.template_version_id) {
        return { error: 'Cannot move a CRF across template versions.' };
      }
      payload.visit_definition_id = updates.visit_definition_id;
    }
    if (typeof updates.sort_order === 'number') {
      payload.sort_order = updates.sort_order;
    }

    const { error } = await supabase.from('study_crfs').update(payload).eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function deleteStudyCrf(
  id: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const crfRow = await loadCrfRow(supabase, id);
    if (!crfRow || crfRow.study_id !== studyId) {
      return { error: 'CRF not found.' };
    }
    const { error: draftError } = await assertDraftVersion(
      supabase,
      studyId,
      crfRow.template_version_id
    );
    if (draftError) return { error: draftError };

    const { error } = await supabase.from('study_crfs').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function reorderStudyCrfs(
  studyId: string,
  orderedIds: string[],
  versionId?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };
    if (versionId) {
      const { error: draftError } = await assertDraftVersion(supabase, studyId, versionId);
      if (draftError) return { error: draftError };
    }

    await Promise.all(
      orderedIds.map((id, idx) => {
        let q = supabase
          .from('study_crfs')
          .update({ sort_order: idx })
          .eq('id', id)
          .eq('study_id', studyId);
        if (versionId) q = q.eq('template_version_id', versionId);
        return q;
      })
    );
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

// ─── CRF Questions ─────────────────────────────────────────────────────────────

const SELECT_TYPES: QuestionType[] = ['single_select', 'multi_select'];

function normalizeOptions(
  questionType: QuestionType,
  rawOptions: string[] | null | undefined
): string[] | null {
  if (!SELECT_TYPES.includes(questionType)) return null;
  if (!rawOptions) return [];
  return rawOptions.map((o) => o.trim()).filter((o) => o.length > 0);
}

export async function listCrfQuestions(crfId: string): Promise<StudyCrfQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_crf_questions')
    .select('*')
    .eq('crf_id', crfId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as StudyCrfQuestion[]) ?? [];
}

export async function createCrfQuestion(
  studyId: string,
  crfId: string,
  input: {
    label: string;
    help_text?: string | null;
    question_type: QuestionType;
    options?: string[] | null;
    required?: boolean;
    sort_order?: number;
  }
): Promise<{ data: StudyCrfQuestion | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { data: null, error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { data: null, error: writeGuard };

    const crfRow = await loadCrfRow(supabase, crfId);
    if (!crfRow || crfRow.study_id !== studyId) {
      return { data: null, error: 'CRF does not belong to this study.' };
    }
    const { error: draftError } = await assertDraftVersion(
      supabase,
      studyId,
      crfRow.template_version_id
    );
    if (draftError) return { data: null, error: draftError };

    const trimmedLabel = input.label.trim();
    if (!trimmedLabel) return { data: null, error: 'Question label is required.' };

    const opts = normalizeOptions(input.question_type, input.options ?? null);
    if (SELECT_TYPES.includes(input.question_type) && (!opts || opts.length === 0)) {
      return { data: null, error: 'Select-type questions require at least one option.' };
    }

    const { count } = await supabase
      .from('study_crf_questions')
      .select('*', { count: 'exact', head: true })
      .eq('crf_id', crfId);
    const nextOrder = input.sort_order ?? (typeof count === 'number' ? count : 0);

    const { data, error } = await supabase
      .from('study_crf_questions')
      .insert({
        crf_id: crfId,
        template_version_id: crfRow.template_version_id,
        label: trimmedLabel,
        help_text: input.help_text?.trim() ? input.help_text.trim() : null,
        question_type: input.question_type,
        options: opts,
        required: input.required ?? false,
        sort_order: nextOrder,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };

    revalidateStudyCtmsLayout(studyId);
    return { data: data as unknown as StudyCrfQuestion, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function updateCrfQuestion(
  id: string,
  studyId: string,
  crfId: string,
  updates: {
    label?: string;
    help_text?: string | null;
    question_type?: QuestionType;
    options?: string[] | null;
    required?: boolean;
    sort_order?: number;
    crf_id?: string;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const crfRow = await loadCrfRow(supabase, crfId);
    if (!crfRow || crfRow.study_id !== studyId) {
      return { error: 'CRF does not belong to this study.' };
    }
    const { error: draftError } = await assertDraftVersion(
      supabase,
      studyId,
      crfRow.template_version_id
    );
    if (draftError) return { error: draftError };

    const { data: existing, error: loadError } = await supabase
      .from('study_crf_questions')
      .select('id, crf_id, question_type, options')
      .eq('id', id)
      .maybeSingle();
    if (loadError) return { error: loadError.message };
    if (!existing || existing.crf_id !== crfId) return { error: 'Question not found.' };

    const payload: {
      label?: string;
      help_text?: string | null;
      question_type?: QuestionType;
      options?: string[] | null;
      required?: boolean;
      sort_order?: number;
      crf_id?: string;
    } = {};

    if (typeof updates.label === 'string') {
      const trimmed = updates.label.trim();
      if (!trimmed) return { error: 'Question label is required.' };
      payload.label = trimmed;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'help_text')) {
      payload.help_text = updates.help_text?.trim() ? updates.help_text.trim() : null;
    }

    const nextType = (updates.question_type ?? (existing.question_type as QuestionType)) as QuestionType;
    const optionsProvided = Object.prototype.hasOwnProperty.call(updates, 'options');
    const typeChanged = updates.question_type && updates.question_type !== existing.question_type;

    if (updates.question_type) payload.question_type = updates.question_type;

    if (optionsProvided || typeChanged) {
      const sourceOptions = optionsProvided
        ? (updates.options ?? null)
        : ((existing.options as string[] | null) ?? null);
      const opts = normalizeOptions(nextType, sourceOptions);
      if (SELECT_TYPES.includes(nextType) && (!opts || opts.length === 0)) {
        return { error: 'Select-type questions require at least one option.' };
      }
      payload.options = opts;
    }

    if (typeof updates.required === 'boolean') payload.required = updates.required;
    if (typeof updates.sort_order === 'number') payload.sort_order = updates.sort_order;

    if (typeof updates.crf_id === 'string' && updates.crf_id !== crfId) {
      const targetRow = await loadCrfRow(supabase, updates.crf_id);
      if (!targetRow || targetRow.study_id !== studyId) {
        return { error: 'Target CRF does not belong to this study.' };
      }
      if (targetRow.template_version_id !== crfRow.template_version_id) {
        return { error: 'Cannot move a question across template versions.' };
      }
      payload.crf_id = updates.crf_id;
      if (typeof updates.sort_order !== 'number') {
        const { count } = await supabase
          .from('study_crf_questions')
          .select('*', { count: 'exact', head: true })
          .eq('crf_id', updates.crf_id);
        payload.sort_order = typeof count === 'number' ? count : 0;
      }
    }

    const { error } = await supabase.from('study_crf_questions').update(payload).eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function deleteCrfQuestion(
  id: string,
  studyId: string,
  crfId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const crfRow = await loadCrfRow(supabase, crfId);
    if (!crfRow || crfRow.study_id !== studyId) {
      return { error: 'CRF does not belong to this study.' };
    }
    const { error: draftError } = await assertDraftVersion(
      supabase,
      studyId,
      crfRow.template_version_id
    );
    if (draftError) return { error: draftError };

    const { error } = await supabase
      .from('study_crf_questions')
      .delete()
      .eq('id', id)
      .eq('crf_id', crfId);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function reorderCrfQuestions(
  studyId: string,
  crfId: string,
  orderedIds: string[]
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const crfRow = await loadCrfRow(supabase, crfId);
    if (!crfRow || crfRow.study_id !== studyId) {
      return { error: 'CRF does not belong to this study.' };
    }
    const { error: draftError } = await assertDraftVersion(
      supabase,
      studyId,
      crfRow.template_version_id
    );
    if (draftError) return { error: draftError };

    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase
          .from('study_crf_questions')
          .update({ sort_order: idx })
          .eq('id', id)
          .eq('crf_id', crfId)
      )
    );
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}
