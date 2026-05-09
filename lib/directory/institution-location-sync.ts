import type { InstitutionRow } from '@/lib/types/directory';

/**
 * Maps an institution's stored address fields to directory contact `country_code` / `region`.
 * Used when the user picks a primary organization so the contact row can inherit location.
 */
export function contactLocationFromInstitution(
  institution: InstitutionRow | null | undefined,
): { country_code: string; region: string } {
  if (!institution) {
    return { country_code: '', region: '' };
  }
  const region =
    institution.region?.trim() || institution.state_region?.trim() || '';
  return {
    country_code: institution.country_code?.trim() ?? '',
    region,
  };
}
