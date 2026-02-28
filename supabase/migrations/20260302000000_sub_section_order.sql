-- Sub-section ordering for trip report templates
CREATE TABLE IF NOT EXISTS public.trip_report_template_sub_section_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.trip_report_templates(id) ON DELETE CASCADE,
  sub_section_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, sub_section_name)
);

CREATE INDEX IF NOT EXISTS idx_sub_section_order_template_id
  ON public.trip_report_template_sub_section_order(template_id);

ALTER TABLE public.trip_report_template_sub_section_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sub-section order via template company"
  ON public.trip_report_template_sub_section_order FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.trip_report_templates
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage sub-section order via template company"
  ON public.trip_report_template_sub_section_order FOR ALL
  USING (
    template_id IN (
      SELECT id FROM public.trip_report_templates
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.trip_report_templates
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.trip_report_template_sub_section_order IS 'Custom display order for report sub-sections within a template';
