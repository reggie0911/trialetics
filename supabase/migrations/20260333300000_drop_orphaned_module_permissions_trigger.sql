-- The 20260313000000_drop_ctms migration dropped public.module_permissions but
-- left the trigger and functions that reference it on public.companies.
-- Every INSERT INTO companies (including handle_new_user) crashes silently
-- because seed_company_module_permissions tries to write to the missing table.

DROP TRIGGER IF EXISTS seed_permissions_on_company_insert ON public.companies;
DROP FUNCTION IF EXISTS public.trigger_seed_permissions_on_company_insert();
DROP FUNCTION IF EXISTS public.seed_company_module_permissions(uuid);
