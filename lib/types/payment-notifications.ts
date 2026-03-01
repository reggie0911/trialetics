// =============================================
// Payment Notifications Types
// GAP P8: Payment Notifications
// =============================================

export type PaymentNotificationType =
  | 'payment_generated'
  | 'approval_required'
  | 'approval_decision'
  | 'payment_processed'
  | 'payment_overdue'
  | 'batch_complete';

export const NOTIFICATION_TYPE_LABELS: Record<PaymentNotificationType, string> = {
  payment_generated: 'Payment Generated',
  approval_required: 'Approval Required',
  approval_decision: 'Approval Decision',
  payment_processed: 'Payment Processed',
  payment_overdue: 'Payment Overdue',
  batch_complete: 'Batch Complete',
};

export interface PaymentNotification {
  id: string;
  company_id: string;
  recipient_id: string;
  notification_type: PaymentNotificationType;
  title: string;
  message: string;
  payment_record_id: string | null;
  invoice_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface PaymentNotificationWithRelations extends PaymentNotification {
  recipient?: { first_name: string | null; last_name: string | null; email: string | null } | null;
  payment_record?: { payment_number: string | null } | null;
  invoice?: { invoice_number: string | null } | null;
}

export interface CreateNotificationData {
  recipient_id: string;
  notification_type: PaymentNotificationType;
  title: string;
  message: string;
  payment_record_id?: string | null;
  invoice_id?: string | null;
}
