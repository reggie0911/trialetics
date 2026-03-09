'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/lib/types';

const DEMO_PREFIX = '[DEMO]';
const DEMO_PROTOCOL_NUMBER = 'DEMO-CP-001';
const DEMO_REGION_NAME = 'DEMO-North America';
const DEMO_SITE_NUMBERS = ['DEMO-101', 'DEMO-102', 'DEMO-103'];
const DEMO_PAY_PREFIX = 'DEMO-PAY-';

interface DemoSeedResult {
  protocol_id: string;
  region_id: string;
  organization_ids: string[];
  contact_ids: string[];
  site_ids: string[];
  contract_ids: string[];
  activity_count: number;
  record_count: number;
}

interface DemoStatusResult {
  is_seeded: boolean;
  protocol_id: string | null;
  site_count: number;
  activity_count: number;
  record_count: number;
}

export async function getDemoClinicalPaymentsStatus(
  companyId: string
): Promise<ActionResponse<DemoStatusResult>> {
  try {
    const supabase = await createClient();

    const { data: protocol } = await supabase
      .from('clinical_protocols')
      .select('id')
      .eq('company_id', companyId)
      .eq('protocol_number', DEMO_PROTOCOL_NUMBER)
      .maybeSingle();

    if (!protocol) {
      return {
        success: true,
        data: {
          is_seeded: false,
          protocol_id: null,
          site_count: 0,
          activity_count: 0,
          record_count: 0,
        },
      };
    }

    const { count: siteCount } = await supabase
      .from('clinical_sites')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('protocol_id', protocol.id);

    const { data: sites } = await supabase
      .from('clinical_sites')
      .select('id')
      .eq('company_id', companyId)
      .eq('protocol_id', protocol.id);

    const siteIds = (sites || []).map((s) => s.id);
    let activityCount = 0;
    let recordCount = 0;

    if (siteIds.length > 0) {
      const { count: ac } = await supabase
        .from('payment_activities')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('site_id', siteIds);
      activityCount = ac || 0;

      const { count: rc } = await supabase
        .from('payment_records')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('site_id', siteIds);
      recordCount = rc || 0;
    }

    return {
      success: true,
      data: {
        is_seeded: true,
        protocol_id: protocol.id,
        site_count: siteCount || 0,
        activity_count: activityCount,
        record_count: recordCount,
      },
    };
  } catch (error) {
    console.error('Error in getDemoClinicalPaymentsStatus:', error);
    return { success: false, error: 'Failed to check demo status' };
  }
}

