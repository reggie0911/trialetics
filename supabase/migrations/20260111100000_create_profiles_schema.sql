-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_company_id ON public.companies(company_id);

-- Create or update profiles table
DO $$
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
      first_name TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;

  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_id') THEN
    ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'first_name') THEN
    ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'));
  END IF;
END $$;

-- Create indexes for profiles (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_id') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
  END IF;
END $$;

-- Create protocols table
CREATE TABLE IF NOT EXISTS public.protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_number TEXT NOT NULL,
  protocol_name TEXT NOT NULL,
  protocol_description TEXT,
  country_name TEXT,
  country_region TEXT,
  protocol_status TEXT NOT NULL DEFAULT 'planning' CHECK (protocol_status IN ('planning', 'approved', 'closed')),
  planned_sites INTEGER CHECK (planned_sites >= 0),
  planned_subjects INTEGER CHECK (planned_subjects >= 0),
  planned_start_date DATE,
  planned_end_date DATE,
  trial_phase TEXT CHECK (trial_phase IN ('Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Pilot Stage', 'Pivotal', 'Post Market', 'Early Feasibility Study', 'First In-Human')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_protocol_per_company'
  ) THEN
    ALTER TABLE public.protocols ADD CONSTRAINT unique_protocol_per_company UNIQUE (company_id, protocol_number);
  END IF;
END $$;

-- Create index on protocol_status for filtering
CREATE INDEX IF NOT EXISTS idx_protocols_status ON public.protocols(protocol_status);
CREATE INDEX IF NOT EXISTS idx_protocols_company_id ON public.protocols(company_id);

-- Create modules table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_protocols junction table
CREATE TABLE IF NOT EXISTS public.user_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_protocol'
  ) THEN
    ALTER TABLE public.user_protocols ADD CONSTRAINT unique_user_protocol UNIQUE (user_id, protocol_id);
  END IF;
END $$;

-- Create indexes for user_protocols
CREATE INDEX IF NOT EXISTS idx_user_protocols_user_id ON public.user_protocols(user_id);
CREATE INDEX IF NOT EXISTS idx_user_protocols_protocol_id ON public.user_protocols(protocol_id);

-- Create user_modules junction table
CREATE TABLE IF NOT EXISTS public.user_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_module'
  ) THEN
    ALTER TABLE public.user_modules ADD CONSTRAINT unique_user_module UNIQUE (user_id, module_id);
  END IF;
END $$;

-- Create indexes for user_modules
CREATE INDEX IF NOT EXISTS idx_user_modules_user_id ON public.user_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_modules_module_id ON public.user_modules(module_id);
