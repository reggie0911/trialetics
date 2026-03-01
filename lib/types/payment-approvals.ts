// =============================================
// Payment Approval Workflow Types
// GAP P2: Payment Approval Workflow
// =============================================

export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

export const APPROVAL_DECISION_LABELS: Record<ApprovalDecision, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export interface PaymentApprovalConfig {
  id: string;
  company_id: string;
  protocol_id: string | null;
  payment_type: 'interim' | 'final' | 'unplanned' | 'all';
  auto_approve: boolean;
  auto_approve_threshold: number | null;
  required_approvers: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentApprovalConfigWithRelations extends PaymentApprovalConfig {
  protocol?: { protocol_number: string; title: string } | null;
  approvers?: PaymentApprovalConfigApprover[];
}

export interface PaymentApprovalConfigApprover {
  id: string;
  config_id: string;
  approver_profile_id: string;
  approval_level: number;
  created_at: string;
  approver?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
}

export interface PaymentApproval {
  id: string;
  company_id: string;
  payment_record_id: string;
  approver_id: string;
  approval_level: number;
  decision: ApprovalDecision;
  comments: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface PaymentApprovalWithRelations extends PaymentApproval {
  approver?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  payment_record?: { payment_number: string | null; earned_amount: number; status: string } | null;
}

export interface CreateApprovalConfigData {
  protocol_id?: string | null;
  payment_type: 'interim' | 'final' | 'unplanned' | 'all';
  auto_approve?: boolean;
  auto_approve_threshold?: number | null;
  required_approvers?: number;
}

export interface UpdateApprovalConfigData {
  payment_type?: 'interim' | 'final' | 'unplanned' | 'all';
  auto_approve?: boolean;
  auto_approve_threshold?: number | null;
  required_approvers?: number;
  is_active?: boolean;
}

export interface ApprovalDecisionData {
  payment_record_id: string;
  decision: 'approved' | 'rejected';
  comments?: string | null;
}
