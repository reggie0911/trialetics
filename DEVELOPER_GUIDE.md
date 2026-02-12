# Clinical Trial Management System - Developer Guide

## 🛠️ Technical Architecture

This guide provides technical documentation for developers maintaining and extending the Clinical Trial Management System.

---

## 📁 Project Structure

```
trialetics/
├── app/
│   └── protected/
│       └── clinical-trials/
│           └── page.tsx                          # Main entry point
├── components/
│   ├── clinical-trials/
│   │   ├── clinical-trials-page-client.tsx       # Client wrapper with tabs
│   │   ├── programs-tab.tsx                      # Programs CRUD UI
│   │   ├── protocols-tab.tsx                     # Protocols CRUD UI
│   │   ├── regions-tab.tsx                       # Regions CRUD UI
│   │   ├── sites-tab.tsx                         # Sites CRUD UI
│   │   ├── subjects-tab.tsx                      # Subjects CRUD UI
│   │   ├── program-form-dialog.tsx               # Program form
│   │   ├── protocol-form-dialog.tsx              # Protocol form
│   │   ├── region-form-dialog.tsx                # Region form
│   │   ├── site-form-dialog.tsx                  # Site form
│   │   ├── subject-dialog.tsx                    # Subject form
│   │   ├── *-data-table.tsx                      # Data tables for each entity
│   │   ├── team-assignment-dialog.tsx            # Team management
│   │   ├── team-assignments-table.tsx
│   │   ├── team-history-table.tsx
│   │   ├── account-association-dialog.tsx        # Account management
│   │   ├── account-associations-table.tsx
│   │   ├── protocol-version-dialog.tsx           # Version control
│   │   ├── protocol-versions-table.tsx
│   │   ├── visit-template-dialog.tsx             # Visit templates
│   │   └── visit-templates-table.tsx
│   └── ui/
│       └── [shadcn components]                   # Reusable UI components
├── lib/
│   ├── actions/
│   │   ├── clinical-programs.ts                  # Programs server actions
│   │   ├── clinical-protocols.ts                 # Protocols server actions
│   │   ├── clinical-regions.ts                   # Regions server actions
│   │   ├── clinical-sites.ts                     # Sites server actions
│   │   ├── subjects.ts                           # Subjects server actions
│   │   ├── team-assignments.ts                   # Teams server actions
│   │   ├── account-associations.ts               # Accounts server actions
│   │   ├── protocol-versions.ts                  # Versions server actions
│   │   ├── visit-templates.ts                    # Templates server actions
│   │   └── clinical-trials-stats.ts              # Statistics
│   ├── types/
│   │   └── clinical-trials.ts                    # TypeScript interfaces
│   └── supabase/
│       └── client.ts                             # Supabase client
└── supabase/
    └── migrations/
        ├── 20260207121356_create_clinical_trials_phase1_core.sql
        ├── 20260207180000_create_clinical_trials_phase2_teams_accounts.sql
        ├── 20260207190000_create_clinical_trials_phase3_subjects.sql
        └── 20260207200000_create_clinical_trials_phase4_risk_assessment.sql
```

---

## 🗄️ Database Schema

### **Phase 1: Core Entities**

#### **clinical_programs**
```sql
CREATE TABLE clinical_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  program_name text NOT NULL,
  program_mechanism text,
  application_id text,
  program_status program_status DEFAULT 'planned',
  program_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_profile_id uuid REFERENCES auth.users(id),
  updated_by_profile_id uuid REFERENCES auth.users(id)
);
```

**Indexes:**
- `idx_clinical_programs_company` on `company_id`

**RLS:**
- SELECT: `company_id = auth_company_id()`
- INSERT/UPDATE/DELETE: Same, plus audit columns

---

