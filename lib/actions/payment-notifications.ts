'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  PaymentNotification,
  PaymentNotificationWithRelations,
  CreateNotificationData,
} from '@/lib/types/payment-notifications';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET NOTIFICATIONS
// =============================================

export async function getPaymentNotifications(
  companyId: string,
  recipientId: string,
  unreadOnly?: boolean
): Promise<ActionResponse<PaymentNotificationWithRelations[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('payment_notifications')
      .select(`
        *,
        payment_record:payment_records(payment_number),
        invoice:invoices(invoice_number)
      `)
      .eq('company_id', companyId)
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) query = query.eq('is_read', false);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data || []) as PaymentNotificationWithRelations[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch notifications' };
  }
}

// =============================================
// GET UNREAD COUNT
// =============================================

export async function getUnreadNotificationCount(
  companyId: string,
  recipientId: string
): Promise<ActionResponse<number>> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('payment_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('recipient_id', recipientId)
      .eq('is_read', false);

    if (error) return { success: false, error: error.message };

    return { success: true, data: count || 0 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get count' };
  }
}

// =============================================
// CREATE NOTIFICATION
// =============================================

export async function createPaymentNotification(
  companyId: string,
  input: CreateNotificationData
): Promise<ActionResponse<PaymentNotification>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_notifications')
      .insert({
        company_id: companyId,
        recipient_id: input.recipient_id,
        notification_type: input.notification_type,
        title: input.title,
        message: input.message,
        payment_record_id: input.payment_record_id || null,
        invoice_id: input.invoice_id || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data: data as PaymentNotification };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create notification' };
  }
}

// =============================================
// MARK AS READ
// =============================================

export async function markNotificationAsRead(
  notificationId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('payment_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) return { success: false, error: error.message };

    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark as read' };
  }
}

// =============================================
// MARK ALL AS READ
// =============================================

export async function markAllNotificationsAsRead(
  companyId: string,
  recipientId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('payment_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('recipient_id', recipientId)
      .eq('is_read', false);

    if (error) return { success: false, error: error.message };

    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark all as read' };
  }
}

// =============================================
// NOTIFY BATCH COMPLETE
// =============================================

export async function notifyBatchPaymentComplete(
  companyId: string,
  recipientIds: string[],
  recordCount: number,
  totalAmount: number
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const notifications = recipientIds.map((recipientId) => ({
      company_id: companyId,
      recipient_id: recipientId,
      notification_type: 'batch_complete' as const,
      title: 'Batch Payment Generation Complete',
      message: `${recordCount} payment records totaling $${totalAmount.toFixed(2)} have been generated.`,
    }));

    const { error } = await supabase.from('payment_notifications').insert(notifications);
    if (error) return { success: false, error: error.message };

    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send notifications' };
  }
}

// =============================================
// NOTIFY PAYMENT PROCESSED
// =============================================

export async function notifyPaymentProcessed(
  companyId: string,
  recipientId: string,
  paymentRecordId: string,
  paymentNumber: string | null
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('payment_notifications').insert({
      company_id: companyId,
      recipient_id: recipientId,
      notification_type: 'payment_processed',
      title: 'Payment Processed',
      message: `Payment ${paymentNumber || 'N/A'} has been processed.`,
      payment_record_id: paymentRecordId,
    });

    if (error) return { success: false, error: error.message };

    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send notification' };
  }
}
