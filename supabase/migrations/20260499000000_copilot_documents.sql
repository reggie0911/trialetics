-- Copilot document ingestion (Phase 6)
--
-- Tables:
--   copilot_documents             — file metadata + classification
--   copilot_document_chunks       — extracted text chunks (with optional embeddings)
--   copilot_document_extractions  — typed structured fields per doc (traceable to chunks)
--   copilot_document_links        — many-to-many between documents and CTMS records
--
-- Pattern: per-user RLS, append-only audit hooks via Phase 3 `recordAudit`,
-- soft-delete (`deleted_at`) so retention is configurable.

-- pgvector extension for chunk embeddings.
-- Supabase Postgres ships with the `vector` extension available; install if missing.
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================================
-- copilot_documents
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.copilot_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT,
  sha256 TEXT NOT NULL,

  -- Optional CTMS scope
  study_id UUID,
  site_id UUID,
  subject_id UUID,

  -- Classification
  doc_type TEXT NOT NULL DEFAULT 'unknown',
  doc_type_confidence NUMERIC(4,3) DEFAULT 0.0,
  classifier_signals JSONB DEFAULT '{}'::jsonb,

  -- Pipeline status
  status TEXT NOT NULL DEFAULT 'pending',
  status_message TEXT,

  -- Extraction outputs
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Agent versioning
  agent_id TEXT NOT NULL DEFAULT 'document-router',
  agent_version TEXT NOT NULL DEFAULT '1.0.0',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT copilot_documents_status_chk CHECK (
    status IN ('pending', 'extracting', 'ready', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_copilot_documents_user
  ON public.copilot_documents(user_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_copilot_documents_company
  ON public.copilot_documents(company_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_copilot_documents_sha
  ON public.copilot_documents(company_id, sha256)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_copilot_documents_doctype
  ON public.copilot_documents(doc_type)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_copilot_documents_study
  ON public.copilot_documents(study_id)
  WHERE deleted_at IS NULL AND study_id IS NOT NULL;

ALTER TABLE public.copilot_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_documents_select ON public.copilot_documents;
CREATE POLICY copilot_documents_select ON public.copilot_documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS copilot_documents_insert ON public.copilot_documents;
CREATE POLICY copilot_documents_insert ON public.copilot_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS copilot_documents_update ON public.copilot_documents;
CREATE POLICY copilot_documents_update ON public.copilot_documents
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS copilot_documents_delete ON public.copilot_documents;
CREATE POLICY copilot_documents_delete ON public.copilot_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Maintain updated_at automatically.
CREATE OR REPLACE FUNCTION public.copilot_documents_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS copilot_documents_touch_updated_at ON public.copilot_documents;
CREATE TRIGGER copilot_documents_touch_updated_at
  BEFORE UPDATE ON public.copilot_documents
  FOR EACH ROW EXECUTE FUNCTION public.copilot_documents_touch_updated_at();

-- =====================================================================
-- copilot_document_chunks
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.copilot_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.copilot_documents(id) ON DELETE CASCADE,
  ordinal INT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  structured JSONB,
  page_or_slide INT,
  sheet_name TEXT,
  embedding vector(1536),
  token_estimate INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT copilot_document_chunks_kind_chk CHECK (
    kind IN ('text', 'table', 'slide', 'sheet', 'email', 'metadata')
  ),
  UNIQUE (document_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_copilot_document_chunks_doc
  ON public.copilot_document_chunks(document_id, ordinal);

-- HNSW index for cosine similarity (skipped on tiny datasets; created for prod scale).
-- Wrap in DO block so it's tolerant if the extension lacks IVFFlat/HNSW builds.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_copilot_document_chunks_embedding '
         || 'ON public.copilot_document_chunks USING hnsw (embedding vector_cosine_ops)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Index build is non-essential for correctness; skip on environments
  -- without HNSW support (older pgvector). Sequential scan still works.
  NULL;
END $$;

ALTER TABLE public.copilot_document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_document_chunks_select ON public.copilot_document_chunks;
CREATE POLICY copilot_document_chunks_select ON public.copilot_document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.copilot_documents d
      WHERE d.id = copilot_document_chunks.document_id AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS copilot_document_chunks_insert ON public.copilot_document_chunks;
CREATE POLICY copilot_document_chunks_insert ON public.copilot_document_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.copilot_documents d
      WHERE d.id = copilot_document_chunks.document_id AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS copilot_document_chunks_delete ON public.copilot_document_chunks;
CREATE POLICY copilot_document_chunks_delete ON public.copilot_document_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.copilot_documents d
      WHERE d.id = copilot_document_chunks.document_id AND d.user_id = auth.uid()
    )
  );

-- =====================================================================
-- copilot_document_extractions  (typed structured fields per doc)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.copilot_document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.copilot_documents(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence NUMERIC(4,3) DEFAULT 0.0,
  source_chunk_id UUID REFERENCES public.copilot_document_chunks(id) ON DELETE SET NULL,
  source_excerpt TEXT,
  extractor TEXT NOT NULL DEFAULT 'document-router',
  agent_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copilot_document_extractions_doc
  ON public.copilot_document_extractions(document_id, field_name);

ALTER TABLE public.copilot_document_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_document_extractions_select ON public.copilot_document_extractions;
CREATE POLICY copilot_document_extractions_select ON public.copilot_document_extractions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.copilot_documents d
      WHERE d.id = copilot_document_extractions.document_id AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS copilot_document_extractions_insert ON public.copilot_document_extractions;
CREATE POLICY copilot_document_extractions_insert ON public.copilot_document_extractions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.copilot_documents d
      WHERE d.id = copilot_document_extractions.document_id AND d.user_id = auth.uid()
    )
  );

-- =====================================================================
-- copilot_document_links  (M:N with CTMS records)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.copilot_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.copilot_documents(id) ON DELETE CASCADE,
  link_kind TEXT NOT NULL,
  link_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT copilot_document_links_kind_chk CHECK (
    link_kind IN ('study', 'site', 'subject', 'visit', 'task', 'financial', 'capa', 'deviation', 'tmf', 'other')
  ),
  UNIQUE (document_id, link_kind, link_id)
);

CREATE INDEX IF NOT EXISTS idx_copilot_document_links_link
  ON public.copilot_document_links(link_kind, link_id);

ALTER TABLE public.copilot_document_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_document_links_select ON public.copilot_document_links;
CREATE POLICY copilot_document_links_select ON public.copilot_document_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.copilot_documents d
      WHERE d.id = copilot_document_links.document_id AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS copilot_document_links_insert ON public.copilot_document_links;
CREATE POLICY copilot_document_links_insert ON public.copilot_document_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.copilot_documents d
      WHERE d.id = copilot_document_links.document_id AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS copilot_document_links_delete ON public.copilot_document_links;
CREATE POLICY copilot_document_links_delete ON public.copilot_document_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.copilot_documents d
      WHERE d.id = copilot_document_links.document_id AND d.user_id = auth.uid()
    )
  );