#### **clinical_protocols**
```sql
CREATE TABLE clinical_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  program_id uuid REFERENCES clinical_programs(id),
  protocol_number text NOT NULL,
  protocol_title text NOT NULL,
  protocol_phase protocol_phase,
  protocol_design text,
  protocol_status protocol_status DEFAULT 'planned',
  regions_required boolean DEFAULT false,
  planned_sites_count integer,
  actual_sites_count integer,
  planned_subject_count integer,
  actual_subject_count integer,
  planned_start_date date,
  actual_start_date date,
  planned_end_date date,
  actual_end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_profile_id uuid,
  updated_by_profile_id uuid,
  UNIQUE(company_id, protocol_number)
);
```

**Key Fields:**
- `regions_required`: Determines if regions are mandatory
- `protocol_number`: Unique within company

**Indexes:**
- `idx_clinical_protocols_company` on `company_id`
- `idx_clinical_protocols_program` on `program_id`

---

#### **clinical_regions**
```sql
CREATE TABLE clinical_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  protocol_id uuid REFERENCES clinical_protocols(id) NOT NULL,
  region_name text NOT NULL,
  planned_sites_count integer,
  actual_sites_count integer,
  planned_subject_count integer,
  actual_subject_count integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

#### **clinical_sites**
```sql
CREATE TABLE clinical_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  protocol_id uuid REFERENCES clinical_protocols(id) NOT NULL,
  region_id uuid REFERENCES clinical_regions(id),
  organization_id uuid REFERENCES organizations(id),
  principal_investigator_id uuid REFERENCES contacts(id),
  site_number text,
  site_status site_status DEFAULT 'planned',
  irb_approval_date date,
  irb_number text,
  irb_institution text,
  planned_subject_count integer,
  enrolled_subject_count integer DEFAULT 0,
  screen_failure_count integer DEFAULT 0,
  completed_subject_count integer DEFAULT 0,
  early_terminated_count integer DEFAULT 0,
  first_subject_enrolled_date date,
  last_subject_enrolled_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Auto-Calculated Fields:**
- `enrolled_subject_count`: Updated by `subjects.ts`
- `screen_failure_count`: Updated by `subjects.ts`
- `first_subject_enrolled_date`: Updated by `subjects.ts`
- `last_subject_enrolled_date`: Updated by `subjects.ts`

---

### **Phase 2: Teams & Accounts**

#### **protocol_teams / region_teams / site_teams**
```sql
CREATE TABLE protocol_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  protocol_id uuid REFERENCES clinical_protocols(id) NOT NULL,
  profile_id uuid REFERENCES auth.users(id) NOT NULL,
  team_role team_role NOT NULL,
  is_primary_role boolean DEFAULT false,
  start_date date,
  end_date date,
  assignment_status team_assignment_status DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
```

**Team Roles ENUM:**
```typescript
export type TeamRole =
  | 'study_manager'
  | 'clinical_director'
  | 'cra'
  | 'data_manager'
  | 'medical_monitor'
  | 'regulatory_specialist'
  | 'quality_assurance'
  | 'biostatistician'
  | 'pharmacovigilance'
  | 'site_coordinator';
```

**Cascade Logic:**
- Implemented in `lib/actions/team-assignments.ts`
- `createTeamAssignment()` handles rollup/rolldown

---

#### **team_assignment_history**
```sql
CREATE TABLE team_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  entity_type entity_type NOT NULL,
  entity_id uuid NOT NULL,
  profile_id uuid REFERENCES auth.users(id) NOT NULL,
  team_role team_role NOT NULL,
  action text,
  changed_at timestamptz DEFAULT now(),
  changed_by_profile_id uuid REFERENCES auth.users(id)
);
```

**Audit Trail:**
- Records: assignment, update, removal
- Tracks who made changes and when

---

#### **protocol_accounts / region_accounts / site_accounts**
```sql
CREATE TABLE protocol_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  protocol_id uuid REFERENCES clinical_protocols(id) NOT NULL,
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  account_type account_type NOT NULL,
  is_central_account boolean DEFAULT false,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);
```

**Account Types ENUM:**
```typescript
export type AccountType =
  | 'irb' | 'central_irb'
  | 'cro' | 'regional_cro'
  | 'laboratory' | 'central_laboratory'
  | 'vendor' | 'pharmacy' | 'imaging_center';
```