export async function resetDemoClinicalPayments(
  companyId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const supabase = await createClient();

    const { data: protocol } = await supabase
      .from('clinical_protocols')
      .select('id')
      .eq('company_id', companyId)
      .eq('protocol_number', DEMO_PROTOCOL_NUMBER)
      .maybeSingle();

    if (!protocol) {
      return { success: true, data: { deleted: true } };
    }

    const { data: sites } = await supabase
      .from('clinical_sites')
      .select('id, organization_id')
      .eq('company_id', companyId)
      .eq('protocol_id', protocol.id);

    const siteIds = (sites || []).map((s) => s.id);
    const orgIds = [...new Set((sites || []).map((s) => s.organization_id).filter(Boolean))] as string[];

    if (siteIds.length > 0) {
      const { data: activities } = await supabase
        .from('payment_activities')
        .select('id')
        .eq('company_id', companyId)
        .in('site_id', siteIds);

      const activityIds = (activities || []).map((a) => a.id);

      if (activityIds.length > 0) {
        await supabase
          .from('payment_splits')
          .delete()
          .in('payment_activity_id', activityIds);
      }

      await supabase
        .from('payment_records')
        .delete()
        .eq('company_id', companyId)
        .in('site_id', siteIds);

      await supabase
        .from('payment_activities')
        .delete()
        .eq('company_id', companyId)
        .in('site_id', siteIds);

      await supabase
        .from('payment_exceptions')
        .delete()
        .eq('company_id', companyId)
        .in('site_id', siteIds);
    }

    if (orgIds.length > 0) {
      await supabase
        .from('site_contracts')
        .delete()
        .in('organization_id', orgIds);
    }

    if (siteIds.length > 0) {
      await supabase
        .from('clinical_sites')
        .delete()
        .eq('company_id', companyId)
        .in('id', siteIds);
    }

    const { data: region } = await supabase
      .from('clinical_regions')
      .select('id')
      .eq('company_id', companyId)
      .eq('protocol_id', protocol.id)
      .eq('region_name', DEMO_REGION_NAME)
      .maybeSingle();

    if (region) {
      await supabase
        .from('clinical_regions')
        .delete()
        .eq('id', region.id);
    }

    await supabase
      .from('clinical_protocols')
      .delete()
      .eq('id', protocol.id);

    if (orgIds.length > 0) {
      for (const orgId of orgIds) {
        await supabase
          .from('organization_contacts')
          .delete()
          .eq('organization_id', orgId);
      }
      await supabase
        .from('organizations')
        .delete()
        .eq('company_id', companyId)
        .in('id', orgIds);
    }

    const { data: demoContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('company_id', companyId)
      .like('last_name', `${DEMO_PREFIX}%`);

    if (demoContacts && demoContacts.length > 0) {
      await supabase
        .from('contacts')
        .delete()
        .eq('company_id', companyId)
        .in('id', demoContacts.map((c) => c.id));
    }

    revalidatePath('/protected/clinical-payments');
    revalidatePath('/protected/clinical-payments/demo');
    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error('Error in resetDemoClinicalPayments:', error);
    return { success: false, error: 'Failed to reset demo data' };
  }
}

