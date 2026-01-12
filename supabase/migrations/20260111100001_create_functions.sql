-- Function to generate 12-digit company ID
CREATE OR REPLACE FUNCTION public.generate_company_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  done BOOLEAN;
BEGIN
  done := false;
  WHILE NOT done LOOP
    -- Generate a random 12-digit number
    new_id := LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
    -- Check if it already exists
    done := NOT EXISTS(SELECT 1 FROM public.companies WHERE company_id = new_id);
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Set generate_company_id as default for companies.company_id
ALTER TABLE public.companies 
  ALTER COLUMN company_id SET DEFAULT generate_company_id();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
DROP TRIGGER IF EXISTS update_protocols_updated_at ON public.protocols;

-- Apply updated_at trigger to profiles table
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Apply updated_at trigger to companies table
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON public.companies
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Apply updated_at trigger to protocols table
CREATE TRIGGER update_protocols_updated_at 
  BEFORE UPDATE ON public.protocols
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