---

#### **protocol_versions**
```sql
CREATE TABLE protocol_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  protocol_id uuid REFERENCES clinical_protocols(id) NOT NULL,
  version_number text NOT NULL,
  amendment_version text,
  irb_approval_date date,
  version_description text,
  is_original_protocol boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(protocol_id, version_number)
);
```

---

### **Phase 3: Subjects & Visits**

#### **subjects**
```sql
CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  site_id uuid REFERENCES clinical_sites(id) NOT NULL,
  screening_number text,
  subject_number text,
  subject_status subject_status DEFAULT 'screening',
  screening_date date,
  enrollment_date date,
  completion_date date,
  termination_date date,
  termination_reason text,
  screen_failure_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(site_id, subject_number)
);
```

**Status ENUM:**
```typescript
export type SubjectStatus =
  | 'screening'
  | 'enrolled'
  | 'completed'
  | 'terminated'
  | 'screen_failure';
```

**Auto-Update Logic:**
```typescript
// In lib/actions/subjects.ts
async function updateSiteMilestones(companyId: string, siteId: string) {
  // Query subjects for site
  // Calculate counts by status
  // Update clinical_sites table
}
```

---

#### **subject_visit_templates**
```sql
CREATE TABLE subject_visit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  protocol_id uuid REFERENCES clinical_protocols(id) NOT NULL,
  version_number text NOT NULL,
  template_name text NOT NULL,
  template_description text,
  is_active boolean DEFAULT true,
  irb_approval_date date,
  created_at timestamptz DEFAULT now()
);
```

#### **template_visits**
```sql
CREATE TABLE template_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  template_id uuid REFERENCES subject_visit_templates(id) NOT NULL,
  visit_name text NOT NULL,
  visit_type visit_type NOT NULL,
  visit_day integer,
  visit_window_before_days integer,
  visit_window_after_days integer,
  is_required boolean DEFAULT true,
  visit_description text,
  created_at timestamptz DEFAULT now()
);
```

#### **template_activities**
```sql
CREATE TABLE template_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  template_visit_id uuid REFERENCES template_visits(id) NOT NULL,
  activity_name text NOT NULL,
  activity_description text,
  is_required boolean DEFAULT true,
  sort_order integer,
  created_at timestamptz DEFAULT now()
);
```

---

### **Phase 4: Risk Assessment**

#### **risk_assessment_templates**
```sql
CREATE TABLE risk_assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  protocol_id uuid REFERENCES clinical_protocols(id),
  template_name text NOT NULL,
  template_version text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

#### **risk_assessment_questions**
```sql
CREATE TABLE risk_assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  template_id uuid REFERENCES risk_assessment_templates(id) NOT NULL,
  question_text text NOT NULL,
  risk_category risk_category NOT NULL,
  question_weight numeric(3,2) DEFAULT 1.0,
  sort_order integer,
  created_at timestamptz DEFAULT now()
);
```

#### **risk_assessment_question_values**
```sql
CREATE TABLE risk_assessment_question_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES risk_assessment_questions(id) NOT NULL,
  value_label text NOT NULL,
  impact_score integer,
  probability_score integer,
  detectability_score integer,
  sort_order integer
);
```

**Risk Score Calculation:**
```typescript
totalScore = Σ(question_weight × impact × probability × detectability)
```

---

## 🔐 Security: Row Level Security

All tables use RLS policies for multi-tenant isolation.

### **Standard Policy Pattern**

```sql
-- SELECT Policy
CREATE POLICY "Users can view their company's data"
ON clinical_programs FOR SELECT
USING (company_id = auth_company_id());

-- INSERT Policy
CREATE POLICY "Users can insert for their company"
ON clinical_programs FOR INSERT
WITH CHECK (
  company_id = auth_company_id()
  AND created_by_profile_id = auth.uid()
);

-- UPDATE Policy
CREATE POLICY "Users can update their company's data"
ON clinical_programs FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (
  company_id = auth_company_id()
  AND updated_by_profile_id = auth.uid()
);

