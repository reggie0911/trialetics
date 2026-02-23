export type SponsorStatus = 'present' | 'missing' | 'expired';
export type SiteStatus = 'present' | 'missing' | 'expired';
export type MatchStatus = 'match' | 'mismatch' | 'sponsor_only' | 'site_only';

export const SPONSOR_STATUS_LABELS: Record<SponsorStatus, string> = {
  present: 'Present',
  missing: 'Missing',
  expired: 'Expired',
};

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  present: 'Present',
  missing: 'Missing',
  expired: 'Expired',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  match: 'Match',
  mismatch: 'Mismatch',
  sponsor_only: 'Sponsor Only',
  site_only: 'Site Only',
};

export interface ReconciliationRecord {
  id: string;
  company_id: string;
  protocol_id: string;
  site_id: string;
  document_type: string;
  sponsor_status: SponsorStatus;
  site_status: SiteStatus;
  match_status: MatchStatus;
  sponsor_expiration_date: string | null;
  site_expiration_date: string | null;
  last_checked_date: string | null;
  resolved_date: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
  site?: { id: string; site_number: string | null; organization?: { name: string } | null } | null;
}

export interface CreateReconciliationRecordInput {
  protocol_id: string;
  site_id: string;
  document_type: string;
  sponsor_status: SponsorStatus;
  site_status: SiteStatus;
  match_status: MatchStatus;
  sponsor_expiration_date?: string | null;
  site_expiration_date?: string | null;
  last_checked_date?: string | null;
  resolution_notes?: string | null;
}

export interface UpdateReconciliationRecordInput {
  sponsor_status?: SponsorStatus;
  site_status?: SiteStatus;
  match_status?: MatchStatus;
  sponsor_expiration_date?: string | null;
  site_expiration_date?: string | null;
  last_checked_date?: string | null;
  resolved_date?: string | null;
  resolution_notes?: string | null;
}
