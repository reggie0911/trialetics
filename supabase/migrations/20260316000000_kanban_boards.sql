-- =====================================================
-- Kanban Boards (Trello-like)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('task', 'milestone')),
  study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_boards_company ON public.kanban_boards(company_id);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_study ON public.kanban_boards(study_id);

CREATE TRIGGER update_kanban_boards_updated_at
  BEFORE UPDATE ON public.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_boards_select" ON public.kanban_boards
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "kanban_boards_insert" ON public.kanban_boards
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "kanban_boards_update" ON public.kanban_boards
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "kanban_boards_delete" ON public.kanban_boards
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- =====================================================
-- Kanban Lists (columns on a board)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kanban_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board_id, status)
);

CREATE INDEX IF NOT EXISTS idx_kanban_lists_board ON public.kanban_lists(board_id);

CREATE TRIGGER update_kanban_lists_updated_at
  BEFORE UPDATE ON public.kanban_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kanban_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_lists_select" ON public.kanban_lists
  FOR SELECT USING (
    board_id IN (
      SELECT id FROM public.kanban_boards
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "kanban_lists_insert" ON public.kanban_lists
  FOR INSERT WITH CHECK (
    board_id IN (
      SELECT id FROM public.kanban_boards
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "kanban_lists_update" ON public.kanban_lists
  FOR UPDATE USING (
    board_id IN (
      SELECT id FROM public.kanban_boards
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "kanban_lists_delete" ON public.kanban_lists
  FOR DELETE USING (
    board_id IN (
      SELECT id FROM public.kanban_boards
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