export async function seedDemoClinicalPayments(
  companyId: string,
  profileId: string
): Promise<ActionResponse<DemoSeedResult>> {
  try {
    const supabase = await createClient();

    const resetResult = await resetDemoClinicalPayments(companyId);
    if (!resetResult.success) {
      return { success: false, error: `Reset failed: ${resetResult.error}` };
    }

    // --- Protocol ---
    const { data: protocol, error: protocolError } = await supabase
      .from('clinical_protocols')
      .insert({
        company_id: companyId,
        protocol_number: DEMO_PROTOCOL_NUMBER,
        title: `${DEMO_PREFIX} Cardiovascular Outcomes Study`,
        phase: 'phase_iii',
        objective: 'Evaluate the efficacy of treatment XYZ-100 in reducing major adverse cardiac events in high-risk patients.',
        design: 'double_blind',
        type: 'Interventional',
        sponsor: `${DEMO_PREFIX} PharmaCorp`,
        status: 'in_progress',
        planned_start_date: '2025-06-01',
        planned_end_date: '2027-06-01',
        actual_start_date: '2025-07-15',
        planned_sites_count: 3,
        planned_subjects_count: 150,
        currency_code: 'USD',
        created_by_id: profileId,
      })
      .select('id')
      .single();

    if (protocolError || !protocol) {
      return { success: false, error: `Protocol creation failed: ${protocolError?.message}` };
    }

    // --- Region ---
    const { data: region, error: regionError } = await supabase
      .from('clinical_regions')
      .insert({
        company_id: companyId,
        protocol_id: protocol.id,
        region_name: DEMO_REGION_NAME,
        planned_sites_count: 3,
        planned_subjects_count: 150,
        currency_code: 'USD',
      })
      .select('id')
      .single();

    if (regionError || !region) {
      return { success: false, error: `Region creation failed: ${regionError?.message}` };
    }

    // --- Organizations ---
    const orgData = [
      { name: `${DEMO_PREFIX} Metro General Hospital`, organization_type: 'site' as const },
      { name: `${DEMO_PREFIX} University Research Center`, organization_type: 'site' as const },
      { name: `${DEMO_PREFIX} Valley Medical Associates`, organization_type: 'site' as const },
    ];

    const orgIds: string[] = [];
    for (const org of orgData) {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          company_id: companyId,
          name: org.name,
          organization_type: org.organization_type,
          status: 'active',
          phone: '(555) 000-0000',
          email: `demo-${org.name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
          created_by_id: profileId,
        })
        .select('id')
        .single();

      if (error || !data) {
        return { success: false, error: `Organization creation failed: ${error?.message}` };
      }
      orgIds.push(data.id);
    }

    // --- Contacts (investigators + payees) ---
    const contactData = [
      { first_name: 'Sarah', last_name: `${DEMO_PREFIX} Anderson`, title: 'Principal Investigator', credentials: 'MD, PhD' },
      { first_name: 'Michael', last_name: `${DEMO_PREFIX} Chen`, title: 'Principal Investigator', credentials: 'MD, FACC' },
      { first_name: 'Emily', last_name: `${DEMO_PREFIX} Rodriguez`, title: 'Principal Investigator', credentials: 'MD' },
      { first_name: 'James', last_name: `${DEMO_PREFIX} Thompson`, title: 'Finance Director', credentials: 'CPA' },
      { first_name: 'Linda', last_name: `${DEMO_PREFIX} Park`, title: 'Research Coordinator', credentials: 'RN, BSN' },
      { first_name: 'Robert', last_name: `${DEMO_PREFIX} Williams`, title: 'Sub-Investigator', credentials: 'MD' },
    ];

    const contactIds: string[] = [];
    for (const contact of contactData) {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          company_id: companyId,
          first_name: contact.first_name,
          last_name: contact.last_name,
          title: contact.title,
          credentials: contact.credentials,
          email: `${contact.first_name.toLowerCase()}.demo@example.com`,
          status: 'active',
          created_by_id: profileId,
        })
        .select('id')
        .single();

      if (error || !data) {
        return { success: false, error: `Contact creation failed: ${error?.message}` };
      }
      contactIds.push(data.id);
    }

    // --- Link contacts to organizations ---
    const orgContactLinks = [
      { org_idx: 0, contact_idx: 0, role: 'principal_investigator' as const, is_primary: true },
      { org_idx: 0, contact_idx: 3, role: 'finance' as const, is_primary: false },
      { org_idx: 1, contact_idx: 1, role: 'principal_investigator' as const, is_primary: true },
      { org_idx: 1, contact_idx: 4, role: 'coordinator' as const, is_primary: false },
      { org_idx: 2, contact_idx: 2, role: 'principal_investigator' as const, is_primary: true },
      { org_idx: 2, contact_idx: 5, role: 'sub_investigator' as const, is_primary: false },
    ];

    for (const link of orgContactLinks) {
      await supabase.from('organization_contacts').insert({
        organization_id: orgIds[link.org_idx],
        contact_id: contactIds[link.contact_idx],
        role: link.role,
        is_primary: link.is_primary,
        status: 'active',
      });
    }

    // --- Clinical Sites ---
    const siteConfigs = [
      { number: DEMO_SITE_NUMBERS[0], org_idx: 0, pi_idx: 0, withholding_pct: 10, withholding_amt: 0, enrolled: 25 },
      { number: DEMO_SITE_NUMBERS[1], org_idx: 1, pi_idx: 1, withholding_pct: 5, withholding_amt: 500, enrolled: 30 },
      { number: DEMO_SITE_NUMBERS[2], org_idx: 2, pi_idx: 2, withholding_pct: 0, withholding_amt: 0, enrolled: 20 },
    ];

    const siteIds: string[] = [];
    for (const cfg of siteConfigs) {
      const { data, error } = await supabase
        .from('clinical_sites')
        .insert({
          company_id: companyId,
          protocol_id: protocol.id,
          region_id: region.id,
          organization_id: orgIds[cfg.org_idx],
          principal_investigator_id: contactIds[cfg.pi_idx],
          site_number: cfg.number,
          status: 'initiated',
          currency_code: 'USD',
          withholding_percent: cfg.withholding_pct,
          withholding_amount: cfg.withholding_amt,
          site_initiated_date: '2025-08-01',
          first_subject_enrolled_date: '2025-09-15',
          planned_subject_count: 50,
          enrolled_subject_count: cfg.enrolled,
        })
        .select('id')
        .single();

      if (error || !data) {
        return { success: false, error: `Site creation failed: ${error?.message}` };
      }
      siteIds.push(data.id);
    }

    // --- Contracts ---
    const contractConfigs = [
      { org_idx: 0, site_idx: 0, number: 'DEMO-CTR-001', amount: 125000, payee_idx: 0 },
      { org_idx: 0, site_idx: 0, number: 'DEMO-CTR-002', amount: 50000, payee_idx: 3 },
      { org_idx: 1, site_idx: 1, number: 'DEMO-CTR-003', amount: 150000, payee_idx: 1 },
      { org_idx: 2, site_idx: 2, number: 'DEMO-CTR-004', amount: 100000, payee_idx: 2 },
    ];

    const contractIds: string[] = [];
    for (const cfg of contractConfigs) {
      const { data, error } = await supabase
        .from('site_contracts')
        .insert({
          organization_id: orgIds[cfg.org_idx],
          clinical_site_id: siteIds[cfg.site_idx],
          protocol_id: protocol.id,
          contract_number: cfg.number,
          contract_type: 'clinical_trial',
          contract_amount: cfg.amount,
          currency_code: 'USD',
          payee_contact_id: contactIds[cfg.payee_idx],
          status: 'executed',
          effective_date: '2025-07-01',
          expiry_date: '2027-12-31',
        })
        .select('id')
        .single();

      if (error || !data) {
        return { success: false, error: `Contract creation failed: ${error?.message}` };
      }
      contractIds.push(data.id);
    }

    // --- Payment Activities (unplanned, to avoid needing subject_activities) ---
    const activityTemplates = [
      { label: 'Screening Visit', amount: 1500 },
      { label: 'Baseline Assessment', amount: 2000 },
      { label: 'Week 4 Follow-Up', amount: 1200 },
      { label: 'Week 12 Follow-Up', amount: 1200 },
      { label: 'Week 24 Follow-Up', amount: 1200 },
      { label: 'End-of-Study Visit', amount: 1800 },
      { label: 'IRB Annual Review Fee', amount: 3500 },
      { label: 'Equipment Calibration', amount: 750 },
      { label: 'Lab Sample Processing', amount: 400 },
      { label: 'Patient Stipend Reimbursement', amount: 250 },
    ];

    let totalActivities = 0;

    const site0Activities: string[] = [];
    const site1Activities: string[] = [];

    for (let siteIdx = 0; siteIdx < siteIds.length; siteIdx++) {
      const siteId = siteIds[siteIdx];
      const contractIdx = siteIdx === 0 ? 0 : siteIdx === 1 ? 2 : 3;
      const payeeIdx = siteIdx === 0 ? 0 : siteIdx === 1 ? 1 : 2;

      const activitiesForSite = siteIdx === 0
        ? activityTemplates
        : siteIdx === 1
          ? activityTemplates.slice(0, 8)
          : activityTemplates.slice(0, 6);

      for (let i = 0; i < activitiesForSite.length; i++) {
        const tmpl = activitiesForSite[i];
        const deviation = i % 3 === 0 ? 100 : i % 5 === 0 ? -50 : 0;
        const isCompleted = i < activitiesForSite.length - 2;

        const { data, error } = await supabase
          .from('payment_activities')
          .insert({
            company_id: companyId,
            site_id: siteId,
            subject_activity_id: null,
            subject_visit_id: null,
            contract_id: contractIds[contractIdx],
            payee_contact_id: contactIds[payeeIdx],
            standard_amount: tmpl.amount,
            deviation_amount: deviation,
            actual_amount: tmpl.amount + deviation,
            currency_code: 'USD',
            is_completed: isCompleted,
            is_unplanned: true,
          })
          .select('id')
          .single();

        if (!error && data) {
          totalActivities++;
          if (siteIdx === 0) site0Activities.push(data.id);
          if (siteIdx === 1) site1Activities.push(data.id);
        }
      }
    }

    // --- Payment Records (create some for sites 0 and 1 to show different statuses) ---
    let totalRecords = 0;

    const completedSite0 = site0Activities.filter((_, i) => i < 6);
    const completedSite1 = site1Activities.filter((_, i) => i < 4);

    if (completedSite0.length > 0) {
      const { data: rec, error: recError } = await supabase
        .from('payment_records')
        .insert({
          company_id: companyId,
          site_id: siteIds[0],
          protocol_id: protocol.id,
          region_id: region.id,
          contract_id: contractIds[0],
          payee_contact_id: contactIds[0],
          payment_number: `${DEMO_PAY_PREFIX}000001`,
          payment_type: 'interim',
          status: 'processed',
          earned_amount: 7600,
          requested_amount: 6840,
          check_amount: 6840,
          check_date: '2026-01-15',
          check_number: 'CHK-DEMO-10001',
          currency_code: 'USD',
        })
        .select('id')
        .single();

      if (rec && !recError) {
        totalRecords++;
        const first3 = completedSite0.slice(0, 3);
        if (first3.length > 0) {
          await supabase
            .from('payment_activities')
            .update({ payment_record_id: rec.id })
            .in('id', first3);
        }
      }
    }

    if (completedSite0.length > 3) {
      const { data: rec2, error: rec2Error } = await supabase
        .from('payment_records')
        .insert({
          company_id: companyId,
          site_id: siteIds[0],
          protocol_id: protocol.id,
          region_id: region.id,
          contract_id: contractIds[0],
          payee_contact_id: contactIds[0],
          payment_number: `${DEMO_PAY_PREFIX}000002`,
          payment_type: 'interim',
          status: 'in_progress',
          earned_amount: 3600,
          requested_amount: 3240,
          currency_code: 'USD',
        })
        .select('id')
        .single();

      if (rec2 && !rec2Error) {
        totalRecords++;
        const next3 = completedSite0.slice(3, 6);
        if (next3.length > 0) {
          await supabase
            .from('payment_activities')
            .update({ payment_record_id: rec2.id })
            .in('id', next3);
        }
      }
    }

    if (completedSite1.length > 0) {
      const { data: rec3, error: rec3Error } = await supabase
        .from('payment_records')
        .insert({
          company_id: companyId,
          site_id: siteIds[1],
          protocol_id: protocol.id,
          region_id: region.id,
          contract_id: contractIds[2],
          payee_contact_id: contactIds[1],
          payment_number: `${DEMO_PAY_PREFIX}000003`,
          payment_type: 'interim',
          status: 'to_be_processed',
          earned_amount: 5900,
          requested_amount: 5105,
          currency_code: 'USD',
        })
        .select('id')
        .single();

      if (rec3 && !rec3Error) {
        totalRecords++;
        if (completedSite1.length > 0) {
          await supabase
            .from('payment_activities')
            .update({ payment_record_id: rec3.id })
            .in('id', completedSite1);
        }
      }
    }

    // --- Payment Splits (demonstrate split payment on site 0) ---
    const splitCandidates = site0Activities.slice(0, 2);
    for (const actId of splitCandidates) {
      await supabase.from('payment_splits').insert({
        payment_activity_id: actId,
        contract_id: contractIds[0],
        payee_contact_id: contactIds[0],
        split_percentage: 70,
        split_amount: 1050,
      });
      await supabase.from('payment_splits').insert({
        payment_activity_id: actId,
        contract_id: contractIds[1],
        payee_contact_id: contactIds[3],
        split_percentage: 30,
        split_amount: 450,
      });
    }

    revalidatePath('/protected/clinical-payments');
    revalidatePath('/protected/clinical-payments/demo');

    return {
      success: true,
      data: {
        protocol_id: protocol.id,
        region_id: region.id,
        organization_ids: orgIds,
        contact_ids: contactIds,
        site_ids: siteIds,
        contract_ids: contractIds,
        activity_count: totalActivities,
        record_count: totalRecords,
      },
    };
  } catch (error) {
    console.error('Error in seedDemoClinicalPayments:', error);
    return { success: false, error: `Failed to seed demo data: ${error}` };
  }
}
