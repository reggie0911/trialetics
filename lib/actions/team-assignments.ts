'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  CreateTeamAssignmentData,
  UpdateTeamAssignmentData,
  ProtocolTeamWithRelations,
  RegionTeamWithRelations,
  SiteTeamWithRelations,
  TeamAssignmentFilters,
  TeamAssignmentHistoryWithRelations,
  TeamAssignmentHistoryFilters,
} from '@/lib/types/clinical-trials';

// =============================================
// Get Company Profiles (for team assignment user picker)
// =============================================

export async function getCompanyProfilesForTeam(companyId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching company profiles:', error);
      return { success: false as const, error: 'Failed to fetch users', data: null };
    }

    return { success: true as const, data: data || [], error: null };
  } catch (error) {
    console.error('Error in getCompanyProfilesForTeam:', error);
    return { success: false as const, error: 'An unexpected error occurred', data: null };
  }
}

// =============================================
// Get Team Assignments
// =============================================

export async function getTeamAssignments(
  companyId: string,
  filters: TeamAssignmentFilters = {}
) {
  const supabase = await createClient();
  const { entity_type, entity_id, user_id, role, status, is_primary, page = 1, pageSize = 50 } = filters;

  try {
    // Determine which table to query based on entity_type
    const tableName = entity_type === 'protocol' 
      ? 'protocol_teams'
      : entity_type === 'region'
      ? 'region_teams'
      : 'site_teams';

    const foreignKey = entity_type === 'protocol'
      ? 'protocol_id'
      : entity_type === 'region'
      ? 'region_id'
      : 'site_id';

    let query = supabase
      .from(tableName)
      .select(
        `
        *,
        user:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (entity_id) {
      query = query.eq(foreignKey, entity_id);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (is_primary !== undefined) {
      query = query.eq('is_primary', is_primary);
    }

    query = query
      .order('start_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching team assignments:', error);
      return {
        success: false,
        error: 'Failed to fetch team assignments',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        assignments: data || [],
        total: count || 0,
        page,
        pageSize,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getTeamAssignments:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Create Team Assignment with Rollup/Rolldown
// =============================================

export async function createTeamAssignment(
  companyId: string,
  profileId: string,
  email: string,
  data: CreateTeamAssignmentData
) {
  const supabase = await createClient();

  try {
    const { entity_type, entity_id, user_id, role, is_primary, start_date, end_date, status, with_rollup, with_rolldown, metadata } = data;

    // Determine table name
    const tableName = entity_type === 'protocol' 
      ? 'protocol_teams'
      : entity_type === 'region'
      ? 'region_teams'
      : 'site_teams';

    const foreignKey = entity_type === 'protocol'
      ? 'protocol_id'
      : entity_type === 'region'
      ? 'region_id'
      : 'site_id';

    // Insert the team assignment
    const insertData = {
      company_id: companyId,
      [foreignKey]: entity_id,
      user_id,
      role,
      is_primary: is_primary || false,
      start_date,
      end_date: end_date || null,
      status: status || 'active',
      metadata: metadata || {},
    };

    const { data: assignment, error: insertError } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating team assignment:', insertError);
      return {
        success: false,
        error: 'Failed to create team assignment',
        data: null,
      };
    }

    // Record in history
    await supabase
      .from('team_assignment_history')
      .insert({
        company_id: companyId,
        entity_type,
        entity_id,
        user_id,
        role,
        start_date,
        end_date: end_date || null,
        is_locked: false,
        changed_by_id: profileId,
        changed_by_email: email,
        metadata: metadata || {},
      });

    // Handle rolldown (cascade to child entities)
    if (with_rolldown && entity_type === 'protocol') {
      // Add to all regions
      const { data: regions } = await supabase
        .from('clinical_regions')
        .select('id')
        .eq('protocol_id', entity_id)
        .eq('company_id', companyId);

      if (regions && regions.length > 0) {
        const regionInserts = regions.map((region) => ({
          company_id: companyId,
          region_id: region.id,
          user_id,
          role,
          is_primary: is_primary || false,
          start_date,
          end_date: end_date || null,
          status: status || 'active',
          metadata: { ...metadata, rolled_down_from: 'protocol' },
        }));

        await supabase.from('region_teams').insert(regionInserts);

        // Also record in history for each region
        const historyInserts = regions.map((region) => ({
          company_id: companyId,
          entity_type: 'region' as const,
          entity_id: region.id,
          user_id,
          role,
          start_date,
          end_date: end_date || null,
          is_locked: false,
          changed_by_id: profileId,
          changed_by_email: email,
          metadata: { ...metadata, rolled_down_from: 'protocol' },
        }));

        await supabase.from('team_assignment_history').insert(historyInserts);
      }

      // Add to all sites under protocol
      const { data: sites } = await supabase
        .from('clinical_sites')
        .select('id')
        .eq('protocol_id', entity_id)
        .eq('company_id', companyId);

      if (sites && sites.length > 0) {
        const siteInserts = sites.map((site) => ({
          company_id: companyId,
          site_id: site.id,
          user_id,
          role,
          is_primary: is_primary || false,
          start_date,
          end_date: end_date || null,
          status: status || 'active',
          metadata: { ...metadata, rolled_down_from: 'protocol' },
        }));

        await supabase.from('site_teams').insert(siteInserts);

        // Also record in history for each site
        const historyInserts = sites.map((site) => ({
          company_id: companyId,
          entity_type: 'site' as const,
          entity_id: site.id,
          user_id,
          role,
          start_date,
          end_date: end_date || null,
          is_locked: false,
          changed_by_id: profileId,
          changed_by_email: email,
          metadata: { ...metadata, rolled_down_from: 'protocol' },
        }));

        await supabase.from('team_assignment_history').insert(historyInserts);
      }
    }

    // Handle rolldown for region to sites
    if (with_rolldown && entity_type === 'region') {
      const { data: sites } = await supabase
        .from('clinical_sites')
        .select('id')
        .eq('region_id', entity_id)
        .eq('company_id', companyId);

      if (sites && sites.length > 0) {
        const siteInserts = sites.map((site) => ({
          company_id: companyId,
          site_id: site.id,
          user_id,
          role,
          is_primary: is_primary || false,
          start_date,
          end_date: end_date || null,
          status: status || 'active',
          metadata: { ...metadata, rolled_down_from: 'region' },
        }));

        await supabase.from('site_teams').insert(siteInserts);

        // Also record in history
        const historyInserts = sites.map((site) => ({
          company_id: companyId,
          entity_type: 'site' as const,
          entity_id: site.id,
          user_id,
          role,
          start_date,
          end_date: end_date || null,
          is_locked: false,
          changed_by_id: profileId,
          changed_by_email: email,
          metadata: { ...metadata, rolled_down_from: 'region' },
        }));

        await supabase.from('team_assignment_history').insert(historyInserts);
      }
    }

    // Handle rollup (cascade to parent entities)
    if (with_rollup && entity_type === 'site') {
      // Get site to find region and protocol
      const { data: site } = await supabase
        .from('clinical_sites')
        .select('region_id, protocol_id')
        .eq('id', entity_id)
        .single();

      if (site) {
        // Add to region if exists
        if (site.region_id) {
          await supabase.from('region_teams').insert({
            company_id: companyId,
            region_id: site.region_id,
            user_id,
            role,
            is_primary: is_primary || false,
            start_date,
            end_date: end_date || null,
            status: status || 'active',
            metadata: { ...metadata, rolled_up_from: 'site' },
          });

          await supabase.from('team_assignment_history').insert({
            company_id: companyId,
            entity_type: 'region',
            entity_id: site.region_id,
            user_id,
            role,
            start_date,
            end_date: end_date || null,
            is_locked: false,
            changed_by_id: profileId,
            changed_by_email: email,
            metadata: { ...metadata, rolled_up_from: 'site' },
          });
        }

        // Add to protocol
        await supabase.from('protocol_teams').insert({
          company_id: companyId,
          protocol_id: site.protocol_id,
          user_id,
          role,
          is_primary: is_primary || false,
          start_date,
          end_date: end_date || null,
          status: status || 'active',
          metadata: { ...metadata, rolled_up_from: 'site' },
        });

        await supabase.from('team_assignment_history').insert({
          company_id: companyId,
          entity_type: 'protocol',
          entity_id: site.protocol_id,
          user_id,
          role,
          start_date,
          end_date: end_date || null,
          is_locked: false,
          changed_by_id: profileId,
          changed_by_email: email,
          metadata: { ...metadata, rolled_up_from: 'site' },
        });
      }
    }

    // Handle rollup for region to protocol
    if (with_rollup && entity_type === 'region') {
      const { data: region } = await supabase
        .from('clinical_regions')
        .select('protocol_id')
        .eq('id', entity_id)
        .single();

      if (region) {
        await supabase.from('protocol_teams').insert({
          company_id: companyId,
          protocol_id: region.protocol_id,
          user_id,
          role,
          is_primary: is_primary || false,
          start_date,
          end_date: end_date || null,
          status: status || 'active',
          metadata: { ...metadata, rolled_up_from: 'region' },
        });

        await supabase.from('team_assignment_history').insert({
          company_id: companyId,
          entity_type: 'protocol',
          entity_id: region.protocol_id,
          user_id,
          role,
          start_date,
          end_date: end_date || null,
          is_locked: false,
          changed_by_id: profileId,
          changed_by_email: email,
          metadata: { ...metadata, rolled_up_from: 'region' },
        });
      }
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data: assignment,
      error: null,
    };
  } catch (error) {
    console.error('Error in createTeamAssignment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Update Team Assignment
// =============================================

export async function updateTeamAssignment(
  companyId: string,
  profileId: string,
  email: string,
  updateData: UpdateTeamAssignmentData
) {
  const supabase = await createClient();

  try {
    const { id, entity_type, is_primary, end_date, status, metadata } = updateData;

    const tableName = entity_type === 'protocol' 
      ? 'protocol_teams'
      : entity_type === 'region'
      ? 'region_teams'
      : 'site_teams';

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (is_primary !== undefined) updates.is_primary = is_primary;
    if (end_date !== undefined) updates.end_date = end_date;
    if (status !== undefined) updates.status = status;
    if (metadata !== undefined) updates.metadata = metadata;

    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating team assignment:', error);
      return {
        success: false,
        error: 'Failed to update team assignment',
        data: null,
      };
    }

    // Record the change in history
    if (end_date) {
      const { data: assignment } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (assignment) {
        const foreignKey = entity_type === 'protocol'
          ? 'protocol_id'
          : entity_type === 'region'
          ? 'region_id'
          : 'site_id';

        await supabase
          .from('team_assignment_history')
          .insert({
            company_id: companyId,
            entity_type,
            entity_id: assignment[foreignKey],
            user_id: assignment.user_id,
            role: assignment.role,
            start_date: assignment.start_date,
            end_date,
            is_locked: true,
            changed_by_id: profileId,
            changed_by_email: email,
            metadata: metadata || assignment.metadata || {},
          });
      }
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error in updateTeamAssignment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Delete Team Assignment
// =============================================

export async function deleteTeamAssignment(
  companyId: string,
  id: string,
  entityType: 'protocol' | 'region' | 'site'
) {
  const supabase = await createClient();

  try {
    const tableName = entityType === 'protocol' 
      ? 'protocol_teams'
      : entityType === 'region'
      ? 'region_teams'
      : 'site_teams';

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting team assignment:', error);
      return {
        success: false,
        error: 'Failed to delete team assignment',
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error in deleteTeamAssignment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// =============================================
// Get Team Assignment History
// =============================================

export async function getTeamAssignmentHistory(
  companyId: string,
  filters: TeamAssignmentHistoryFilters = {}
) {
  const supabase = await createClient();
  const { entity_type, entity_id, user_id, role, page = 1, pageSize = 50 } = filters;

  try {
    let query = supabase
      .from('team_assignment_history')
      .select(
        `
        *,
        user:user_id (
          id,
          first_name,
          last_name,
          email
        ),
        changed_by:changed_by_id (
          id,
          first_name,
          last_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }

    if (entity_id) {
      query = query.eq('entity_id', entity_id);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching team history:', error);
      return {
        success: false,
        error: 'Failed to fetch team history',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        history: data || [],
        total: count || 0,
        page,
        pageSize,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getTeamAssignmentHistory:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}
