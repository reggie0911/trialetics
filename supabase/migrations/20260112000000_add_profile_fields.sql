-- Add new profile fields for comprehensive user profile management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';

-- Add UPDATE policy for users to edit their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.last_name IS 'User last name';
COMMENT ON COLUMN public.profiles.display_name IS 'Preferred display name for UI';
COMMENT ON COLUMN public.profiles.job_title IS 'Professional role (e.g., Lead CRC, Site Monitor II)';
COMMENT ON COLUMN public.profiles.email IS 'Contact email (may differ from auth email)';
COMMENT ON COLUMN public.profiles.phone IS 'Work or mobile phone number';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone for proper timestamp display';
COMMENT ON COLUMN public.profiles.language IS 'Preferred UI language/locale';
