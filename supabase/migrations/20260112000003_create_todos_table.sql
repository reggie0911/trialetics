-- Create todos table for task management
CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_todos_user_project ON public.todos(user_id, project_id);
CREATE INDEX idx_todos_completed ON public.todos(completed);
CREATE INDEX idx_todos_due_date ON public.todos(due_date);

-- RLS Policies
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view todos for their projects" ON public.todos
  FOR SELECT USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create their own todos" ON public.todos
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own todos" ON public.todos
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own todos" ON public.todos
  FOR DELETE USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
    NEW.completed_at = NOW();
  END IF;
  IF NEW.completed = FALSE AND OLD.completed = TRUE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION update_todos_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.todos IS 'Task management for projects';
COMMENT ON COLUMN public.todos.title IS 'Task title';
COMMENT ON COLUMN public.todos.description IS 'Detailed description of the task';
COMMENT ON COLUMN public.todos.completed IS 'Task completion status';
COMMENT ON COLUMN public.todos.due_date IS 'When the task is due';
COMMENT ON COLUMN public.todos.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN public.todos.position IS 'Display order position';
