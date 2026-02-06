-- Create activity tracking tables for organizations and contacts
-- Tracks CRUD operations (create, update, delete, status changes, type changes)

-- Create activity type enum
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'created',
    'updated',
    'deleted',
    'status_changed',
    'type_changed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organization activity table
CREATE TABLE IF NOT EXISTS public.organization_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  description TEXT NOT NULL,
  changed_fields JSONB DEFAULT '{}'::jsonb,
  performed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact activity table
CREATE TABLE IF NOT EXISTS public.contact_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  description TEXT NOT NULL,
  changed_fields JSONB DEFAULT '{}'::jsonb,
  performed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_activity_org_id ON public.organization_activity(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_activity_created_at ON public.organization_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_activity_contact_id ON public.contact_activity(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_created_at ON public.contact_activity(created_at DESC);

-- RLS policies for organization_activity
ALTER TABLE public.organization_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view organization activity in their company" ON public.organization_activity;
CREATE POLICY "Users can view organization activity in their company" ON public.organization_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      INNER JOIN public.profiles p ON o.company_id = p.company_id
      WHERE o.id = organization_activity.organization_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create organization activity in their company" ON public.organization_activity;
CREATE POLICY "Users can create organization activity in their company" ON public.organization_activity
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      INNER JOIN public.profiles p ON o.company_id = p.company_id
      WHERE o.id = organization_activity.organization_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS policies for contact_activity
ALTER TABLE public.contact_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contact activity in their company" ON public.contact_activity;
CREATE POLICY "Users can view contact activity in their company" ON public.contact_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      INNER JOIN public.profiles p ON c.company_id = p.company_id
      WHERE c.id = contact_activity.contact_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create contact activity in their company" ON public.contact_activity;
CREATE POLICY "Users can create contact activity in their company" ON public.contact_activity
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      INNER JOIN public.profiles p ON c.company_id = p.company_id
      WHERE c.id = contact_activity.contact_id
      AND p.user_id = auth.uid()
    )
  );
