-- Add is_active field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index for filtering active users
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_active IS 'Whether user is authorized for system access';
