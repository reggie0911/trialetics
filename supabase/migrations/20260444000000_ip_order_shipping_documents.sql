-- Order-scoped packing slips and shipping documents (private storage + metadata table).

CREATE TABLE IF NOT EXISTS public.ip_order_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ip_orders(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  storage_object_path TEXT NOT NULL,
  original_filename TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  doc_kind TEXT NOT NULL DEFAULT 'other' CHECK (doc_kind IN ('packing_slip', 'other')),
  label TEXT,
  uploaded_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_order_documents_order_id ON public.ip_order_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_ip_order_documents_study_id ON public.ip_order_documents(study_id);

ALTER TABLE public.ip_order_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ip_order_documents_select" ON public.ip_order_documents
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "ip_order_documents_insert" ON public.ip_order_documents
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.ip_orders o
      WHERE o.id = order_id AND o.study_id = ip_order_documents.study_id
    )
  );

CREATE POLICY "ip_order_documents_update" ON public.ip_order_documents
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "ip_order_documents_delete" ON public.ip_order_documents
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.ip_order_documents IS
  'Shipping documents (e.g. packing slips) linked to ip_orders; files live in storage bucket ip-shipping-documents.';

-- Private bucket: PDF + common images; 15 MiB per object
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ip-shipping-documents',
  'ip-shipping-documents',
  false,
  15728640,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]::text[];

DROP POLICY IF EXISTS "ip_shipping_documents_upload" ON storage.objects;
CREATE POLICY "ip_shipping_documents_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ip-shipping-documents' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ip_shipping_documents_select" ON storage.objects;
CREATE POLICY "ip_shipping_documents_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'ip-shipping-documents' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ip_shipping_documents_update" ON storage.objects;
CREATE POLICY "ip_shipping_documents_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'ip-shipping-documents' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ip_shipping_documents_delete" ON storage.objects;
CREATE POLICY "ip_shipping_documents_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'ip-shipping-documents' AND auth.uid() IS NOT NULL);
