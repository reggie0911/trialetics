-- =====================================================
-- IP Access-Controlled Workflows
-- Adds ip_user_access_tier() DB function, updates RLS
-- policies for site-scoping, and adds new team roles.
-- =====================================================

-- ---------- 1. New study_team_members role values ----------

ALTER TABLE public.study_team_members DROP CONSTRAINT IF EXISTS study_team_members_role_check;
ALTER TABLE public.study_team_members ADD CONSTRAINT study_team_members_role_check CHECK (
  role IN (
    'accounts_payable_specialist', 'biostatistician', 'clinical_contracts_specialist',
    'clinical_data_manager', 'clinical_project_manager', 'clinical_research_associate',
    'clinical_trial_assistant', 'contracts_manager', 'cra_manager', 'executive_director',
    'finance_director', 'finance_reviewer',
    'inventory_specialist', 'medical_writer',
    'principal_investigator',
    'regulatory_specialist', 'safety_specialist',
    'site_budget_specialist',
    'study_coordinator',
    'study_startup_specialist', 'vendor_manager', 'custom'
  )
);

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_study_role_check;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_study_role_check CHECK (
  study_role IS NULL OR study_role IN (
    'accounts_payable_specialist', 'biostatistician', 'clinical_contracts_specialist',
    'clinical_data_manager', 'clinical_project_manager', 'clinical_research_associate',
    'clinical_trial_assistant', 'contracts_manager', 'cra_manager', 'executive_director',
    'finance_director', 'finance_reviewer',
    'inventory_specialist', 'medical_writer',
    'principal_investigator',
    'regulatory_specialist', 'safety_specialist',
    'site_budget_specialist',
    'study_coordinator',
    'study_startup_specialist', 'vendor_manager', 'custom'
  )
);

ALTER TABLE public.company_join_links DROP CONSTRAINT IF EXISTS company_join_links_study_role_check;
ALTER TABLE public.company_join_links ADD CONSTRAINT company_join_links_study_role_check CHECK (
  study_role IS NULL OR study_role IN (
    'accounts_payable_specialist', 'biostatistician', 'clinical_contracts_specialist',
    'clinical_data_manager', 'clinical_project_manager', 'clinical_research_associate',
    'clinical_trial_assistant', 'contracts_manager', 'cra_manager', 'executive_director',
    'finance_director', 'finance_reviewer',
    'inventory_specialist', 'medical_writer',
    'principal_investigator',
    'regulatory_specialist', 'safety_specialist',
    'site_budget_specialist',
    'study_coordinator',
    'study_startup_specialist', 'vendor_manager', 'custom'
  )
);

-- ---------- 2. ip_user_access_tier() ----------

