// Database type definitions for Supabase schema

export type UserRole = 'admin' | 'user';

export type ProjectStatus = 'planning' | 'approved' | 'closed';

export type TrialPhase = 
  | 'Phase I'
  | 'Phase II'
  | 'Phase III'
  | 'Phase IV'
  | 'Pilot Stage'
  | 'Pivotal'
  | 'Post Market'
  | 'Early Feasibility Study'
  | 'First In-Human';

export interface Profile {
  id: string;
  user_id: string;
  company_id: string | null;
  first_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  company_id: string;
  name: string;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  protocol_number: string;
  protocol_name: string;
  protocol_description: string | null;
  country_name: string | null;
  country_region: string | null;
  protocol_status: ProjectStatus;
  planned_sites: number | null;
  planned_subjects: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  trial_phase: TrialPhase | null;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
}

export interface UserProject {
  id: string;
  user_id: string;
  project_id: string;
  assigned_at: string;
  updated_at: string;
}

export interface UserModule {
  id: string;
  user_id: string;
  module_id: string;
  granted_at: string;
}

// Extended types with relations
export interface ProfileWithCompany extends Profile {
  companies: Company | null;
}

export interface UserProjectWithDetails extends UserProject {
  projects: Project;
}

export interface UserModuleWithDetails extends UserModule {
  modules: Module;
}

export interface ProjectWithAssignments extends Project {
  user_projects: UserProject[];
}

// New: Project assignment view type
export interface ProjectAssignment {
  project_id: string;
  protocol_number: string;
  protocol_name: string;
  protocol_status: ProjectStatus;
  trial_phase: TrialPhase | null;
  company_id: string;
  company_name: string;
  profile_id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  assigned_at: string;
}
