-- CTMS ClinPlus Remap: System Tables Migration
-- Creates system_countries, system_lookup_values, system_roles, configuration_variables, user_favorites

-- 1. System Countries Table
CREATE TABLE IF NOT EXISTS system_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country_code TEXT,
  phone_code TEXT,
  region TEXT, -- Africa, Asia, Europe, North America, South America, Oceania
  address_format TEXT,
  state_caption TEXT DEFAULT 'State',
  country_prefix TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, country_code)
);

ALTER TABLE system_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_countries_company_access" ON system_countries
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 2. System Lookup Values Table
CREATE TABLE IF NOT EXISTS system_lookup_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lookup_type TEXT NOT NULL, -- 'protocol_phase', 'project_stage', 'therapeutic_group', 'test_article', 'site_group', 'discontinuation_reason', 'screen_failure_reason', 'deviation_type'
  lookup_key TEXT NOT NULL,
  lookup_value TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, lookup_type, lookup_key)
);

ALTER TABLE system_lookup_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_lookup_values_company_access" ON system_lookup_values
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 3. System Roles Table
CREATE TABLE IF NOT EXISTS system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  role_type TEXT NOT NULL DEFAULT 'project', -- 'project', 'site', 'cro', 'sponsor', 'other'
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, role_name, role_type)
);

ALTER TABLE system_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_roles_company_access" ON system_roles
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 4. Configuration Variables Table
CREATE TABLE IF NOT EXISTS configuration_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL, -- 'application', 'site', 'enrollment', 'finance', 'security', 'global_contacts', 'protocol_deviation', 'data_import'
  variable_name TEXT NOT NULL,
  variable_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, group_name, variable_name)
);

ALTER TABLE configuration_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "configuration_variables_company_access" ON configuration_variables
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 5. User Favorites Table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'project', 'country', 'site', 'subject', 'contact', 'institution'
  entity_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  display_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_favorites_own_access" ON user_favorites
  FOR ALL USING (user_id = auth.uid());

-- 6. Subject Consents Table
CREATE TABLE IF NOT EXISTS subject_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL DEFAULT 'main', -- 'main', 'reconsent', 'amendment', 'optional'
  consent_date DATE,
  version TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'signed', 'withdrawn'
  withdrawn_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subject_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subject_consents_company_access" ON subject_consents
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 7. Subject Attachments Table
CREATE TABLE IF NOT EXISTS subject_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subject_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subject_attachments_company_access" ON subject_attachments
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 8. Budget Mappings Table
CREATE TABLE IF NOT EXISTS budget_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES clinical_protocols(id) ON DELETE CASCADE,
  region_id UUID REFERENCES clinical_regions(id) ON DELETE SET NULL,
  budget_template_id UUID REFERENCES budget_templates(id) ON DELETE SET NULL,
  effective_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, protocol_id, region_id, budget_template_id)
);

ALTER TABLE budget_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_mappings_company_access" ON budget_mappings
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 9. Project Event Types Table (before site_events so FK works)
CREATE TABLE IF NOT EXISTS project_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_group TEXT NOT NULL DEFAULT 'site', -- 'site', 'project', 'country'
  event_name TEXT NOT NULL,
  description TEXT,
  is_milestone BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, event_group, event_name)
);

ALTER TABLE project_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_event_types_company_access" ON project_event_types
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 10. Site Exclusions Table
CREATE TABLE IF NOT EXISTS site_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES clinical_sites(id) ON DELETE CASCADE,
  exclusion_type TEXT NOT NULL, -- 'visit', 'event', 'procedure'
  exclusion_name TEXT NOT NULL,
  reason TEXT,
  excluded_by UUID REFERENCES auth.users(id),
  excluded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_exclusions_company_access" ON site_exclusions
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 10a. Site Events Table
CREATE TABLE IF NOT EXISTS site_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES clinical_sites(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES clinical_protocols(id) ON DELETE CASCADE,
  event_type_id UUID REFERENCES project_event_types(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  baseline_date DATE,
  target_date DATE,
  target_src TEXT, -- 'manual', 'system', 'import'
  target_comment TEXT,
  completed_date DATE,
  completed_src TEXT,
  completed_comment TEXT,
  sort_order INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_events_company_access" ON site_events
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- (project_event_types already created above as table #9)