CREATE OR REPLACE FUNCTION public.ip_user_access_tier(p_study_id UUID)
RETURNS TABLE(tier TEXT, site_ids UUID[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_role TEXT;
  v_is_platform_admin BOOLEAN;
  v_sponsor_roles TEXT[] := ARRAY[
    'clinical_research_associate', 'clinical_trial_assistant',
    'clinical_project_manager', 'cra_manager', 'executive_director',
    'clinical_data_manager', 'regulatory_specialist', 'safety_specialist',
    'medical_writer', 'biostatistician'
  ];
  v_site_roles TEXT[] := ARRAY[
    'study_coordinator', 'principal_investigator', 'inventory_specialist'
  ];
  v_site_id_arr UUID[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT p.id, p.role, p.is_platform_admin
    INTO v_profile_id, v_role, v_is_platform_admin
    FROM public.profiles p
   WHERE p.user_id = v_user_id
   LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN;
  END IF;

  -- Admin / platform admin → full access
  IF v_role = 'admin' OR v_is_platform_admin = TRUE THEN
    tier := 'admin';
    site_ids := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Sponsor roles → company-wide IP access
  IF EXISTS (
    SELECT 1 FROM public.study_team_members stm
     WHERE stm.profile_id = v_profile_id
       AND stm.study_id = p_study_id
       AND stm.is_active = TRUE
       AND stm.role = ANY(v_sponsor_roles)
  ) THEN
    tier := 'sponsor';
    site_ids := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Site roles → scoped to assigned sites
  SELECT array_agg(DISTINCT stm.site_id)
    INTO v_site_id_arr
    FROM public.study_team_members stm
   WHERE stm.profile_id = v_profile_id
     AND stm.study_id = p_study_id
     AND stm.is_active = TRUE
     AND stm.role = ANY(v_site_roles)
     AND stm.site_id IS NOT NULL;

  IF v_site_id_arr IS NOT NULL AND array_length(v_site_id_arr, 1) > 0 THEN
    tier := 'site';
    site_ids := v_site_id_arr;
    RETURN NEXT;
    RETURN;
  END IF;

  -- No IP access
  RETURN;
END;
$$;

-- ---------- 3. Updated RLS policies ----------
-- Drop existing company-only policies and replace with tier-aware ones.
-- ip_items and ip_lots remain company-scoped (catalog items are global).

-- ---- ip_lot_locations ----

DROP POLICY IF EXISTS "ip_lot_locations_select" ON public.ip_lot_locations;
CREATE POLICY "ip_lot_locations_select" ON public.ip_lot_locations
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (
      (SELECT t.site_ids FROM public.ip_user_access_tier(study_id) t) IS NULL
      OR study_site_id IN (SELECT unnest(t.site_ids) FROM public.ip_user_access_tier(study_id) t)
      OR study_site_id IS NULL
    )
  );

DROP POLICY IF EXISTS "ip_lot_locations_insert" ON public.ip_lot_locations;
CREATE POLICY "ip_lot_locations_insert" ON public.ip_lot_locations
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (
      (SELECT t.site_ids FROM public.ip_user_access_tier(study_id) t) IS NULL
      OR study_site_id IN (SELECT unnest(t.site_ids) FROM public.ip_user_access_tier(study_id) t)
      OR study_site_id IS NULL
    )
  );

DROP POLICY IF EXISTS "ip_lot_locations_update" ON public.ip_lot_locations;
CREATE POLICY "ip_lot_locations_update" ON public.ip_lot_locations
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (
      (SELECT t.site_ids FROM public.ip_user_access_tier(study_id) t) IS NULL
      OR study_site_id IN (SELECT unnest(t.site_ids) FROM public.ip_user_access_tier(study_id) t)
      OR study_site_id IS NULL
    )
  );

DROP POLICY IF EXISTS "ip_lot_locations_delete" ON public.ip_lot_locations;
CREATE POLICY "ip_lot_locations_delete" ON public.ip_lot_locations
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (SELECT t.tier FROM public.ip_user_access_tier(study_id) t) = 'admin'
  );

-- ---- ip_orders ----

DROP POLICY IF EXISTS "ip_orders_select" ON public.ip_orders;
CREATE POLICY "ip_orders_select" ON public.ip_orders
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (
      (SELECT t.site_ids FROM public.ip_user_access_tier(study_id) t) IS NULL
      OR study_site_id IN (SELECT unnest(t.site_ids) FROM public.ip_user_access_tier(study_id) t)
      OR study_site_id IS NULL
    )
  );

DROP POLICY IF EXISTS "ip_orders_insert" ON public.ip_orders;
CREATE POLICY "ip_orders_insert" ON public.ip_orders
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (
      (SELECT t.site_ids FROM public.ip_user_access_tier(study_id) t) IS NULL
      OR study_site_id IN (SELECT unnest(t.site_ids) FROM public.ip_user_access_tier(study_id) t)
      OR study_site_id IS NULL
    )
  );

DROP POLICY IF EXISTS "ip_orders_update" ON public.ip_orders;
CREATE POLICY "ip_orders_update" ON public.ip_orders
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (
      (SELECT t.site_ids FROM public.ip_user_access_tier(study_id) t) IS NULL
      OR study_site_id IN (SELECT unnest(t.site_ids) FROM public.ip_user_access_tier(study_id) t)
      OR study_site_id IS NULL
    )
  );

DROP POLICY IF EXISTS "ip_orders_delete" ON public.ip_orders;
CREATE POLICY "ip_orders_delete" ON public.ip_orders
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (SELECT t.tier FROM public.ip_user_access_tier(study_id) t) = 'admin'
  );

-- ---- ip_ledger_entries ----
-- Ledger writes go through SECURITY DEFINER RPCs; only SELECT policy applies to RLS.

DROP POLICY IF EXISTS "ip_ledger_select" ON public.ip_ledger_entries;
CREATE POLICY "ip_ledger_select" ON public.ip_ledger_entries
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (
      (SELECT t.site_ids FROM public.ip_user_access_tier(study_id) t) IS NULL
      OR from_study_site_id IN (SELECT unnest(t.site_ids) FROM public.ip_user_access_tier(study_id) t)
      OR to_study_site_id IN (SELECT unnest(t.site_ids) FROM public.ip_user_access_tier(study_id) t)
      OR (from_study_site_id IS NULL AND to_study_site_id IS NULL)
    )
  );
