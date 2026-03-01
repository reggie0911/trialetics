'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/lib/types';

const DEMO_PREFIX = '[DEMO]';

export interface DemoSeedResult {
  organization_id: string;
  protocol_id: string;
  region_id: string;
  site_ids: string[];
  contact_ids: string[];
  contract_ids: string[];
  payment_activity_count: number;
  payment_record_count: number;
  payment_exception_count: number;
}

export interface DemoStatus {
  seeded: boolean;
  site_count: number;
  activity_count: number;
  record_count: number;
  exception_count: number;
}

// =============================================
// CHECK DEMO STATUS
// =============================================

export async function getDemoStatus(
  companyId: string
): Promise<ActionResponse<DemoStatus>> {
  try {
    const supabase = await createClient();

    const { count: siteCount } = await supabase
      .from('clinical_sites')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .like('site_number', `${DEMO_PREFIX}%`);

    const { count: activityCount } = await supabase
      .from('payment_activities')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_unplanned', true)
      .in(
        'site_id',
        (
          await supabase
            .from('clinical_sites')
            .select('id')
            .eq('company_id', companyId)
            .like('site_number', `${DEMO_PREFIX}%`)
        ).data?.map((s) => s.id) ?? []
      );

    const demoSiteIds = (
      await supabase
        .from('clinical_sites')
        .select('id')
        .eq('company_id', companyId)
        .like('site_number', `${DEMO_PREFIX}%`)
    ).data?.map((s) => s.id) ?? [];

    let totalActivities = 0;
    let totalRecords = 0;
    let totalExceptions = 0;

    if (demoSiteIds.length > 0) {
      const { count: ac } = await supabase
        .from('payment_activities')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('site_id', demoSiteIds);
      totalActivities = ac ?? 0;

      const { count: rc } = await supabase
        .from('payment_records')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('site_id', demoSiteIds);
      totalRecords = rc ?? 0;

      const { count: ec } = await supabase
        .from('payment_exceptions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('site_id', demoSiteIds);
      totalExceptions = ec ?? 0;
    }

    return {
      success: true,
      data: {
        seeded: (siteCount ?? 0) > 0,
        site_count: siteCount ?? 0,
        activity_count: totalActivities,
        record_count: totalRecords,
        exception_count: totalExceptions,
      },
    };
  } catch (error) {
    console.error('Error in getDemoStatus:', error);
    return { success: false, error: 'Failed to check demo status' };
  }
}

// =============================================
// RESET DEMO DATA
// =============================================

export async function resetDemoData(
  companyId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const supabase = await createClient();

    const { data: demoSites } = await supabase
      .from('clinical_sites')
      .select('id')
      .eq('company_id', companyId)
      .like('site_number', `${DEMO_PREFIX}%`);

    const demoSiteIds = (demoSites ?? []).map((s) => s.id);

    if (demoSiteIds.length > 0) {
      const { data: demoActivities } = await supabase
        .from('payment_activities')
        .select('id')
        .in('site_id', demoSiteIds);

      const demoActivityIds = (demoActivities ?? []).map((a) => a.id);

      if (demoActivityIds.length > 0) {
        await supabase
          .from('payment_splits')
          .delete()
          .in('payment_activity_id', demoActivityIds);
      }

      await supabase
        .from('payment_activities')
        .delete()
        .in('site_id', demoSiteIds);

      await supabase
        .from('payment_records')
        .delete()
        .in('site_id', demoSiteIds);

      await supabase
        .from('payment_exceptions')
        .delete()
        .in('site_id', demoSiteIds);
    }

    const { data: demoProtocols } = await supabase
      .from('clinical_protocols')
      .select('id')
      .eq('company_id', companyId)
      .like('protocol_number', `${DEMO_PREFIX}%`);

    const demoProtocolIds = (demoProtocols ?? []).map((p) => p.id);

    if (demoProtocolIds.length > 0) {
      const { data: svts } = await supabase
        .from('subject_visit_templates')
        .select('id')
        .in('protocol_id', demoProtocolIds);

      const svtIds = (svts ?? []).map((t) => t.id);

      if (svtIds.length > 0) {
        const { data: tvs } = await supabase
          .from('template_visits')
          .select('id')
          .in('template_id', svtIds);

        const tvIds = (tvs ?? []).map((v) => v.id);

        if (tvIds.length > 0) {
          await supabase
            .from('template_activities')
            .delete()
            .in('template_visit_id', tvIds);

          await supabase
            .from('template_visits')
            .delete()
            .in('id', tvIds);
        }

        await supabase
          .from('subject_visit_templates')
          .delete()
          .in('id', svtIds);
      }
    }

    if (demoSiteIds.length > 0) {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .in('site_id', demoSiteIds);

      const subjectIds = (subjects ?? []).map((s) => s.id);

      if (subjectIds.length > 0) {
        const { data: svs } = await supabase
          .from('subject_visits')
          .select('id')
          .in('subject_id', subjectIds);

        const svIds = (svs ?? []).map((v) => v.id);

        if (svIds.length > 0) {
          await supabase
            .from('subject_activities')
            .delete()
            .in('subject_visit_id', svIds);

          await supabase
            .from('subject_visits')
            .delete()
            .in('id', svIds);
        }

        await supabase.from('subjects').delete().in('id', subjectIds);
      }

      await supabase
        .from('site_contracts')
        .delete()
        .like('contract_number', `${DEMO_PREFIX}%`);

      await supabase
        .from('clinical_sites')
        .delete()
        .in('id', demoSiteIds);
    }

    if (demoProtocolIds.length > 0) {
      await supabase
        .from('clinical_regions')
        .delete()
        .in('protocol_id', demoProtocolIds);

      await supabase
        .from('clinical_protocols')
        .delete()
        .in('id', demoProtocolIds);
    }

    await supabase
      .from('organization_contacts')
      .delete()
      .in(
        'organization_id',
        (
          await supabase
            .from('organizations')
            .select('id')
            .eq('company_id', companyId)
            .like('name', `${DEMO_PREFIX}%`)
        ).data?.map((o) => o.id) ?? []
      );

    await supabase
      .from('contacts')
      .delete()
      .eq('company_id', companyId)
      .like('first_name', `${DEMO_PREFIX}%`);

    await supabase
      .from('organizations')
      .delete()
      .eq('company_id', companyId)
      .like('name', `${DEMO_PREFIX}%`);

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error('Error in resetDemoData:', error);
    return { success: false, error: 'Failed to reset demo data' };
  }
}

