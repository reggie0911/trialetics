-- Phase 2: per-study default template + amount-based escalation (extra Finance Director / Executive Director step).

ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS finance_approval_template_id UUID REFERENCES public.finance_approval_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_studies_finance_approval_template ON public.studies(finance_approval_template_id);

COMMENT ON COLUMN public.studies.finance_approval_template_id IS 'When set, new invoice submissions use this template unless the draft specifies another. Falls back to company default.';

CREATE OR REPLACE FUNCTION public.finance_invoice_record_decision(
  p_invoice_id uuid,
  p_decision text,
  p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_company_id uuid;
  v_app_role text;
  v_invoice record;
  v_template record;
  v_steps jsonb;
  v_step jsonb;
  v_allowed jsonb;
  v_role text;
  v_ok boolean := false;
  v_amount_cents bigint;
  v_escalation bigint;
  v_needs_escalation boolean;
  v_n int;
  v_total_steps int;
  v_next_step int;
  v_new_status text;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_decision');
  END IF;

  SELECT id, company_id, role INTO v_profile_id, v_company_id, v_app_role
  FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invoice FROM public.finance_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invoice_not_found');
  END IF;
  IF v_invoice.company_id IS DISTINCT FROM v_company_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.finance_invoices SET status = 'rejected', updated_at = NOW() WHERE id = p_invoice_id;
    INSERT INTO public.finance_invoice_decisions (invoice_id, step_index, profile_id, decision, comment)
    VALUES (p_invoice_id, v_invoice.approval_step, v_profile_id, 'rejected', NULLIF(trim(p_comment), ''));
    INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
    VALUES (v_company_id, v_invoice.study_id, 'finance_invoice', p_invoice_id, 'reject', v_profile_id, v_invoice.status, 'rejected',
      jsonb_build_object('step', v_invoice.approval_step));
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  IF v_invoice.status NOT IN ('submitted', 'under_review') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invoice_not_in_review');
  END IF;

  SELECT * INTO v_template FROM public.finance_approval_templates
  WHERE id = COALESCE(v_invoice.template_id, (
    SELECT id FROM public.finance_approval_templates t
    WHERE t.company_id = v_invoice.company_id AND t.is_default = true LIMIT 1
  ));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_template');
  END IF;

  v_steps := v_template.steps;
  IF jsonb_typeof(v_steps) <> 'array' OR jsonb_array_length(v_steps) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_template');
  END IF;

  v_n := jsonb_array_length(v_steps);
  v_amount_cents := (ROUND((v_invoice.amount)::numeric * 100))::bigint;
  v_escalation := COALESCE(v_template.escalation_threshold_cents, 0);
  v_needs_escalation := v_amount_cents > v_escalation;
  v_total_steps := v_n + (CASE WHEN v_needs_escalation THEN 1 ELSE 0 END);

  IF v_invoice.approval_step >= v_total_steps THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_pending_step');
  END IF;

  IF v_invoice.approval_step < v_n THEN
    v_step := v_steps -> v_invoice.approval_step;
    v_allowed := v_step -> 'study_roles_any';
  ELSIF v_needs_escalation AND v_invoice.approval_step = v_n THEN
    v_allowed := '["finance_director","executive_director"]'::jsonb;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'no_pending_step');
  END IF;

  IF v_allowed IS NULL OR jsonb_typeof(v_allowed) <> 'array' OR jsonb_array_length(v_allowed) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_template');
  END IF;

  IF v_app_role = 'admin' THEN
    v_ok := true;
  ELSE
    FOR v_role IN
      SELECT stm.role::text FROM public.study_team_members stm
      WHERE stm.study_id = v_invoice.study_id AND stm.profile_id = v_profile_id AND stm.is_active = true
    LOOP
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_allowed) AS ar(val) WHERE ar.val = v_role
      ) THEN
        v_ok := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized_for_step');
  END IF;

  INSERT INTO public.finance_invoice_decisions (invoice_id, step_index, profile_id, decision, comment)
  VALUES (p_invoice_id, v_invoice.approval_step, v_profile_id, 'approved', NULLIF(trim(p_comment), ''));

  v_next_step := v_invoice.approval_step + 1;
  IF v_next_step >= v_total_steps THEN
    v_new_status := 'approved';
    UPDATE public.finance_invoices
    SET status = 'approved', approval_step = v_next_step, updated_at = NOW()
    WHERE id = p_invoice_id;
  ELSE
    v_new_status := 'under_review';
    UPDATE public.finance_invoices
    SET status = 'under_review', approval_step = v_next_step, updated_at = NOW()
    WHERE id = p_invoice_id;
  END IF;

  INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
  VALUES (
    v_company_id,
    v_invoice.study_id,
    'finance_invoice',
    p_invoice_id,
    'approve_step',
    v_profile_id,
    v_invoice.status,
    v_new_status,
    jsonb_build_object(
      'step_completed', v_invoice.approval_step,
      'next_step', v_next_step,
      'escalation_step', v_needs_escalation AND v_invoice.approval_step = v_n
    )
  );

  RETURN jsonb_build_object('ok', true, 'status', v_new_status, 'approval_step', v_next_step);
END;
$$;
