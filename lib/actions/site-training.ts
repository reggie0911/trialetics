'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  SiteTrainingPlan,
  SiteTrainingTopic,
  ContactTrainingCompletion,
} from '@/lib/types/clinical-training';
import { getTrainingPlanVersionTopics } from './training-plans';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Add a training plan to a site. Copies version topics to site_training_topics and associates contacts by role. */
export async function addTrainingPlanToSite(
  clinicalSiteId: string,
  trainingPlanVersionId: string
): Promise<ActionResponse<SiteTrainingPlan>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: site } = await supabase
      .from('clinical_sites')
      .select('id, protocol_id, company_id')
      .eq('id', clinicalSiteId)
      .single();

    if (!site) return { success: false, error: 'Site not found' };

    const { data: version } = await supabase
      .from('training_plan_versions')
      .select('id, training_plan_id, status')
      .eq('id', trainingPlanVersionId)
      .single();

    if (!version || version.status !== 'approved') {
      return { success: false, error: 'Only approved plan versions can be added to sites' };
    }

    const { data: planLink, error: insertError } = await supabase
      .from('site_training_plans')
      .insert({
        clinical_site_id: clinicalSiteId,
        training_plan_version_id: trainingPlanVersionId,
      })
      .select()
      .single();

    if (insertError) return { success: false, error: insertError.message };

    const topicsRes = await getTrainingPlanVersionTopics(version.id);
    if (!topicsRes.success || !topicsRes.data) return { success: true, data: planLink as SiteTrainingPlan };

    const topics = topicsRes.data.map((t) => t.topic).filter(Boolean);

    for (const topic of topics) {
      if (topic.obsolete_date) continue;

      const { data: stt, error: sttErr } = await supabase
        .from('site_training_topics')
        .upsert(
          {
            clinical_site_id: clinicalSiteId,
            training_topic_id: topic.id,
            source: 'from_plan',
          },
          { onConflict: 'clinical_site_id,training_topic_id' }
        )
        .select()
        .single();

      if (sttErr) continue;
      if (!stt) continue;

      const { data: contacts } = await supabase
        .from('protocol_contacts')
        .select('id, role, clinical_site_id')
        .eq('protocol_id', site.protocol_id)
        .or(`clinical_site_id.eq.${clinicalSiteId},clinical_site_id.is.null`);

      const contactList = contacts || [];
      const topicRoles = topic.role || [];
      const topicAppliesToAll = !topicRoles || topicRoles.length === 0;

      for (const pc of contactList) {
        if (pc.clinical_site_id !== null && pc.clinical_site_id !== clinicalSiteId) continue;
        const roleMatches = topicAppliesToAll || topicRoles.includes(pc.role);
        if (!roleMatches) continue;

        await supabase
          .from('contact_training_completion')
          .upsert(
            {
              protocol_contact_id: pc.id,
              site_training_topic_id: stt.id,
              completed: false,
            },
            { onConflict: 'protocol_contact_id,site_training_topic_id' }
          );
      }
    }

    revalidatePath(`/protected/clinical-training/sites/${clinicalSiteId}`);
    revalidatePath('/protected/clinical-training');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: planLink as SiteTrainingPlan };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function removeTrainingPlanFromSite(
  clinicalSiteId: string,
  siteTrainingPlanId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: stp } = await supabase
      .from('site_training_plans')
      .select('id, training_plan_version_id')
      .eq('id', siteTrainingPlanId)
      .eq('clinical_site_id', clinicalSiteId)
      .single();

    if (!stp) return { success: false, error: 'Site training plan not found' };

    const { data: versionTopics } = await supabase
      .from('training_plan_version_topics')
      .select('training_topic_id')
      .eq('version_id', stp.training_plan_version_id);

    const topicIds = (versionTopics || []).map((t) => t.training_topic_id);

    const { data: siteTopics } = await supabase
      .from('site_training_topics')
      .select('id')
      .eq('clinical_site_id', clinicalSiteId)
      .eq('source', 'from_plan')
      .in('training_topic_id', topicIds);

    const siteTopicIds = (siteTopics || []).map((t) => t.id);

    if (siteTopicIds.length > 0) {
      await supabase.from('contact_training_completion').delete().in('site_training_topic_id', siteTopicIds);
      await supabase.from('site_training_topics').delete().in('id', siteTopicIds);
    }

    const { error } = await supabase.from('site_training_plans').delete().eq('id', siteTrainingPlanId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/protected/clinical-training/sites/${clinicalSiteId}`);
    revalidatePath('/protected/clinical-training');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function addTopicToSite(
  clinicalSiteId: string,
  trainingTopicId: string
): Promise<ActionResponse<SiteTrainingTopic>> {
  try {
    const supabase = await createClient();
    const { data: topic } = await supabase
      .from('training_topics')
      .select('id, obsolete_date')
      .eq('id', trainingTopicId)
      .single();

    if (!topic || topic.obsolete_date) {
      return { success: false, error: 'Topic not found or obsolete' };
    }

    const { data: site } = await supabase
      .from('clinical_sites')
      .select('id, protocol_id')
      .eq('id', clinicalSiteId)
      .single();

    if (!site) return { success: false, error: 'Site not found' };

    const { data: stt, error: sttErr } = await supabase
      .from('site_training_topics')
      .insert({
        clinical_site_id: clinicalSiteId,
        training_topic_id: trainingTopicId,
        source: 'manual',
      })
      .select()
      .single();

    if (sttErr) return { success: false, error: sttErr.message };

    const { data: fullTopic } = await supabase.from('training_topics').select('*').eq('id', trainingTopicId).single();
    const topicRoles = (fullTopic?.role || []) as string[];
    const topicAppliesToAll = !topicRoles || topicRoles.length === 0;

    const { data: contacts } = await supabase
      .from('protocol_contacts')
      .select('id, role, clinical_site_id')
      .or(`clinical_site_id.eq.${clinicalSiteId},clinical_site_id.is.null`)
      .eq('protocol_id', site.protocol_id);

    for (const pc of contacts || []) {
      if (pc.clinical_site_id !== null && pc.clinical_site_id !== clinicalSiteId) continue;
      const roleMatches = topicAppliesToAll || topicRoles.includes(pc.role);
      if (!roleMatches) continue;

      await supabase.from('contact_training_completion').upsert(
        {
          protocol_contact_id: pc.id,
          site_training_topic_id: stt.id,
          completed: false,
        },
        { onConflict: 'protocol_contact_id,site_training_topic_id' }
      );
    }

    revalidatePath(`/protected/clinical-training/sites/${clinicalSiteId}`);
    revalidatePath('/protected/clinical-training');
    return { success: true, data: stt as SiteTrainingTopic };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function removeTopicFromSite(
  siteTrainingTopicId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: stt } = await supabase
      .from('site_training_topics')
      .select('id, training_topic_id')
      .eq('id', siteTrainingTopicId)
      .single();

    if (!stt) return { success: false, error: 'Site training topic not found' };

    const { data: topic } = await supabase
      .from('training_topics')
      .select('mandatory')
      .eq('id', stt.training_topic_id)
      .single();

    if (topic?.mandatory) {
      return { success: false, error: 'Cannot remove mandatory topic' };
    }

    await supabase.from('contact_training_completion').delete().eq('site_training_topic_id', siteTrainingTopicId);
    const { error } = await supabase.from('site_training_topics').delete().eq('id', siteTrainingTopicId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-training');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getSiteTrainingPlans(
  clinicalSiteId: string
): Promise<ActionResponse<{ plan: SiteTrainingPlan; version: { name: string; version_number: number }; training_plan: { name: string } }[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_training_plans')
      .select(`
        *,
        training_plan_versions (id, name, version_number, training_plans (name))
      `)
      .eq('clinical_site_id', clinicalSiteId);

    if (error) return { success: false, error: error.message };
    const items = (data || []).map((stp: any) => {
      const v = Array.isArray(stp.training_plan_versions) ? stp.training_plan_versions[0] : stp.training_plan_versions;
      const tp = v?.training_plans;
      return {
        plan: stp as SiteTrainingPlan,
        version: v ? { name: v.name, version_number: v.version_number } : { name: '', version_number: 0 },
        training_plan: tp ? { name: tp.name } : { name: '' },
      };
    });
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getSiteTrainingTopics(
  clinicalSiteId: string
): Promise<ActionResponse<{ stt: SiteTrainingTopic; topic: any; contacts_completed: number; contacts_not_completed: number }[]>> {
  try {
    const supabase = await createClient();
    const { data: sttList, error } = await supabase
      .from('site_training_topics')
      .select(`
        *,
        training_topics (*)
      `)
      .eq('clinical_site_id', clinicalSiteId);

    if (error) return { success: false, error: error.message };

    const result: { stt: SiteTrainingTopic; topic: any; contacts_completed: number; contacts_not_completed: number }[] = [];

    for (const stt of sttList || []) {
      const topic = (stt as any).training_topics;
      const { count: completed } = await supabase
        .from('contact_training_completion')
        .select('*', { count: 'exact', head: true })
        .eq('site_training_topic_id', stt.id)
        .eq('completed', true);

      const { count: total } = await supabase
        .from('contact_training_completion')
        .select('*', { count: 'exact', head: true })
        .eq('site_training_topic_id', stt.id);

      result.push({
        stt: stt as SiteTrainingTopic,
        topic,
        contacts_completed: completed || 0,
        contacts_not_completed: (total || 0) - (completed || 0),
      });
    }

    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getContactCompletionForSiteTopic(
  siteTrainingTopicId: string
): Promise<ActionResponse<ContactTrainingCompletion[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contact_training_completion')
      .select(`
        *,
        protocol_contacts (id, contacts(first_name, last_name, email))
      `)
      .eq('site_training_topic_id', siteTrainingTopicId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ContactTrainingCompletion[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function markContactTrainingComplete(
  contactCompletionId: string,
  completed: boolean
): Promise<ActionResponse<ContactTrainingCompletion>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contact_training_completion')
      .update({
        completed,
        completed_date: completed ? new Date().toISOString() : null,
      })
      .eq('id', contactCompletionId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ContactTrainingCompletion };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function markAllContactsCompleteForTopic(
  siteTrainingTopicId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('contact_training_completion')
      .update({
        completed: true,
        completed_date: new Date().toISOString(),
      })
      .eq('site_training_topic_id', siteTrainingTopicId);

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
