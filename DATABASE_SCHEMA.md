# Trialetics Database Schema Documentation

## Overview
This document describes the complete database schema for the Trialetics clinical trial management system.

Last Updated: 2026-01-11 19:00

---

## Tables

### 1. **companies**
Organizations that own projects and have multiple users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| company_id | TEXT | UNIQUE NOT NULL | Human-readable company identifier |
| name | TEXT | NOT NULL | Company name |
| settings | JSONB | DEFAULT '{}' | Company-specific settings |
| created_by_id | UUID | NULL | FK to profiles, SET NULL on delete |
| creator_email | TEXT | NULL | Email of creator for easier queries |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_companies_company_id` on `company_id`
- `idx_companies_created_by` on `created_by_id`

**Relationships:**
- ONE company → MANY profiles
- ONE company → MANY projects

---

### 2. **profiles**
User profiles linked to auth.users with company membership and role.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| user_id | UUID | UNIQUE NOT NULL | FK to auth.users, CASCADE DELETE |
| company_id | UUID | NULL | FK to companies, SET NULL on delete |
| email | TEXT | NULL | Denormalized from auth.users |
| first_name | TEXT | NULL | User's first name |
| last_name | TEXT | NULL | User's last name |
| avatar_url | TEXT | NULL | Profile picture URL |
| role | TEXT | NOT NULL, DEFAULT 'user' | 'admin' or 'user' |
| created_by_id | UUID | NULL | FK to profiles, SET NULL on delete |
| creator_email | TEXT | NULL | Email of creator for easier queries |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_profiles_user_id` on `user_id`
- `idx_profiles_company_id` on `company_id`
- `idx_profiles_email` on `email`
- `idx_profiles_role` on `role`
- `idx_profiles_created_by` on `created_by_id`

**Constraints:**
- CHECK: `role IN ('admin', 'user')`

**Relationships:**
- MANY profiles → ONE company
- ONE profile → ONE auth.user
- ONE profile → MANY user_projects
- ONE profile → MANY user_modules

---

### 3. **protocols**
Clinical trial protocols owned by companies.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| company_id | UUID | NOT NULL | FK to companies, CASCADE DELETE |
| protocol_number | TEXT | NOT NULL | Protocol identifier |
| protocol_name | TEXT | NOT NULL | Protocol display name |
| protocol_description | TEXT | NULL | Detailed description |
| country_name | TEXT | NULL | Country where trial is conducted |
| country_region | TEXT | NULL | Region within country |
| protocol_status | TEXT | NOT NULL, DEFAULT 'planning' | Current status |
| planned_sites | INTEGER | NULL, CHECK >= 0 | Number of planned sites |
| planned_subjects | INTEGER | NULL, CHECK >= 0 | Number of planned subjects |
| planned_start_date | DATE | NULL | Trial start date |
| planned_end_date | DATE | NULL | Trial end date |
| trial_phase | TEXT | NULL | Clinical trial phase |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_protocols_company_id` on `company_id`
- `idx_protocols_status` on `protocol_status`
- `idx_protocols_trial_phase` on `trial_phase`
- `idx_protocols_created_at` on `created_at DESC`

**Constraints:**
- CHECK: `protocol_status IN ('planning', 'approved', 'closed')`
- CHECK: `trial_phase IN ('Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Pilot Stage', 'Pivotal', 'Post Market', 'Early Feasibility Study', 'First In-Human')`
- CHECK: `planned_end_date >= planned_start_date` (or NULL)
- UNIQUE: `(company_id, protocol_number)` - unique protocol numbers per company

**Relationships:**
- MANY protocols → ONE company
- ONE protocol → MANY user_protocols

---

### 4. **modules**
System modules/features that can be granted to users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| name | TEXT | UNIQUE NOT NULL | Module identifier |
| description | TEXT | NULL | Module description |
| active | BOOLEAN | DEFAULT true | Whether module is active |
| created_by_id | UUID | NULL | FK to profiles, SET NULL on delete |
| creator_email | TEXT | NULL | Email of creator for easier queries |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_modules_created_by` on `created_by_id`

**Relationships:**
- ONE module → MANY user_modules

**Default Modules:**
- `patient_management` - Manage patient enrollment, demographics, and visit schedules
- `data_entry` - Enter and validate clinical trial data from case report forms
- `study_monitoring` - Monitor study progress, milestones, and compliance
- `reporting_analytics` - Generate reports and analyze trial data
- `document_management` - Manage protocol documents, consent forms, and regulatory files
- `adverse_event_tracking` - Track and report adverse events and serious adverse events
- `regulatory_submissions` - Manage regulatory submissions and correspondence

---

### 5. **user_projects** (Junction Table)
Assigns users to projects (formerly user_protocols).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| user_id | UUID | NOT NULL | FK to profiles, CASCADE DELETE |
| project_id | UUID | NOT NULL | FK to projects, CASCADE DELETE |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | Assignment timestamp |
| created_by_id | UUID | NULL | FK to profiles, SET NULL on delete |
| creator_email | TEXT | NULL | Email of creator for easier queries |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_user_projects_user_id` on `user_id`
- `idx_user_projects_project_id` on `project_id`
- `idx_user_projects_assigned_at` on `assigned_at DESC`
- `idx_user_projects_created_by` on `created_by_id`

**Constraints:**
- UNIQUE: `(user_id, project_id)` - no duplicate assignments

**Relationships:**
- MANY user_projects → ONE profile
- MANY user_projects → ONE project

**Note:** Table renamed from `user_protocols` to `user_projects`. Column `protocol_id` renamed to `project_id`.

---

### 6. **user_modules** (Junction Table)
Grants module access to users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| user_id | UUID | NOT NULL | FK to profiles, CASCADE DELETE |
| module_id | UUID | NOT NULL | FK to modules, CASCADE DELETE |
| granted_at | TIMESTAMPTZ | DEFAULT NOW() | Grant timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_user_modules_user_id` on `user_id`
- `idx_user_modules_module_id` on `module_id`