-- =====================================================================
-- match_copilot_chunks RPC
-- =====================================================================
-- Returns the top `p_match_count` chunks across the company's documents
-- ordered by cosine distance to the supplied embedding. Optional
-- `p_document_ids` narrows the search to a specific document set.
--
-- Service role / authenticated callers only; RLS on the underlying
-- tables gates per-user visibility before the RPC even sees the rows.
CREATE OR REPLACE FUNCTION public.match_copilot_chunks(
  p_company_id UUID,
  p_query_embedding vector(1536),
  p_match_count INT DEFAULT 8,
  p_document_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  ordinal INT,
  kind TEXT,
  content TEXT,
  structured JSONB,
  page_or_slide INT,
  sheet_name TEXT,
  token_estimate INT,
  distance REAL
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.document_id,
    c.ordinal,
    c.kind,
    c.content,
    c.structured,
    c.page_or_slide,
    c.sheet_name,
    c.token_estimate,
    (c.embedding <=> p_query_embedding) AS distance
  FROM public.copilot_document_chunks c
  JOIN public.copilot_documents d ON d.id = c.document_id
  WHERE d.company_id = p_company_id
    AND d.deleted_at IS NULL
    AND c.embedding IS NOT NULL
    AND (p_document_ids IS NULL OR c.document_id = ANY(p_document_ids))
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT GREATEST(p_match_count, 1);
$$;

COMMENT ON TABLE public.copilot_documents IS
  'Trialetics Copilot uploaded documents (Phase 6). Soft-deleted via deleted_at; SHA-256 dedup per company.';
COMMENT ON TABLE public.copilot_document_chunks IS
  'Per-document chunks with optional pgvector embeddings for RAG.';
COMMENT ON TABLE public.copilot_document_extractions IS
  'Typed extracted fields with chunk-level traceability.';
COMMENT ON TABLE public.copilot_document_links IS
  'Many-to-many binding between documents and CTMS records.';
