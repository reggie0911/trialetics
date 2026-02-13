'use server';

import { createClient } from '@/lib/server';

export interface ContactForOrgChart {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string | null;
  manager_id: string | null;
  manager?: ContactForOrgChart | null;
  children?: ContactForOrgChart[];
}

export async function getContactsForOrgChart(
  companyId: string,
  organizationId?: string | null
): Promise<ContactForOrgChart[]> {
  const supabase = await createClient();

  let query = supabase
    .from('contacts')
    .select(`
      id,
      first_name,
      last_name,
      email,
      title,
      manager_id
    `)
    .eq('company_id', companyId)
    .eq('status', 'active');

  if (organizationId) {
    const { data: ocData } = await supabase
      .from('organization_contacts')
      .select('contact_id')
      .eq('organization_id', organizationId);
    const contactIds = (ocData || []).map((oc) => oc.contact_id);
    if (contactIds.length > 0) {
      query = query.in('id', contactIds);
    }
  }

  const { data, error } = await query.order('last_name', { ascending: true });

  if (error) return [];

  const contacts = (data || []) as ContactForOrgChart[];
  const byId = new Map(contacts.map((c) => [c.id, { ...c, children: [] as ContactForOrgChart[] }]));

  const roots: ContactForOrgChart[] = [];

  for (const c of contacts) {
    const node = byId.get(c.id)!;
    if (c.manager_id && byId.has(c.manager_id)) {
      byId.get(c.manager_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
