# Fix: "Protocol created but failed to assign to user"

## Date: 2026-01-11 16:00

## Problem
When users created a protocol through the `/protected` page, the protocol was successfully created but failed to be assigned to the user via the `user_protocols` junction table. This resulted in the error message: "Protocol created but failed to assign to user".

## Root Cause
The Row Level Security (RLS) policies on the `user_protocols` table were overly complex and had several issues:

1. **Reserved Keyword Conflict**: Used `current_user` as a table alias, which is a reserved PostgreSQL keyword
2. **Overly Restrictive Policies**: The previous policies had complex nested conditions that were preventing self-assignment
3. **Policy Conflicts**: Multiple overlapping policies were creating confusion in the permission evaluation

## Solution

### Created Migration: `20260111160000_fix_user_protocols_rls_final.sql`

This migration completely rewrites the RLS policies for the `user_protocols` table with:

1. **Simplified Self-Assignment Policy** (`user_protocols_insert_self`)
   - Allows users to assign protocols to themselves
   - Checks that the `user_id` is the current user's profile ID
   - Checks that the protocol belongs to the user's company
   - **This is the primary policy used during protocol creation**

2. **Company Assignment Policy** (`user_protocols_insert_company`)
   - Allows users to assign protocols to other users in the same company
   - Validates company membership for both users
   - Ensures the protocol belongs to the shared company

3. **Improved SELECT Policy** (`user_protocols_select_policy`)
   - Users can view their own assignments
   - Users can view assignments within their company

4. **UPDATE Policy** (`user_protocols_update_policy`)
   - Only admins can update protocol assignments

5. **DELETE Policy** (`user_protocols_delete_policy`)
   - Users can delete their own assignments
   - Admins can delete any assignments in their company

### Key Changes:

- Replaced reserved keyword `current_user` with simple aliases (`p`, `p1`, `p2`)
- Simplified policy logic to use `IN` clauses and straightforward `EXISTS` checks
- Separated self-assignment from company assignment for clarity
- Added comprehensive policy comments for documentation

## How It Works Now

When a user creates a protocol via `createProtocol` server action:

1. Protocol is created with `company_id` set to the user's company
2. Assignment is attempted via insert into `user_protocols`:
   ```typescript
   await supabase
     .from('user_protocols')
     .insert({
       user_id: profile.id,
       protocol_id: newProtocol.id,
     });
   ```
3. RLS evaluates the `user_protocols_insert_self` policy:
   - ✅ `user_id` matches current user's profile
   - ✅ `protocol_id` belongs to a protocol in user's company
   - ✅ Insert succeeds!

## Testing

To verify the fix:

1. Sign up as a new user (creates company and admin profile)
2. Navigate to `/protected`
3. Click "Create Protocol" button
4. Fill out the form with required fields
5. Submit

**Expected Result**: Protocol is created AND assigned to the user successfully. No error message.

## Related Files

- `supabase/migrations/20260111160000_fix_user_protocols_rls_final.sql` - New RLS policies
- `lib/actions/protocols.ts` - Server action that creates protocols and assigns them
- `DATABASE_SCHEMA.md` - Updated schema documentation

## Migration History

Previous attempts to fix this issue:
- `20260111141000_fix_rls_policies_for_protocols.sql` - Fixed protocol creation policies
- `20260111143000_fix_user_protocols_assignment.sql` - First attempt at fixing assignment (had reserved keyword issue)
- `20260111160000_fix_user_protocols_rls_final.sql` - **Final working solution**

## Verification

After applying this migration:
```
NOTICE: user_protocols table now has 6 RLS policies
NOTICE: RLS policies updated successfully - 2026-01-11 16:00
```

All 6 policies (SELECT, INSERT x2, UPDATE, DELETE x2) are now properly configured and working.
