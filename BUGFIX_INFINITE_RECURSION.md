# Bug Fix: Infinite Recursion in user_protocols RLS Policies

## Issue
Users were unable to see their assigned projects on the `/protected` page. The page showed "No projects assigned yet" even after creating projects.

## Root Cause
The Row Level Security (RLS) policy on the `user_protocols` table had an **infinite recursion error**. 

### Technical Details
The SELECT policy was structured like this:
```sql
CREATE POLICY "user_protocols_select_policy" ON public.user_protocols
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_protocols.user_id  -- ❌ References user_protocols while evaluating user_protocols
      AND p.user_id = auth.uid()
    )
    ...
  );
```

The problem: When PostgreSQL tried to evaluate if a user could SELECT from `user_protocols`, it needed to check `user_protocols.user_id`. But to access `user_protocols.user_id`, it needed to evaluate the SELECT policy again, causing infinite recursion.

### Error Message
```
Failed to assign protocol to user: {
  code: '42P17',
  details: null,
  hint: null,
  message: 'infinite recursion detected in policy for relation "user_protocols"'
}
```

## Solution
Created a new migration `20260111170000_fix_infinite_recursion.sql` that simplifies the RLS policies to avoid self-referencing:

### Key Changes
1. **SELECT Policy**: Changed to use subqueries that don't reference `user_protocols` within the policy check
   ```sql
   CREATE POLICY "user_protocols_select_simple" ON public.user_protocols
     FOR SELECT
     USING (
       user_id IN (
         SELECT id FROM public.profiles WHERE user_id = auth.uid()
       )
       OR
       user_id IN (
         SELECT p2.id 
         FROM public.profiles p1
         JOIN public.profiles p2 ON p1.company_id = p2.company_id
         WHERE p1.user_id = auth.uid()
         AND p1.company_id IS NOT NULL
       )
     );
   ```

2. **INSERT Policy**: Simplified to use direct subquery checks without EXISTS that reference the table
   ```sql
   CREATE POLICY "user_protocols_insert_simple" ON public.user_protocols
     FOR INSERT
     WITH CHECK (
       user_id = (
         SELECT id FROM public.profiles WHERE user_id = auth.uid()
       )
       AND
       protocol_id IN (
         SELECT prot.id 
         FROM public.protocols prot
         JOIN public.profiles prof ON prof.company_id = prot.company_id
         WHERE prof.user_id = auth.uid()
       )
     );
   ```

## Migration Applied
- **File**: `supabase/migrations/20260111170000_fix_infinite_recursion.sql`
- **Applied**: 2026-01-11 17:00
- **Status**: ✅ Success
- **Result**: 6 RLS policies created without recursion

## Testing
After applying the migration:
1. ✅ Protocol creation should complete without errors
2. ✅ Protocols should be automatically assigned to the creator via `user_protocols`
3. ✅ The `/protected` page should display assigned projects
4. ✅ No "infinite recursion" errors in the console

## Next Steps
1. Refresh the browser at `http://localhost:3000/protected`
2. Try creating a new project
3. Verify it appears in the list immediately

## Related Files
- `lib/actions/protocols.ts` - Protocol creation and fetching logic
- `components/protected-protocols.tsx` - UI component displaying projects
- `components/create-protocol-form.tsx` - Form for creating projects
- `DATABASE_SCHEMA.md` - Complete schema documentation
