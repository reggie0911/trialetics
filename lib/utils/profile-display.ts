/** Shape of profile name fields from Supabase joins (no `full_name` column on `profiles`). */
export type ProfileNameFields = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export function profileDisplayLabel(p: ProfileNameFields | null | undefined): string {
  if (!p) return 'Unknown';
  const d = p.display_name?.trim();
  if (d) return d;
  const parts = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  return p.email?.trim() || 'Unknown';
}
