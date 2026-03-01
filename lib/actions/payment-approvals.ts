'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  PaymentApprovalConfig,
  PaymentApprovalConfigWithRelations,
  PaymentApproval,
  PaymentApprovalWithRelations,
  CreateApprovalConfigData,
  UpdateApprovalConfigData,
  ApprovalDecisionData,
} from '@/lib/types/payment-approvals';
import type { ActionResponse } from '@/lib/types';

// =============================================
// APPROVAL CONFIGS
// =============================================

export async function getApprovalConfigs(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<PaymentApprovalConfigWithRelations[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('payment_approval_configs')
      .select(`
        *,
        protocol:clinical_protocols(protocol_number, title)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    // Fetch approvers for each config
    const configs = (data || []) as PaymentApprovalConfigWithRelations[];
    for (const config of configs) {
      const { data: approvers } = await supabase
        .from('payment_approval_config_approvers')
        .select(`
          *,
          approver:profiles(id, first_name, last_name, email)
        `)
        .eq('config_id', config.id)
        .order('approval_level');
      config.approvers = approvers || [];
    }

    return { success: true, data: configs };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch configs' };
  }
}

export async function createApprovalConfig(
  companyId: string,
  input: CreateApprovalConfigData,
  approverProfileIds?: string[]
): Promise<ActionResponse<PaymentApprovalConfig>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_approval_configs')
      .insert({
        company_id: companyId,
        protocol_id: input.protocol_id || null,
        payment_type: input.payment_type,
        auto_approve: input.auto_approve || false,
        auto_approve_threshold: input.auto_approve_threshold || null,
        required_approvers: input.required_approvers || 1,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    if (approverProfileIds?.length) {
      const approvers = approverProfileIds.map((profileId, index) => ({
        config_id: data.id,
        approver_profile_id: profileId,
        approval_level: index + 1,
      }));
      await supabase.from('payment_approval_config_approvers').insert(approvers);
    }

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as PaymentApprovalConfig };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create config' };
  }
}

export async function updateApprovalConfig(
  configId: string,
  input: UpdateApprovalConfigData
): Promise<ActionResponse<PaymentApprovalConfig>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_approval_configs')
      .update(input)
      .eq('id', configId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as PaymentApprovalConfig };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update config' };
  }
}

export async function deleteApprovalConfig(configId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('payment_approval_configs').delete().eq('id', configId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete config' };
  }
}

// =============================================
// PAYMENT APPROVALS
// =============================================

export async function getApprovalsForRecord(
  paymentRecordId: string
): Promise<ActionResponse<PaymentApprovalWithRelations[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        approver:profiles(id, first_name, last_name, email)
      `)
      .eq('payment_record_id', paymentRecordId)
      .order('approval_level');

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as PaymentApprovalWithRelations[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch approvals' };
  }
}

export async function getPendingApprovals(
  companyId: string,
  approverProfileId: string
): Promise<ActionResponse<PaymentApprovalWithRelations[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        approver:profiles(id, first_name, last_name, email),
        payment_record:payment_records(payment_number, earned_amount, status)
      `)
      .eq('company_id', companyId)
      .eq('approver_id', approverProfileId)
      .eq('decision', 'pending')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as PaymentApprovalWithRelations[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch pending approvals' };
  }
}

export async function submitApprovalDecision(
  approvalId: string,
  input: ApprovalDecisionData
): Promise<ActionResponse<PaymentApproval>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_approvals')
      .update({
        decision: input.decision,
        comments: input.comments || null,
        decided_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Check if all approvals are complete for this record
    const { data: allApprovals } = await supabase
      .from('payment_approvals')
      .select('decision')
      .eq('payment_record_id', input.payment_record_id);

    if (allApprovals) {
      const allDecided = allApprovals.every((a) => a.decision !== 'pending');
      const allApproved = allApprovals.every((a) => a.decision === 'approved');
      const anyRejected = allApprovals.some((a) => a.decision === 'rejected');

      if (allDecided) {
        const newStatus = anyRejected ? 'rejected' : allApproved ? 'approved' : 'rejected';
        await supabase
          .from('payment_records')
          .update({ status: newStatus })
          .eq('id', input.payment_record_id);
      }
    }

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as PaymentApproval };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit decision' };
  }
}

// =============================================
// SUBMIT PAYMENT FOR APPROVAL
// =============================================

export async function submitPaymentForApproval(
  companyId: string,
  paymentRecordId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    // Get the payment record to determine type
    const { data: record } = await supabase
      .from('payment_records')
      .select('payment_type, earned_amount, protocol_id')
      .eq('id', paymentRecordId)
      .single();

    if (!record) return { success: false, error: 'Payment record not found' };

    // Find applicable approval config
    const { data: configs } = await supabase
      .from('payment_approval_configs')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .or(`protocol_id.eq.${record.protocol_id},protocol_id.is.null`)
      .or(`payment_type.eq.${record.payment_type},payment_type.eq.all`)
      .order('protocol_id', { ascending: false, nullsFirst: false })
      .limit(1);

    const config = configs?.[0];

    if (!config) {
      // No config, auto-approve
      await supabase
        .from('payment_records')
        .update({ status: 'approved' })
        .eq('id', paymentRecordId);
      revalidatePath('/protected/clinical-payments');
      return { success: true, data: null };
    }

    // Check auto-approve threshold
    if (config.auto_approve && config.auto_approve_threshold &&
        Number(record.earned_amount) <= Number(config.auto_approve_threshold)) {
      await supabase
        .from('payment_records')
        .update({ status: 'approved' })
        .eq('id', paymentRecordId);
      revalidatePath('/protected/clinical-payments');
      return { success: true, data: null };
    }

    // Get designated approvers
    const { data: approvers } = await supabase
      .from('payment_approval_config_approvers')
      .select('approver_profile_id, approval_level')
      .eq('config_id', config.id)
      .order('approval_level');

    if (!approvers?.length) {
      await supabase
        .from('payment_records')
        .update({ status: 'approved' })
        .eq('id', paymentRecordId);
      revalidatePath('/protected/clinical-payments');
      return { success: true, data: null };
    }

    // Create approval records
    const approvalRecords = approvers.map((a) => ({
      company_id: companyId,
      payment_record_id: paymentRecordId,
      approver_id: a.approver_profile_id,
      approval_level: a.approval_level,
      decision: 'pending' as const,
    }));

    const { error } = await supabase.from('payment_approvals').insert(approvalRecords);
    if (error) return { success: false, error: error.message };

    // Update payment record status
    await supabase
      .from('payment_records')
      .update({ status: 'pending_approval' })
      .eq('id', paymentRecordId);

    // Create notifications for approvers
    for (const approver of approvers) {
      await supabase.from('payment_notifications').insert({
        company_id: companyId,
        recipient_id: approver.approver_profile_id,
        notification_type: 'approval_required',
        title: 'Payment Approval Required',
        message: `A payment record requires your approval.`,
        payment_record_id: paymentRecordId,
      });
    }

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit for approval' };
  }
}
