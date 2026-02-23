-- Audit Trail and Inspection Readiness
-- System-wide audit logging with inspection export capabilities

-- ============================================================================
-- Audit Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields JSONB,
  performed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_by_email TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_company ON public.audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON public.audit_log(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit log in their company"
  ON public.audit_log FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.audit_log IS 'System-wide audit trail capturing all entity changes for inspection readiness';

-- ============================================================================
-- Audit Exports
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('inspection_package', 'ad_hoc')),
  filters JSONB,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  requested_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_exports_company ON public.audit_exports(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_exports_status ON public.audit_exports(status);

ALTER TABLE public.audit_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit exports in their company"
  ON public.audit_exports FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage audit exports in their company"
  ON public.audit_exports FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.audit_exports IS 'Tracks audit trail export requests for inspections';

-- ============================================================================
-- Audit Log Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_user_email TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
  v_changed JSONB;
  v_key TEXT;
BEGIN
  v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
  v_user_email := NULLIF(current_setting('app.current_user_email', true), '');

  IF TG_OP = 'DELETE' THEN
    v_company_id := (OLD.company_id)::UUID;
    v_old_data := to_jsonb(OLD);
    INSERT INTO public.audit_log (company_id, table_name, record_id, action, old_data, new_data, changed_fields, performed_by_id, performed_by_email)
    VALUES (v_company_id, TG_TABLE_NAME, OLD.id, 'DELETE', v_old_data, NULL, NULL, v_user_id, v_user_email);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_company_id := (NEW.company_id)::UUID;
    v_new_data := to_jsonb(NEW);
    INSERT INTO public.audit_log (company_id, table_name, record_id, action, old_data, new_data, changed_fields, performed_by_id, performed_by_email)
    VALUES (v_company_id, TG_TABLE_NAME, NEW.id, 'INSERT', NULL, v_new_data, NULL, v_user_id, v_user_email);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_company_id := (NEW.company_id)::UUID;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_changed := '{}'::JSONB;
    FOR v_key IN SELECT jsonb_object_keys(v_new_data)
    LOOP
      IF v_key NOT IN ('updated_at', 'created_at') AND
         (v_old_data->v_key IS DISTINCT FROM v_new_data->v_key) THEN
        v_changed := v_changed || jsonb_build_object(v_key, jsonb_build_object('old', v_old_data->v_key, 'new', v_new_data->v_key));
      END IF;
    END LOOP;
    IF v_changed != '{}'::JSONB THEN
      INSERT INTO public.audit_log (company_id, table_name, record_id, action, old_data, new_data, changed_fields, performed_by_id, performed_by_email)
      VALUES (v_company_id, TG_TABLE_NAME, NEW.id, 'UPDATE', v_old_data, v_new_data, v_changed, v_user_id, v_user_email);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Apply audit triggers to high-value tables
-- ============================================================================

DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clinical_protocols', 'subjects', 'subject_visits', 'site_contracts',
    'payment_records', 'document_records', 'action_items', 'vendors',
    'tmf_artifacts'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_%I ON public.%I', t, t);
    EXECUTE format('
      CREATE TRIGGER audit_trigger_%I
        AFTER INSERT OR UPDATE OR DELETE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger()
    ', t, t);
  END LOOP;
END $$;