**Constraints:**
- UNIQUE: `(user_id, module_id)` - no duplicate module grants

**Relationships:**
- MANY user_modules → ONE profile
- MANY user_modules → ONE module

---

## Views

### **project_assignments**
Convenient view showing all project assignments with user and company details (formerly protocol_assignments).

**Columns:**
- project_id, protocol_number, protocol_name, protocol_status, trial_phase
- company_id, company_name
- profile_id, user_id, email, first_name, last_name, role
- assigned_at

**Usage:**
```sql
SELECT * FROM public.project_assignments
WHERE company_id = 'your-company-id'
ORDER BY assigned_at DESC;
```

**Note:** View renamed from `protocol_assignments` to `project_assignments`. Column `protocol_id` renamed to `project_id`.

---

## Functions

### **generate_company_id()**
Generates unique 12-digit company IDs.

**Returns:** TEXT (12-digit zero-padded number)

---

### **update_updated_at_column()**
Trigger function that automatically updates the `updated_at` timestamp.

**Applies to:** companies, profiles, protocols, user_protocols, user_modules

---

### **handle_new_user()**
Trigger function that runs when a new user signs up.

**Actions:**
1. Creates a new company with name "{email} Organization"
2. Creates a profile record linked to auth.users
3. Sets user role to 'admin'
4. Sets profile email from auth.users.email

**Trigger:** `on_auth_user_created` (AFTER INSERT on auth.users)

---

## Row Level Security (RLS)

All tables have RLS enabled. Key policies:

### Profiles
- Users can view their own profile
- Admins can view profiles in their company
- Users can update their own profile (limited fields)
- Profile creation allowed on signup

### Companies
- Users can view their own company
- Admins can update their company
- Company creation allowed (for triggers)

### Projects
- **Admin users** can view ALL projects in their company (company-wide visibility)
- **Regular users** can view only projects explicitly assigned to them
- Authenticated users can create projects for their company
- Company users can update their company's projects
- Admins can delete projects

### User Projects
- **SELECT**: Users can view their own assignments and assignments within their company (non-recursive)
- **INSERT (Self)**: Users can assign company projects to themselves (primary policy for project creation)
- **INSERT (Others)**: Users can assign company projects to other users in their company
- **UPDATE**: Only admins can update project assignments
- **DELETE**: Users can delete their own assignments; admins can delete any company assignments

**Note**: RLS policies use non-recursive subqueries to avoid infinite recursion errors (fixed in migration `20260111170000`)

### User Modules
- Users can view their own module access
- Users can view module access in their company
- Admins can grant/revoke module access

### Modules
- All authenticated users can view active modules

---

## Entity Relationship Diagram

```
auth.users (Supabase Auth)
    ↓ (1:1)
profiles
    ↓ (M:1)
companies
    ↓ (1:M)
projects
    ↓ (M:N via user_projects)
profiles

profiles
    ↓ (M:N via user_modules)
modules
```

**Key Relationships:**
1. Each **auth.user** has exactly ONE **profile**
2. Each **profile** belongs to ONE **company** (optional, but created on signup)
3. Each **company** owns MANY **projects**
4. **Profiles** and **projects** have M:N relationship via **user_projects**
5. **Profiles** and **modules** have M:N relationship via **user_modules**

**Creator Tracking:**
- All tables include `created_by_id` (UUID FK to profiles) and `creator_email` (TEXT) for audit trails

---

## Data Flow

### User Signup
1. User creates account → `auth.users` record created
2. `on_auth_user_created` trigger fires
3. New company created automatically
4. Profile created, linked to auth.user and company
5. User role set to 'admin'

### Project Creation
1. Admin user creates project
2. Project belongs to user's company
3. Project automatically assigned to creator via `user_projects`
4. Creator tracking fields (`created_by_id`, `creator_email`) populated automatically
5. Other company members can be assigned

### Module Access
1. Admins grant module access to users
2. Record created in `user_modules`
3. Users can only access granted modules

---

## Important Notes

1. **Foreign Key Cascades:**
   - Deleting a user cascades to profile deletion
   - Deleting a company cascades to protocol deletion
   - Deleting a profile or protocol cascades to junction table records

2. **Denormalization:**
   - `profiles.email` is denormalized from `auth.users.email` for easier queries

3. **Unique Constraints:**
   - Protocol numbers must be unique per company
   - User-protocol assignments are unique
   - User-module grants are unique

4. **Default Values:**
   - New users default to 'admin' role (changed by trigger)
   - Protocols default to 'planning' status
   - All UUIDs auto-generated

---

## Migration History

See `supabase/migrations/` for complete migration history.

Key migrations:
- `20260111100000` - Initial schema creation
- `20260111131000` - Added missing columns to profiles
- `20260111140000` - Fixed trigger and permissions
- `20260111141000` - Fixed RLS policies for protocols
- `20260111143000` - Fixed user_protocols assignment
- `20260111150000` - Comprehensive schema review
- `20260111160000` - Attempted fix for user_protocols RLS
- `20260111170000` - Fixed infinite recursion in user_protocols RLS policies
- `20260111180000` - **Renamed tables (protocols→projects, user_protocols→user_projects) and added creator tracking to all tables** ✅
- `20260111190000` - **Enabled company-wide project visibility for admin users** ✅

---

Last Updated: 2026-01-11 19:00
