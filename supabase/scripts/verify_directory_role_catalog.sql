-- Manual verification: run in Supabase SQL editor (or psql) after migrations.
-- Expect: 8 categories, 97 role rows in a stock seed (no custom additions).

SELECT 'directory_role_categories' AS table_name, count(*)::int AS row_count
FROM public.directory_role_categories
UNION ALL
SELECT 'directory_roles', count(*)::int
FROM public.directory_roles;

-- Expected: 8 and 97 when seeds from 20260335 / 20260502 are present.

SELECT c.code, c.name, count(r.id) AS role_count
FROM public.directory_role_categories c
LEFT JOIN public.directory_roles r ON r.category_id = c.id
GROUP BY c.id, c.code, c.name
ORDER BY c.sort_order;