-- DELETE Policy
CREATE POLICY "Users can delete their company's data"
ON clinical_programs FOR DELETE
USING (company_id = auth_company_id());
```

### **Helper Function**

```sql
CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;
```

---

## ⚡ Server Actions Pattern

### **Standard Action Structure**

```typescript
// lib/actions/clinical-programs.ts

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getPrograms(
  companyId: string,
  filters?: {
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<ActionResponse<{ programs: ClinicalProgram[]; total: number }>> {
  try {
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('clinical_programs')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.search) {
      query = query.ilike('program_name', `%${filters.search}%`);
    }

    // Apply pagination
    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      query = query.range(from, from + filters.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        programs: data || [],
        total: count || 0,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createProgram(
  companyId: string,
  profileId: string,
  email: string,
  data: CreateProgramData
): Promise<ActionResponse<ClinicalProgram>> {
  try {
    const supabase = await createClient();

    const { data: program, error } = await supabase
      .from('clinical_programs')
      .insert({
        ...data,
        company_id: companyId,
        created_by_profile_id: profileId,
        updated_by_profile_id: profileId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');
    return { success: true, data: program };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### **Key Patterns**

1. **Always return ActionResponse<T>**
2. **Include company_id in all queries**
3. **Set audit columns (created_by, updated_by)**
4. **Call revalidatePath() after mutations**
5. **Use try/catch for error handling**

---

## 🎨 UI Component Patterns

### **Tab Component Structure**

```typescript
// components/clinical-trials/programs-tab.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getPrograms } from '@/lib/actions/clinical-programs';

interface ProgramsTabProps {
  companyId: string;
  profileId: string;
  email: string;
  onDataChange?: () => void;
}

export function ProgramsTab({
  companyId,
  profileId,
  email,
  onDataChange,
}: ProgramsTabProps) {
  const [programs, setPrograms] = useState<ClinicalProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  // Memoize fetch function - exclude toast from dependencies
  const loadPrograms = useCallback(async () => {
    setLoading(true);
    const result = await getPrograms(companyId, {
      search,
      page,
      limit: 10,
    });

    if (result.success && result.data) {
      setPrograms(result.data.programs);
      setTotal(result.data.total);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Failed to load programs',
      });
    }
    setLoading(false);
  }, [companyId, search, page]); // Don't include toast

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  return (
    <div className="space-y-4">
      {/* Search, Add button, Data table */}
    </div>
  );
}
```

### **Form Dialog Pattern**

```typescript
// components/clinical-trials/program-form-dialog.tsx

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  program_name: z.string().min(1, 'Program name is required'),
  program_status: z.string(),
  // ... other fields
});

export function ProgramFormDialog({ ... }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      program_name: '',
      program_status: 'planned',
    },
  });

  // Reset form when program changes - exclude form from dependencies
  useEffect(() => {
    if (program) {
      form.reset({
        program_name: program.program_name,
        program_status: program.program_status,
        // ...
      });
    } else {
      form.reset();
    }
  }, [program]); // form.reset is stable

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Handle create/update
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="program_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Program Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-8 text-xs"
                      placeholder="Enter program name"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            {/* More fields */}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### **Select Component (Controlled)**

**CRITICAL:** Always use controlled Select components:

```typescript
<Select
  onValueChange={field.onChange}
  value={field.value}  // ✅ CORRECT - controlled
>
  {/* DON'T USE defaultValue={field.value} - causes errors */}
  <FormControl>
    <SelectTrigger className="h-8 text-xs">
      <SelectValue placeholder="Select status" />
    </SelectTrigger>
  </FormControl>
  <SelectContent>
    {options.map(option => (
      <SelectItem key={option.value} value={option.value}>
        {option.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: Page Looping / Re-rendering**

**Cause:** All tabs mounting simultaneously and fetching data on mount

**Solution:**
```typescript
// Lazy load tabs - only render active tab
<TabsContent value="programs" className="mt-0 h-full">
  {activeTab === 'programs' && (
    <ProgramsTab {...props} />
  )}
</TabsContent>
```

### **Issue 2: useCallback Dependencies Warning**

**Cause:** Including `toast` or `form` in dependencies causes re-renders

**Solution:**
```typescript
// Exclude toast from dependencies
const loadData = useCallback(async () => {
  // ... use toast inside
}, [companyId, search, page]); // Don't include toast

// form.reset is stable - exclude form
useEffect(() => {
  form.reset(data);
}, [data]); // Don't include form
```

### **Issue 3: Uncontrolled Select Warning**

**Cause:** Using `defaultValue` instead of `value`

**Solution:**
```typescript
// ❌ Wrong
<Select defaultValue={field.value}>

// ✅ Correct
<Select value={field.value} onValueChange={field.onChange}>
```

### **Issue 4: RLS Policy Violation**

**Cause:** Missing `company_id` in query or incorrect user context

**Solution:**
```typescript
// Always include company_id
const { data } = await supabase
  .from('clinical_programs')
  .select('*')
  .eq('company_id', companyId); // ✅ Required
```

---

## 🚀 Performance Optimization

### **Database Indexes**

All tables have indexes on:
- `company_id` (for RLS filtering)
- Foreign keys (for joins)
- Unique constraints (for duplicate prevention)

### **Query Optimization**

```typescript
// ✅ Good - Select only needed columns
.select('id, program_name, program_status')

// ❌ Bad - Select all
.select('*')

// ✅ Good - Use joins for related data
.select(`
  *,
  organization:organizations(id, name),
  pi:contacts(id, first_name, last_name)
`)
```

### **Pagination**

```typescript
const from = (page - 1) * limit;
query = query.range(from, from + limit - 1);
```

---

## 🧪 Testing Guidelines

### **Manual Testing**

See `PHASE5_TESTING_GUIDE.md` for comprehensive test cases.

### **Key Test Areas**

1. **CRUD Operations**: Create, Read, Update, Delete for all entities
2. **Relationships**: Foreign key constraints, cascade behavior
3. **RLS**: Multi-tenant isolation
4. **Validation**: Unique constraints, required fields
5. **Cascading**: Team rollup/rolldown, site milestones

---

## 📦 Deployment

### **Migration Strategy**

```bash
# Apply migrations to Supabase
npx supabase db push

# Generate TypeScript types (if needed)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.types.ts
```

### **Environment Variables**

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🔄 Future Enhancements

### **Not Yet Implemented**

1. **Detail Pages**: Protocol/Region/Site detail views with tabs
2. **Charts**: Enrollment charts, status distributions
3. **Risk Assessment UI**: Execution forms, scoring dashboard
4. **Export**: CSV/Excel export functionality
5. **Bulk Operations**: Bulk upload, bulk status updates
6. **Advanced Filtering**: Date ranges, multi-select filters
7. **Notifications**: Email alerts for milestones
8. **Reports**: Custom report builder

### **Implementation Priority**

1. Detail pages (high priority - enables team/account management)
2. Charts (medium priority - valuable insights)
3. Risk assessment UI (medium priority - Phase 4 ready)
4. Export (low priority - nice to have)

---

## 📚 Additional Resources

- **User Guide**: `USER_GUIDE.md`
- **Testing Guide**: `PHASE5_TESTING_GUIDE.md`
- **Phase Summaries**:
  - `PHASE1_FULLY_COMPLETE.md`
  - `PHASE2_COMPLETE.md`
  - `PHASE3_COMPLETE.md`
  - `PHASE4_COMPLETE.md`
- **System Status**: `SYSTEM_READY.md`

---

## 🤝 Contributing

### **Code Style**

- Use TypeScript for type safety
- Follow existing patterns for consistency
- Add JSDoc comments for complex functions
- Use Prettier for formatting

### **Naming Conventions**

- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions: `camelCase`
- Database: `snake_case`
- Types/Interfaces: `PascalCase`

---

**The CTMS is production-ready!** 🎉

For questions or support, refer to the documentation or review the codebase for established patterns.
