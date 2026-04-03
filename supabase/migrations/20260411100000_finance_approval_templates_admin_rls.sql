-- Restrict finance_approval_templates mutations to company admins; keep SELECT for all company members.

DROP POLICY IF EXISTS "finance_approval_templates_insert" ON public.finance_approval_templates;
DROP POLICY IF EXISTS "finance_approval_templates_update" ON public.finance_approval_templates;
DROP POLICY IF EXISTS "finance_approval_templates_delete" ON public.finance_approval_templates;

CREATE POLICY "finance_approval_templates_insert" ON public.finance_approval_templates FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = finance_approval_templates.company_id
  )
);

CREATE POLICY "finance_approval_templates_update" ON public.finance_approval_templates FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = finance_approval_templates.company_id
  )
);

CREATE POLICY "finance_approval_templates_delete" ON public.finance_approval_templates FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = finance_approval_templates.company_id
  )
);