// =============================================
// SEED DEMO DATA
// =============================================

export async function seedDemoData(
  companyId: string,
  profileId: string
): Promise<ActionResponse<DemoSeedResult>> {
  try {
    const supabase = await createClient();

    // Check if already seeded
    const statusResult = await getDemoStatus(companyId);
    if (statusResult.success && statusResult.data?.seeded) {
      await resetDemoData(companyId);
    }

    // 1. Create demo organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        company_id: companyId,
        name: `${DEMO_PREFIX} Riverside Medical Center`,
        organization_type: 'site',
        status: 'active',
        phone: '+1-555-0100',
        email: 'demo@riverside-medical.example.com',
        created_by_id: profileId,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      return { success: false, error: `Failed to create demo organization: ${orgError?.message}` };
    }

    const { data: org2 } = await supabase
      .from('organizations')
      .insert({
        company_id: companyId,
        name: `${DEMO_PREFIX} Summit Clinical Research`,
        organization_type: 'site',
        status: 'active',
        phone: '+1-555-0200',
        email: 'demo@summit-clinical.example.com',
        created_by_id: profileId,
      })
      .select('id')
      .single();

    // 2. Create demo contacts
    const contactDefs = [
      { first_name: `${DEMO_PREFIX} Sarah`, last_name: 'Chen', title: 'Principal Investigator', email: 'demo.s.chen@example.com' },
      { first_name: `${DEMO_PREFIX} James`, last_name: 'Rodriguez', title: 'Sub-Investigator', email: 'demo.j.rodriguez@example.com' },
      { first_name: `${DEMO_PREFIX} Maria`, last_name: 'Thompson', title: 'Site Coordinator', email: 'demo.m.thompson@example.com' },
      { first_name: `${DEMO_PREFIX} David`, last_name: 'Park', title: 'Principal Investigator', email: 'demo.d.park@example.com' },
    ];

    const contactIds: string[] = [];
    for (const c of contactDefs) {
      const { data: contact } = await supabase
        .from('contacts')
        .insert({ company_id: companyId, ...c, status: 'active', created_by_id: profileId })
        .select('id')
        .single();
      if (contact) contactIds.push(contact.id);
    }

    // Link contacts to organizations
    if (contactIds.length >= 2) {
      await supabase.from('organization_contacts').insert([
        { organization_id: org.id, contact_id: contactIds[0], role: 'principal_investigator', is_primary: true },
        { organization_id: org.id, contact_id: contactIds[1], role: 'sub_investigator' },
        { organization_id: org.id, contact_id: contactIds[2], role: 'coordinator' },
      ]);
      if (org2) {
        await supabase.from('organization_contacts').insert([
          { organization_id: org2.id, contact_id: contactIds[3], role: 'principal_investigator', is_primary: true },
        ]);
      }
    }

    // 3. Create demo protocol
    const { data: protocol, error: protocolError } = await supabase
      .from('clinical_protocols')
      .insert({
        company_id: companyId,
        protocol_number: `${DEMO_PREFIX} CARD-2026-001`,
        title: `${DEMO_PREFIX} Phase III Cardiovascular Outcomes Trial`,
        phase: 'phase_iii',
        status: 'active',
        sponsor: 'Demo Pharma Inc.',
        objective: 'Evaluate efficacy and safety of investigational treatment in cardiovascular patients',
        planned_start_date: '2026-01-15',
        planned_end_date: '2027-06-30',
        planned_sites_count: 3,
        planned_subjects_count: 20,
        currency_code: 'USD',
        withholding_amount: 0,
        withholding_percent: 10,
        created_by_id: profileId,
      })
      .select('id')
      .single();

    if (protocolError || !protocol) {
      return { success: false, error: `Failed to create demo protocol: ${protocolError?.message}` };
    }

    // 4. Create demo region
    const { data: region } = await supabase
      .from('clinical_regions')
      .insert({
        company_id: companyId,
        protocol_id: protocol.id,
        region_name: `${DEMO_PREFIX} North America`,
        planned_sites_count: 3,
        planned_subjects_count: 20,
        currency_code: 'USD',
        withholding_amount: 0,
        withholding_percent: 10,
      })
      .select('id')
      .single();

    if (!region) {
      return { success: false, error: 'Failed to create demo region' };
    }

    // 5. Create demo clinical sites
    const siteDefs = [
      { site_number: `${DEMO_PREFIX} SITE-101`, org_id: org.id, pi_id: contactIds[0], planned_subjects: 8, withholding_percent: 10 },
      { site_number: `${DEMO_PREFIX} SITE-102`, org_id: org.id, pi_id: contactIds[1], planned_subjects: 6, withholding_percent: 10 },
      { site_number: `${DEMO_PREFIX} SITE-103`, org_id: org2?.id ?? org.id, pi_id: contactIds[3] ?? contactIds[0], planned_subjects: 6, withholding_percent: 10 },
    ];

    const siteIds: string[] = [];
    for (const s of siteDefs) {
      const { data: site } = await supabase
        .from('clinical_sites')
        .insert({
          company_id: companyId,
          protocol_id: protocol.id,
          region_id: region.id,
          organization_id: s.org_id,
          principal_investigator_id: s.pi_id,
          site_number: s.site_number,
          status: 'active',
          currency_code: 'USD',
          withholding_amount: 0,
          withholding_percent: s.withholding_percent,
          planned_subject_count: s.planned_subjects,
          site_initiated_date: '2026-02-01',
        })
        .select('id')
        .single();
      if (site) siteIds.push(site.id);
    }

    if (siteIds.length === 0) {
      return { success: false, error: 'Failed to create demo sites' };
    }

    // 6. Create demo contracts
    const contractIds: string[] = [];
    const contractDefs = [
      { org_id: org.id, number: `${DEMO_PREFIX} CTR-2026-001`, type: 'clinical_trial' as const, amount: 150000, payee: contactIds[0], clinical_site_id: siteIds[0] },
      { org_id: org.id, number: `${DEMO_PREFIX} CTR-2026-002`, type: 'site_budget' as const, amount: 120000, payee: contactIds[1], clinical_site_id: siteIds[1] },
      { org_id: org2?.id ?? org.id, number: `${DEMO_PREFIX} CTR-2026-003`, type: 'clinical_trial' as const, amount: 100000, payee: contactIds[3] ?? contactIds[0], clinical_site_id: siteIds[2] },
    ];

    for (const c of contractDefs) {
      const { data: contract } = await supabase
        .from('site_contracts')
        .insert({
          organization_id: c.org_id,
          contract_number: c.number,
          contract_type: c.type,
          contract_amount: c.amount,
          payee_contact_id: c.payee,
          status: 'executed',
          effective_date: '2026-01-15',
          expiry_date: '2027-12-31',
          clinical_site_id: c.clinical_site_id,
          protocol_id: protocol.id,
        })
        .select('id')
        .single();
      if (contract) contractIds.push(contract.id);
    }

    // 7. Create visit template with activities
    const { data: svt } = await supabase
      .from('subject_visit_templates')
      .insert({
        company_id: companyId,
        protocol_id: protocol.id,
        version_number: `${DEMO_PREFIX} v1.0`,
        name: `${DEMO_PREFIX} Cardiovascular Visit Schedule`,
        status: 'approved',
        is_active: true,
        created_by_id: profileId,
      })
      .select('id')
      .single();

    if (!svt) {
      return { success: false, error: 'Failed to create visit template' };
    }

    const visitDefs = [
      { name: 'Screening', type: 'screening' as const, seq: 1, day: -14 },
      { name: 'Baseline / Randomization', type: 'treatment' as const, seq: 2, day: 0 },
      { name: 'Week 4 Follow-up', type: 'treatment' as const, seq: 3, day: 28 },
      { name: 'Week 12 Follow-up', type: 'treatment' as const, seq: 4, day: 84 },
      { name: 'Week 24 Final Visit', type: 'treatment' as const, seq: 5, day: 168 },
      { name: 'Early Termination', type: 'unscheduled' as const, seq: 6, day: 0 },
    ];

    const templateVisitIds: string[] = [];
    for (const v of visitDefs) {
      const { data: tv } = await supabase
        .from('template_visits')
        .insert({
          company_id: companyId,
          template_id: svt.id,
          visit_name: v.name,
          visit_type: v.type,
          sequence: v.seq,
          day_from_baseline: v.day,
          visit_window_before: 3,
          visit_window_after: 3,
        })
        .select('id')
        .single();
      if (tv) templateVisitIds.push(tv.id);
    }

    const activityDefs = [
      { visit_idx: 0, name: 'Informed Consent', amount: 150, flag: true },
      { visit_idx: 0, name: 'Medical History Review', amount: 200, flag: true },
      { visit_idx: 0, name: 'Physical Examination', amount: 250, flag: true },
      { visit_idx: 0, name: 'Lab Collection - Screening', amount: 175, flag: true },
      { visit_idx: 1, name: 'Randomization', amount: 300, flag: true },
      { visit_idx: 1, name: 'ECG Assessment', amount: 125, flag: true },
      { visit_idx: 1, name: 'Echocardiogram', amount: 450, flag: true },
      { visit_idx: 1, name: 'Study Drug Dispensing', amount: 100, flag: true },
      { visit_idx: 2, name: 'Safety Assessment', amount: 200, flag: true },
      { visit_idx: 2, name: 'Lab Collection - Week 4', amount: 175, flag: true },
      { visit_idx: 2, name: 'Vital Signs', amount: 75, flag: true },
      { visit_idx: 3, name: 'Efficacy Assessment', amount: 350, flag: true },
      { visit_idx: 3, name: 'ECG Assessment', amount: 125, flag: true },
      { visit_idx: 3, name: 'Lab Collection - Week 12', amount: 175, flag: true },
      { visit_idx: 3, name: 'Adverse Event Review', amount: 100, flag: true },
      { visit_idx: 4, name: 'Final Efficacy Assessment', amount: 400, flag: true },
      { visit_idx: 4, name: 'Final Lab Collection', amount: 200, flag: true },
      { visit_idx: 4, name: 'End of Study Exam', amount: 300, flag: true },
      { visit_idx: 4, name: 'Study Drug Return', amount: 50, flag: true },
      { visit_idx: 5, name: 'Early Termination Assessment', amount: 350, flag: true },
    ];

    const templateActivityIds: { id: string; visit_idx: number; name: string; amount: number }[] = [];
    for (const a of activityDefs) {
      if (!templateVisitIds[a.visit_idx]) continue;
      const { data: ta } = await supabase
        .from('template_activities')
        .insert({
          company_id: companyId,
          template_visit_id: templateVisitIds[a.visit_idx],
          activity_name: a.name,
          payment_flag: a.flag,
          payment_amount: a.amount,
          is_required: true,
          sequence: templateActivityIds.filter((x) => x.visit_idx === a.visit_idx).length + 1,
        })
        .select('id')
        .single();
      if (ta) {
        templateActivityIds.push({ id: ta.id, visit_idx: a.visit_idx, name: a.name, amount: a.amount });
      }
    }

    // 8. Create subjects, subject visits, and subject activities for each site
    const subjectConfigs = [
      { site_idx: 0, subjects: ['SUBJ-001', 'SUBJ-002', 'SUBJ-003', 'SUBJ-004'] },
      { site_idx: 1, subjects: ['SUBJ-005', 'SUBJ-006', 'SUBJ-007'] },
      { site_idx: 2, subjects: ['SUBJ-008', 'SUBJ-009', 'SUBJ-010'] },
    ];

    let totalPaymentActivities = 0;
    let totalPaymentRecords = 0;

    for (const sc of subjectConfigs) {
      const siteId = siteIds[sc.site_idx];
      if (!siteId) continue;
      const contractId = contractIds[sc.site_idx] ?? null;
      const payeeId = contactIds[sc.site_idx] ?? null;

      for (let si = 0; si < sc.subjects.length; si++) {
        const subjectNumber = sc.subjects[si];

        const { data: subject } = await supabase
          .from('subjects')
          .insert({
            company_id: companyId,
            site_id: siteId,
            subject_number: `${DEMO_PREFIX} ${subjectNumber}`,
            screening_number: `${DEMO_PREFIX} SCR-${subjectNumber}`,
            status: si === 0 ? 'completed' : si < sc.subjects.length - 1 ? 'enrolled' : 'screening',
            enrollment_date: si > 0 ? '2026-02-15' : '2026-02-10',
            screening_date: '2026-02-01',
          })
          .select('id')
          .single();

        if (!subject) continue;

        // Determine how many visits this subject has completed based on position
        const completedVisitCount = si === 0 ? 5 : si === 1 ? 3 : si === 2 ? 2 : 1;

        for (let vi = 0; vi < Math.min(completedVisitCount, visitDefs.length - 1); vi++) {
          const visitDef = visitDefs[vi];
          const tvId = templateVisitIds[vi];
          if (!tvId) continue;

          const baseDate = new Date('2026-02-15');
          baseDate.setDate(baseDate.getDate() + visitDef.day + (visitDef.day < 0 ? 0 : 0));
          const dateStr = baseDate.toISOString().split('T')[0];

          const { data: sv } = await supabase
            .from('subject_visits')
            .insert({
              company_id: companyId,
              subject_id: subject.id,
              site_id: siteId,
              template_visit_id: tvId,
              visit_name: visitDef.name,
              visit_type: visitDef.type,
              sequence: visitDef.seq,
              status: 'completed',
              actual_date: dateStr,
              planned_date: dateStr,
              is_planned: true,
            })
            .select('id')
            .single();

          if (!sv) continue;

          const visitActivities = templateActivityIds.filter((a) => a.visit_idx === vi);
          for (const actDef of visitActivities) {
            const { data: sa } = await supabase
              .from('subject_activities')
              .insert({
                company_id: companyId,
                subject_visit_id: sv.id,
                template_activity_id: actDef.id,
                activity_name: actDef.name,
                status: 'completed',
                completed_date: dateStr,
              })
              .select('id')
              .single();

            if (!sa) continue;

            // Payment activity: completed for earlier visits, pending for recent
            const isCompleted = vi < completedVisitCount - 1;
            const hasRecord = vi < completedVisitCount - 2 && si < 2;

            const { data: pa } = await supabase
              .from('payment_activities')
              .insert({
                company_id: companyId,
                site_id: siteId,
                subject_activity_id: sa.id,
                subject_visit_id: sv.id,
                contract_id: contractId,
                payee_contact_id: payeeId,
                standard_amount: actDef.amount,
                deviation_amount: 0,
                actual_amount: actDef.amount,
                currency_code: 'USD',
                is_completed: isCompleted,
                is_unplanned: false,
              })
              .select('id')
              .single();

            if (pa) totalPaymentActivities++;
          }
        }
      }

      // 9. Create unplanned payment activities for each site
      const unplannedDefs = [
        { desc: 'IRB Amendment Fee', amount: 500 },
        { desc: 'Equipment Calibration', amount: 750 },
      ];

      for (const up of unplannedDefs) {
        // Unplanned activities need subject_activity_id and subject_visit_id
        // Since the DB schema has them NOT NULL, we need to get a subject visit for this site
        const { data: anySv } = await supabase
          .from('subject_visits')
          .select('id, subject_id')
          .eq('site_id', siteId)
          .eq('company_id', companyId)
          .limit(1)
          .single();

        if (!anySv) continue;

        const { data: anySa } = await supabase
          .from('subject_activities')
          .select('id')
          .eq('subject_visit_id', anySv.id)
          .limit(1)
          .single();

        if (!anySa) continue;

        const { data: upa } = await supabase
          .from('payment_activities')
          .insert({
            company_id: companyId,
            site_id: siteId,
            subject_activity_id: anySa.id,
            subject_visit_id: anySv.id,
            contract_id: contractId,
            payee_contact_id: payeeId,
            standard_amount: up.amount,
            deviation_amount: 0,
            actual_amount: up.amount,
            currency_code: 'USD',
            is_completed: true,
            is_unplanned: true,
          })
          .select('id')
          .single();

        if (upa) totalPaymentActivities++;
      }
    }

    // 10. Generate payment records for completed activities at site 1 and site 2
    for (let si = 0; si < 2 && si < siteIds.length; si++) {
      const siteId = siteIds[si];

      const { data: completedActivities } = await supabase
        .from('payment_activities')
        .select('id, actual_amount, contract_id, payee_contact_id')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .eq('is_completed', true)
        .is('payment_record_id', null);

      if (!completedActivities?.length) continue;

      // Group by contract/payee
      const groups = new Map<string, { ids: string[]; total: number; contract_id: string | null; payee_id: string | null }>();
      for (const a of completedActivities) {
        const key = `${a.contract_id ?? 'none'}_${a.payee_contact_id ?? 'none'}`;
        const existing = groups.get(key);
        if (existing) {
          existing.ids.push(a.id);
          existing.total += a.actual_amount;
        } else {
          groups.set(key, {
            ids: [a.id],
            total: a.actual_amount,
            contract_id: a.contract_id,
            payee_id: a.payee_contact_id,
          });
        }
      }

      let recordIdx = 0;
      for (const [, group] of groups) {
        const paymentNumber = `${DEMO_PREFIX} PAY-${String(totalPaymentRecords + 1).padStart(4, '0')}`;
        const requestedAmount = group.total * 0.9; // 10% withholding

        const status = si === 0 && recordIdx === 0 ? 'processed' : 'to_be_processed';
        const checkAmount = status === 'processed' ? requestedAmount : null;
        const checkDate = status === 'processed' ? '2026-02-28' : null;
        const checkNumber = status === 'processed' ? `CHK-${DEMO_PREFIX}-${String(totalPaymentRecords + 1).padStart(4, '0')}` : null;

        const { data: record } = await supabase
          .from('payment_records')
          .insert({
            company_id: companyId,
            site_id: siteId,
            protocol_id: protocol.id,
            region_id: region.id,
            contract_id: group.contract_id,
            payee_contact_id: group.payee_id,
            payment_number: paymentNumber,
            payment_type: 'interim',
            status,
            earned_amount: group.total,
            requested_amount: requestedAmount,
            check_amount: checkAmount,
            check_date: checkDate,
            check_number: checkNumber,
            currency_code: 'USD',
          })
          .select('id')
          .single();

        if (record) {
          totalPaymentRecords++;
          recordIdx++;

          // Link half of the activities to this record (leave some unlinked for demo)
          const toLink = group.ids.slice(0, Math.ceil(group.ids.length / 2));
          if (toLink.length > 0) {
            await supabase
              .from('payment_activities')
              .update({ payment_record_id: record.id })
              .in('id', toLink);
          }
        }
      }
    }

    // 11. Create payment exceptions for site 1
    let totalExceptions = 0;
    if (siteIds[0] && templateActivityIds.length >= 3) {
      const exceptionDefs = [
        { ta_idx: 0, visit_idx: 0, amount: 200 },  // Informed Consent override: $150 → $200
        { ta_idx: 2, visit_idx: 0, amount: 300 },  // Physical Exam override: $250 → $300
        { ta_idx: 6, visit_idx: 1, amount: 500 },  // Echocardiogram override: $450 → $500
      ];

      for (const ex of exceptionDefs) {
        const ta = templateActivityIds[ex.ta_idx];
        const tvId = templateVisitIds[ex.visit_idx];
        if (!ta || !tvId) continue;

        const { error: exError } = await supabase
          .from('payment_exceptions')
          .insert({
            company_id: companyId,
            site_id: siteIds[0],
            template_activity_id: ta.id,
            template_visit_id: tvId,
            protocol_id: protocol.id,
            exception_amount: ex.amount,
            currency_code: 'USD',
          });

        if (!exError) totalExceptions++;
      }
    }

    // 12. Create a payment split example on site 1
    if (siteIds[0] && contractIds.length >= 2) {
      const { data: splitActivity } = await supabase
        .from('payment_activities')
        .select('id, actual_amount')
        .eq('site_id', siteIds[0])
        .eq('company_id', companyId)
        .eq('is_completed', true)
        .is('payment_record_id', null)
        .limit(1)
        .single();

      if (splitActivity) {
        const total = splitActivity.actual_amount;
        await supabase.from('payment_splits').insert([
          {
            payment_activity_id: splitActivity.id,
            contract_id: contractIds[0],
            payee_contact_id: contactIds[0],
            split_percentage: 60,
            split_amount: total * 0.6,
          },
          {
            payment_activity_id: splitActivity.id,
            contract_id: contractIds[1],
            payee_contact_id: contactIds[1],
            split_percentage: 40,
            split_amount: total * 0.4,
          },
        ]);
      }
    }

    revalidatePath('/protected/clinical-payments');
    return {
      success: true,
      data: {
        organization_id: org.id,
        protocol_id: protocol.id,
        region_id: region.id,
        site_ids: siteIds,
        contact_ids: contactIds,
        contract_ids: contractIds,
        payment_activity_count: totalPaymentActivities,
        payment_record_count: totalPaymentRecords,
        payment_exception_count: totalExceptions,
      },
    };
  } catch (error) {
    console.error('Error in seedDemoData:', error);
    return { success: false, error: `Failed to seed demo data: ${error instanceof Error ? error.message : String(error)}` };
  }
}
