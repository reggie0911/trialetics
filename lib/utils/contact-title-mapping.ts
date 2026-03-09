/**
 * Maps legacy contact.title (ContactRole enum) to the best matching ctms_roles.slug.
 * Used during the migration from the single contact.title column to the
 * many-to-many contact_role_assignments + ctms_roles system.
 *
 * Where no exact slug match exists in ctms_roles, the closest equivalent is used.
 * Values that cannot be mapped are left null and will be skipped during migration.
 */

import type { ContactRole } from '@/lib/types/contacts-organizations';

export const CONTACT_ROLE_TO_CTMS_SLUG: Record<ContactRole, string | null> = {
  principal_investigator: 'principal_investigator',
  co_principal_investigator: 'co_investigator',
  sub_investigator: 'sub_investigator',
  lead_research_coordinator: 'clinical_research_coordinator',
  research_coordinator: 'clinical_research_coordinator',
  research_director: 'project_director',
  coordinator: 'study_coordinator',
  pharmacist: 'pharmacist',
  site_staff: 'research_assistant',
  sponsor_rep: 'sponsor_user',
  cro_rep: 'cro_user',
  clinical_research_associate: 'clinical_research_associate',
  regulatory: 'regulatory_specialist',
  lab_director: 'central_lab_project_manager',
  qa_lead: 'quality_assurance_auditor',
  project_manager: 'cro_project_manager',
  data_manager: 'cro_clinical_data_manager',
  finance: 'clinical_finance_manager',
  contracts: 'contracts_manager',
  other: null,
};

/**
 * Returns the ctms_roles.slug for a legacy ContactRole value.
 * Returns null if no mapping exists (e.g. "other").
 */
export function ctmsSlugForContactRole(role: string): string | null {
  return CONTACT_ROLE_TO_CTMS_SLUG[role as ContactRole] ?? null;
}

/**
 * Resolves the human-readable display title for a contact.
 * Priority:
 *   1. Primary role assignment name (from ctms_roles)
 *   2. Any role assignment name (first one)
 *   3. Legacy contact.title formatted via CONTACT_ROLE_LABELS
 *   4. null
 */
export function getContactDisplayTitle(
  roleAssignments: Array<{ is_primary: boolean; role?: { name: string } | null }> | null | undefined,
  legacyTitle: string | null | undefined,
  contactRoleLabels: Record<string, string>,
): string | null {
  if (roleAssignments && roleAssignments.length > 0) {
    const primary = roleAssignments.find((ra) => ra.is_primary);
    const target = primary ?? roleAssignments[0];
    if (target?.role?.name) return target.role.name;
  }
  if (legacyTitle) {
    return contactRoleLabels[legacyTitle] ?? legacyTitle;
  }
  return null;
}
