-- Grant UPDATE on companies so admins can update company name/logo in Profile Settings
GRANT UPDATE ON public.companies TO authenticated;

-- Add RLS policy for admins to update their own company
DROP POLICY IF EXISTS "Admins can update own company" ON public.companies;

CREATE POLICY "Admins can update own company" ON public.companies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.company_id = companies.id
        AND profiles.role = 'admin'
    )
  );
