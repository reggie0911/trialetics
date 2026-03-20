-- Platform admin: cross-tenant business / product analytics (non-PHI aggregates).
-- Single RPC returns JSON for one round-trip from the app.

CREATE OR REPLACE FUNCTION public.platform_business_analytics(p_days integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_cutoff timestamptz;
  v_cutoff_30 timestamptz;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_days := COALESCE(p_days, 90);
  IF v_days < 1 THEN
    v_days := 90;
  END IF;
  IF v_days > 730 THEN
    v_days := 730;
  END IF;

  v_cutoff := NOW() - (v_days || ' days')::interval;
  v_cutoff_30 := NOW() - interval '30 days';

  RETURN (
    WITH
    audit_in_period AS (
      SELECT *
      FROM public.company_module_audit a
      WHERE a.changed_at >= v_cutoff
    ),
    audit_category AS (
      SELECT
        a.id,
        a.company_id,
        a.changed_by,
        a.old_values,
        a.new_values,
        a.changed_at,
        CASE
          WHEN a.new_values ? 'tracker_definition_id' THEN 'tracker_def'
          WHEN a.new_values ? 'enabled_study_tracker_keys' THEN 'study_keys'
          WHEN a.new_values ? 'has_ctms_access'
            OR a.new_values ? 'has_etmf_access'
            OR a.new_values ? 'has_tracker_access' THEN 'module_flags'
          ELSE 'other'
        END AS category
      FROM audit_in_period a
    ),
    member_counts AS (
      SELECT p.company_id, COUNT(*)::integer AS member_count
      FROM public.profiles p
      WHERE p.company_id IS NOT NULL
      GROUP BY p.company_id
    ),
    def_counts AS (
      SELECT d.company_id, COUNT(*)::integer AS def_count
      FROM public.custom_tracker_definitions d
      GROUP BY d.company_id
    ),
    last_audit AS (
      SELECT a.company_id, MAX(a.changed_at) AS last_at
      FROM public.company_module_audit a
      GROUP BY a.company_id
    ),
    snapshot AS (
      SELECT jsonb_build_object(
        'company_count', (SELECT COUNT(*)::integer FROM public.companies),
        'new_companies_in_range', (
          SELECT COUNT(*)::integer FROM public.companies c WHERE c.created_at >= v_cutoff
        ),
        'new_companies_last_30_days', (
          SELECT COUNT(*)::integer FROM public.companies c WHERE c.created_at >= v_cutoff_30
        ),
        'profile_total', (
          SELECT COUNT(*)::integer FROM public.profiles p WHERE p.company_id IS NOT NULL
        ),
        'paying_subscriptions', (
          SELECT COUNT(*)::integer FROM public.subscriptions s
          WHERE s.status IN ('active', 'trialing')
        ),
        'at_risk_subscriptions', (
          SELECT COUNT(*)::integer FROM public.subscriptions s
          WHERE s.status IN ('past_due', 'cancelled')
        ),
        'companies_without_subscription', (
          SELECT COUNT(*)::integer
          FROM public.companies c
          WHERE NOT EXISTS (
            SELECT 1 FROM public.subscriptions s WHERE s.company_id = c.id
          )
        ),
        'module_ctms_enabled', (
          SELECT COUNT(*)::integer FROM public.companies c WHERE c.has_ctms_access IS TRUE
        ),
        'module_etmf_enabled', (
          SELECT COUNT(*)::integer FROM public.companies c WHERE c.has_etmf_access IS TRUE
        ),
        'module_tracker_enabled', (
          SELECT COUNT(*)::integer FROM public.companies c WHERE c.has_tracker_access IS TRUE
        ),
        'tracker_definitions_total', (
          SELECT COUNT(*)::integer FROM public.custom_tracker_definitions
        ),
        'tracker_definitions_active', (
          SELECT COUNT(*)::integer FROM public.custom_tracker_definitions d WHERE d.active IS TRUE
        ),
        'tracker_definitions_platform_enabled', (
          SELECT COUNT(*)::integer
          FROM public.custom_tracker_definitions d
          WHERE d.platform_access_enabled IS TRUE
        ),
        'companies_with_custom_definitions', (
          SELECT COUNT(DISTINCT d.company_id)::integer
          FROM public.custom_tracker_definitions d
        ),
        'audit_events_in_range', (SELECT COUNT(*)::integer FROM audit_in_period),
        'seat_stats', jsonb_build_object(
          'min', COALESCE((SELECT MIN(m.member_count) FROM member_counts m), 0),
          'max', COALESCE((SELECT MAX(m.member_count) FROM member_counts m), 0),
          'avg', COALESCE(
            (SELECT ROUND(AVG(m.member_count)::numeric, 2) FROM member_counts m),
            0
          )
        )
      ) AS j
    ),
    subscription_mix AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object('plan', x.plan, 'status', x.status, 'count', x.cnt)
          ORDER BY x.plan, x.status
        ),
        '[]'::jsonb
      ) AS j
      FROM (
        SELECT s.plan, s.status, COUNT(*)::integer AS cnt
        FROM public.subscriptions s
        GROUP BY s.plan, s.status
      ) x
    ),
    audit_daily AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'date', ad.bucket_date::text,
            'module_flags', ad.module_flags,
            'study_keys', ad.study_keys,
            'tracker_def', ad.tracker_def,
            'other', ad.other
          )
          ORDER BY ad.bucket_date
        ),
        '[]'::jsonb
      ) AS j
      FROM (
        SELECT
          (date_trunc('day', ac.changed_at) AT TIME ZONE 'UTC')::date AS bucket_date,
          COUNT(*) FILTER (WHERE ac.category = 'module_flags')::integer AS module_flags,
          COUNT(*) FILTER (WHERE ac.category = 'study_keys')::integer AS study_keys,
          COUNT(*) FILTER (WHERE ac.category = 'tracker_def')::integer AS tracker_def,
          COUNT(*) FILTER (WHERE ac.category = 'other')::integer AS other
        FROM audit_category ac
        GROUP BY 1
      ) ad
    ),
    new_tenants_weekly AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object('week_start', w.week_start::text, 'count', w.cnt)
          ORDER BY w.week_start
        ),
        '[]'::jsonb
      ) AS j
      FROM (
        SELECT
          (date_trunc('week', c.created_at) AT TIME ZONE 'UTC')::date AS week_start,
          COUNT(*)::integer AS cnt
        FROM public.companies c
        WHERE c.created_at >= v_cutoff
        GROUP BY 1
      ) w
    ),
    audit_companies_weekly AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object('week_start', w.week_start::text, 'distinct_companies', w.cnt)
          ORDER BY w.week_start
        ),
        '[]'::jsonb
      ) AS j
      FROM (
        SELECT
          (date_trunc('week', a.changed_at) AT TIME ZONE 'UTC')::date AS week_start,
          COUNT(DISTINCT a.company_id)::integer AS cnt
        FROM public.company_module_audit a
        WHERE a.changed_at >= v_cutoff
        GROUP BY 1
      ) w
    ),
    company_rows AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'plan', COALESCE(s.plan, 'none'),
            'subscription_status', COALESCE(s.status, 'none'),
            'member_count', COALESCE(mem.member_count, 0),
            'has_ctms_access', c.has_ctms_access,
            'has_etmf_access', c.has_etmf_access,
            'has_tracker_access', c.has_tracker_access,
            'enabled_study_tracker_key_count', COALESCE(cardinality(c.enabled_study_tracker_keys), 0),
            'custom_definitions_count', COALESCE(dc.def_count, 0),
            'last_audit_at', to_jsonb(la.last_at)
          )
          ORDER BY c.name
        ),
        '[]'::jsonb
      ) AS j
      FROM public.companies c
      LEFT JOIN public.subscriptions s ON s.company_id = c.id
      LEFT JOIN member_counts mem ON mem.company_id = c.id
      LEFT JOIN def_counts dc ON dc.company_id = c.id
      LEFT JOIN last_audit la ON la.company_id = c.id
    ),
    recent_audit AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'company_id', r.company_id,
            'company_name', r.company_name,
            'changed_at', r.changed_at,
            'category', r.category,
            'summary', r.summary
          )
          ORDER BY r.changed_at DESC
        ),
        '[]'::jsonb
      ) AS j
      FROM (
        SELECT
          a.id,
          a.company_id,
          c.name AS company_name,
          a.changed_at,
          CASE
            WHEN a.new_values ? 'tracker_definition_id' THEN 'tracker_def'
            WHEN a.new_values ? 'enabled_study_tracker_keys' THEN 'study_keys'
            WHEN a.new_values ? 'has_ctms_access'
              OR a.new_values ? 'has_etmf_access'
              OR a.new_values ? 'has_tracker_access' THEN 'module_flags'
            ELSE 'other'
          END AS category,
          CASE
            WHEN a.new_values ? 'tracker_definition_id' THEN
              COALESCE(a.new_values->>'action', 'tracker')
            WHEN a.new_values ? 'enabled_study_tracker_keys' THEN 'study_tracker_keys'
            WHEN a.new_values ? 'has_ctms_access' THEN 'module_access'
            ELSE 'other'
          END AS summary
        FROM (
          SELECT *
          FROM public.company_module_audit a
          ORDER BY a.changed_at DESC
          LIMIT 50
        ) a
        JOIN public.companies c ON c.id = a.company_id
      ) r
    )
    SELECT jsonb_build_object(
      'range_days', to_jsonb(v_days),
      'snapshot', (SELECT j FROM snapshot),
      'subscription_mix', (SELECT j FROM subscription_mix),
      'audit_series_daily', (SELECT j FROM audit_daily),
      'new_companies_weekly', (SELECT j FROM new_tenants_weekly),
      'audit_distinct_companies_weekly', (SELECT j FROM audit_companies_weekly),
      'companies', (SELECT j FROM company_rows),
      'recent_audit', (SELECT j FROM recent_audit)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_business_analytics(integer) TO authenticated;
