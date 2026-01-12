-- Enable Row Level Security on all tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'protocols') THEN
    ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'modules') THEN
    ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_protocols') THEN
    ALTER TABLE public.user_protocols ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_modules') THEN
    ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Admins can update own company" ON public.companies;
DROP POLICY IF EXISTS "Admins can create companies" ON public.companies;

DROP POLICY IF EXISTS "Users can view assigned protocols" ON public.protocols;
DROP POLICY IF EXISTS "Admins can view company protocols" ON public.protocols;
DROP POLICY IF EXISTS "Admins can create company protocols" ON public.protocols;
DROP POLICY IF EXISTS "Admins can update company protocols" ON public.protocols;
DROP POLICY IF EXISTS "Admins can delete company protocols" ON public.protocols;

DROP POLICY IF EXISTS "Users can view own protocol assignments" ON public.user_protocols;
DROP POLICY IF EXISTS "Admins can view company protocol assignments" ON public.user_protocols;
DROP POLICY IF EXISTS "Admins can create protocol assignments" ON public.user_protocols;
DROP POLICY IF EXISTS "Admins can delete protocol assignments" ON public.user_protocols;

DROP POLICY IF EXISTS "Everyone can view active modules" ON public.modules;

DROP POLICY IF EXISTS "Users can view own module access" ON public.user_modules;
DROP POLICY IF EXISTS "Admins can view company module access" ON public.user_modules;
DROP POLICY IF EXISTS "Admins can grant module access" ON public.user_modules;
DROP POLICY IF EXISTS "Admins can revoke module access" ON public.user_modules;

-- Create policies only if user_id column exists in profiles
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id') THEN

    -- ============================================================================
    -- PROFILES POLICIES
    -- ============================================================================

    -- Users can read their own profile
    EXECUTE 'CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id)';

    -- Admins can read all profiles in their company
    EXECUTE 'CREATE POLICY "Admins can view company profiles" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = ''admin'' AND p.company_id = profiles.company_id))';

    -- Users can update their own profile (limited fields)
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()) AND (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) OR company_id IS NULL))';

    -- Admins can update profiles in their company
    EXECUTE 'CREATE POLICY "Admins can update company profiles" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = ''admin'' AND p.company_id = profiles.company_id))';

    -- Allow insert for the trigger function
    EXECUTE 'CREATE POLICY "Allow profile creation on signup" ON public.profiles FOR INSERT WITH CHECK (true)';

    -- ============================================================================
    -- COMPANIES POLICIES
    -- ============================================================================

    -- Users can read their own company
    EXECUTE 'CREATE POLICY "Users can view own company" ON public.companies FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = companies.id))';

    -- Admins can update their company
    EXECUTE 'CREATE POLICY "Admins can update own company" ON public.companies FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = companies.id AND profiles.role = ''admin''))';

    -- Admins can create companies
    EXECUTE 'CREATE POLICY "Admins can create companies" ON public.companies FOR INSERT WITH CHECK (true)';

    -- ============================================================================
    -- PROTOCOLS POLICIES
    -- ============================================================================

    -- Users can read protocols they're assigned to
    EXECUTE 'CREATE POLICY "Users can view assigned protocols" ON public.protocols FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_protocols up JOIN public.profiles p ON p.id = up.user_id WHERE p.user_id = auth.uid() AND up.protocol_id = protocols.id))';

    -- Admins can read all protocols in their company
    EXECUTE 'CREATE POLICY "Admins can view company protocols" ON public.protocols FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = ''admin'' AND profiles.company_id = protocols.company_id))';

    -- Admins can create protocols in their company
    EXECUTE 'CREATE POLICY "Admins can create company protocols" ON public.protocols FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = ''admin'' AND profiles.company_id = protocols.company_id))';

    -- Admins can update protocols in their company
    EXECUTE 'CREATE POLICY "Admins can update company protocols" ON public.protocols FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = ''admin'' AND profiles.company_id = protocols.company_id))';

    -- Admins can delete protocols in their company
    EXECUTE 'CREATE POLICY "Admins can delete company protocols" ON public.protocols FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = ''admin'' AND profiles.company_id = protocols.company_id))';

    -- ============================================================================
    -- USER_PROTOCOLS POLICIES
    -- ============================================================================

    -- Users can read their own protocol assignments
    EXECUTE 'CREATE POLICY "Users can view own protocol assignments" ON public.user_protocols FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.id = user_protocols.user_id))';

    -- Admins can read protocol assignments in their company
    EXECUTE 'CREATE POLICY "Admins can view company protocol assignments" ON public.user_protocols FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p2.id = user_protocols.user_id WHERE p1.user_id = auth.uid() AND p1.role = ''admin'' AND p1.company_id = p2.company_id))';

    -- Admins can create protocol assignments in their company
    EXECUTE 'CREATE POLICY "Admins can create protocol assignments" ON public.user_protocols FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p2.id = user_protocols.user_id WHERE p1.user_id = auth.uid() AND p1.role = ''admin'' AND p1.company_id = p2.company_id))';

    -- Admins can delete protocol assignments in their company
    EXECUTE 'CREATE POLICY "Admins can delete protocol assignments" ON public.user_protocols FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p2.id = user_protocols.user_id WHERE p1.user_id = auth.uid() AND p1.role = ''admin'' AND p1.company_id = p2.company_id))';

    -- ============================================================================
    -- MODULES POLICIES
    -- ============================================================================

    -- Everyone can read active modules
    EXECUTE 'CREATE POLICY "Everyone can view active modules" ON public.modules FOR SELECT USING (active = true OR auth.uid() IS NOT NULL)';

    -- ============================================================================
    -- USER_MODULES POLICIES
    -- ============================================================================

    -- Users can read their own module access
    EXECUTE 'CREATE POLICY "Users can view own module access" ON public.user_modules FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.id = user_modules.user_id))';

    -- Admins can read module access in their company
    EXECUTE 'CREATE POLICY "Admins can view company module access" ON public.user_modules FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p2.id = user_modules.user_id WHERE p1.user_id = auth.uid() AND p1.role = ''admin'' AND p1.company_id = p2.company_id))';

    -- Admins can grant module access in their company
    EXECUTE 'CREATE POLICY "Admins can grant module access" ON public.user_modules FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p2.id = user_modules.user_id WHERE p1.user_id = auth.uid() AND p1.role = ''admin'' AND p1.company_id = p2.company_id))';

    -- Admins can revoke module access in their company
    EXECUTE 'CREATE POLICY "Admins can revoke module access" ON public.user_modules FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p2.id = user_modules.user_id WHERE p1.user_id = auth.uid() AND p1.role = ''admin'' AND p1.company_id = p2.company_id))';

  END IF;
END $$;
