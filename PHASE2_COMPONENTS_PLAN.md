# Phase 2 UI Components Plan

## Components to Build

### 1. Team Management Components
- [x] Actions: `team-assignments.ts`, `account-associations.ts`, `protocol-versions.ts`
- [ ] **`team-assignment-dialog.tsx`**: Form dialog for assigning team members with rollup/rolldown checkboxes
- [ ] **`team-assignments-table.tsx`**: Data table showing current team assignments with edit/delete
- [ ] **`team-history-table.tsx`**: Read-only table showing team assignment history
- [ ] **`teams-tab.tsx`**: Main tab component for team management (within protocol/region/site detail pages)

### 2. Account Association Components
- [ ] **`account-association-dialog.tsx`**: Form dialog for associating organizations (IRB, CRO, lab, etc.)
- [ ] **`account-associations-table.tsx`**: Data table showing associated accounts
- [ ] **`accounts-tab.tsx`**: Main tab component for account associations

### 3. Protocol Version Components
- [ ] **`protocol-version-dialog.tsx`**: Form dialog for creating protocol versions/amendments
- [ ] **`protocol-versions-table.tsx`**: Data table showing all protocol versions
- [ ] **`versions-tab.tsx`**: Main tab component for protocol version history

### 4. Enhanced Detail Pages (New Tabs)
- [ ] Add "Teams" tab to Protocol detail page
- [ ] Add "Accounts" tab to Protocol detail page
- [ ] Add "Versions" tab to Protocol detail page
- [ ] Add "Teams" tab to Region detail page
- [ ] Add "Accounts" tab to Region detail page
- [ ] Add "Teams" tab to Site detail page
- [ ] Add "Accounts" tab to Site detail page

## Implementation Order
1. Team assignment dialog and table (most complex due to rollup/rolldown)
2. Team history table (simpler, read-only)
3. Account association dialog and table
4. Protocol version dialog and table
5. Integrate tabs into detail pages

## Design Patterns to Follow
- Follow existing form dialog patterns from Phase 1
- Use `react-hook-form` with Zod validation
- Use `text-xs` (12px) for all inputs
- Use `h-8` for input heights
- Compact spacing with `gap-2`, `gap-4`
- Include search, filters, and pagination
- Show user names/emails for team assignments
- Show organization names for account associations
