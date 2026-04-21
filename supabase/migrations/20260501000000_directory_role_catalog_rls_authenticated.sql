-- Global directory role catalog is not company-scoped; allow any authenticated user to read.
-- Previous policies required profiles.company_id IS NOT NULL, which returned zero rows (no error)
-- for users without a company — empty role dropdowns in QuickContactFormFields / Directory.

DROP POLICY IF EXISTS "directory_role_categories_select" ON public.directory_role_categories;
DROP POLICY IF EXISTS "directory_roles_select" ON public.directory_roles;

CREATE POLICY "directory_role_categories_select"
  ON public.directory_role_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "directory_roles_select"
  ON public.directory_roles
  FOR SELECT
  TO authenticated
  USING (true);
