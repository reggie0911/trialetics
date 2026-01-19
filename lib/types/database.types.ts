export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ae_column_configs: {
        Row: {
          column_id: string
          created_at: string
          id: string
          label: string
          table_order: number | null
          updated_at: string
          upload_id: string
          visible: boolean
        }
        Insert: {
          column_id: string
          created_at?: string
          id?: string
          label: string
          table_order?: number | null
          updated_at?: string
          upload_id: string
          visible?: boolean
        }
        Update: {
          column_id?: string
          created_at?: string
          id?: string
          label?: string
          table_order?: number | null
          updated_at?: string
          upload_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ae_column_configs_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "ae_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_records: {
        Row: {
          aedecod: string | null
          aeout: string | null
          aeser: string | null
          aesercat1: string | null
          created_at: string
          extra_fields: Json | null
          id: string
          site_name: string | null
          subject_id: string | null
          upload_id: string
        }
        Insert: {
          aedecod?: string | null
          aeout?: string | null
          aeser?: string | null
          aesercat1?: string | null
          created_at?: string
          extra_fields?: Json | null
          id?: string
          site_name?: string | null
          subject_id?: string | null
          upload_id: string
        }
        Update: {
          aedecod?: string | null
          aeout?: string | null
          aeser?: string | null
          aesercat1?: string | null
          created_at?: string
          extra_fields?: Json | null
          id?: string
          site_name?: string | null
          subject_id?: string | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "ae_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_uploads: {
        Row: {
          column_count: number
          company_id: string
          created_at: string
          file_name: string
          filter_preferences: Json | null
          id: string
          row_count: number
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          column_count: number
          company_id: string
          created_at?: string
          file_name: string
          filter_preferences?: Json | null
          id?: string
          row_count: number
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          column_count?: number
          company_id?: string
          created_at?: string
          file_name?: string
          filter_preferences?: Json | null
          id?: string
          row_count?: number
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      column_configs: {
        Row: {
          category: string | null
          column_id: string
          created_at: string
          data_type: string
          id: string
          label: string
          original_label: string
          table_order: number | null
          updated_at: string
          upload_id: string
          visible: boolean
          visit_group: string | null
        }
        Insert: {
          category?: string | null
          column_id: string
          created_at?: string
          data_type: string
          id?: string
          label: string
          original_label: string
          table_order?: number | null
          updated_at?: string
          upload_id: string
          visible?: boolean
          visit_group?: string | null
        }
        Update: {
          category?: string | null
          column_id?: string
          created_at?: string
          data_type?: string
          id?: string
          label?: string
          original_label?: string
          table_order?: number | null
          updated_at?: string
          upload_id?: string
          visible?: boolean
          visit_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "column_configs_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "patient_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          id: string
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_companies_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_companies_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      header_mappings: {
        Row: {
          company_id: string
          created_at: string
          customized_header: string
          id: string
          original_header: string
          table_order: number | null
          updated_at: string
          visit_group: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          customized_header: string
          id?: string
          original_header: string
          table_order?: number | null
          updated_at?: string
          visit_group?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          customized_header?: string
          id?: string
          original_header?: string
          table_order?: number | null
          updated_at?: string
          visit_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_header_mappings_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_column_configs: {
        Row: {
          column_id: string
          created_at: string
          id: string
          label: string
          table_order: number | null
          updated_at: string
          upload_id: string
          visible: boolean
          visit_group: string | null
        }
        Insert: {
          column_id: string
          created_at?: string
          id?: string
          label: string
          table_order?: number | null
          updated_at?: string
          upload_id: string
          visible?: boolean
          visit_group?: string | null
        }
        Update: {
          column_id?: string
          created_at?: string
          id?: string
          label?: string
          table_order?: number | null
          updated_at?: string
          upload_id?: string
          visible?: boolean
          visit_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mc_column_configs_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "mc_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_header_mappings: {
        Row: {
          company_id: string
          created_at: string
          customized_header: string
          id: string
          original_header: string
          table_order: number | null
          updated_at: string
          visit_group: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          customized_header: string
          id?: string
          original_header: string
          table_order?: number | null
          updated_at?: string
          visit_group?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          customized_header?: string
          id?: string
          original_header?: string
          table_order?: number | null
          updated_at?: string
          visit_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mc_header_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_records: {
        Row: {
          created_at: string
          event_name: string | null
          extra_fields: Json | null
          id: string
          medication_name: string | null
          site_name: string | null
          start_date: string | null
          stop_date: string | null
          subject_id: string | null
          upload_id: string
        }
        Insert: {
          created_at?: string
          event_name?: string | null
          extra_fields?: Json | null
          id?: string
          medication_name?: string | null
          site_name?: string | null
          start_date?: string | null
          stop_date?: string | null
          subject_id?: string | null
          upload_id: string
        }
        Update: {
          created_at?: string
          event_name?: string | null
          extra_fields?: Json | null
          id?: string
          medication_name?: string | null
          site_name?: string | null
          start_date?: string | null
          stop_date?: string | null
          subject_id?: string | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "mc_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_uploads: {
        Row: {
          column_count: number
          company_id: string
          created_at: string
          file_name: string
          filter_preferences: Json | null
          id: string
          row_count: number
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          column_count: number
          company_id: string
          created_at?: string
          file_name: string
          filter_preferences?: Json | null
          id?: string
          row_count: number
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          column_count?: number
          company_id?: string
          created_at?: string
          file_name?: string
          filter_preferences?: Json | null
          id?: string
          row_count?: number
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      modules: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_modules_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_modules_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      patient_uploads: {
        Row: {
          column_count: number
          company_id: string
          created_at: string
          file_name: string
          filter_preferences: Json | null
          id: string
          row_count: number
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          column_count: number
          company_id: string
          created_at?: string
          file_name: string
          filter_preferences?: Json | null
          id?: string
          row_count: number
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          column_count?: number
          company_id?: string
          created_at?: string
          file_name?: string
          filter_preferences?: Json | null
          id?: string
          row_count?: number
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_patient_uploads_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      patients: {
        Row: {
          adverse_events: Json | null
          age: string | null
          created_at: string
          demographics: Json | null
          extra_fields: Json | null
          id: string
          measurements: Json | null
          sex: string | null
          site_name: string | null
          subject_id: string | null
          upload_id: string
          visits: Json | null
        }
        Insert: {
          adverse_events?: Json | null
          age?: string | null
          created_at?: string
          demographics?: Json | null
          extra_fields?: Json | null
          id?: string
          measurements?: Json | null
          sex?: string | null
          site_name?: string | null
          subject_id?: string | null
          upload_id: string
          visits?: Json | null
        }
        Update: {
          adverse_events?: Json | null
          age?: string | null
          created_at?: string
          demographics?: Json | null
          extra_fields?: Json | null
          id?: string
          measurements?: Json | null
          sex?: string | null
          site_name?: string | null
          subject_id?: string | null
          upload_id?: string
          visits?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "patient_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          job_title: string | null
          language: string | null
          last_name: string | null
          phone: string | null
          role: string
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: string
          country_name: string | null
          country_region: string | null
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          id: string
          planned_end_date: string | null
          planned_sites: number | null
          planned_start_date: string | null
          planned_subjects: number | null
          protocol_description: string | null
          protocol_name: string
          protocol_number: string
          protocol_status: string
          trial_phase: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          country_name?: string | null
          country_region?: string | null
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          planned_end_date?: string | null
          planned_sites?: number | null
          planned_start_date?: string | null
          planned_subjects?: number | null
          protocol_description?: string | null
          protocol_name: string
          protocol_number: string
          protocol_status?: string
          trial_phase?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          country_name?: string | null
          country_region?: string | null
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          planned_end_date?: string | null
          planned_sites?: number | null
          planned_start_date?: string | null
          planned_subjects?: number | null
          protocol_description?: string | null
          protocol_name?: string
          protocol_number?: string
          protocol_status?: string
          trial_phase?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_projects_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "protocols_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number | null
          project_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          project_id: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          project_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "todos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modules: {
        Row: {
          created_by_id: string | null
          creator_email: string | null
          granted_at: string | null
          id: string
          module_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_by_id?: string | null
          creator_email?: string | null
          granted_at?: string | null
          id?: string
          module_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_by_id?: string | null
          creator_email?: string | null
          granted_at?: string | null
          id?: string
          module_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_modules_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_modules_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_projects: {
        Row: {
          assigned_at: string | null
          created_by_id: string | null
          creator_email: string | null
          id: string
          project_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          project_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          project_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_projects_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_projects_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_protocols_protocol_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_protocols_protocol_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_protocols_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_protocols_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      vw_column_configs: {
        Row: {
          column_id: string
          created_at: string
          id: string
          label: string
          table_order: number | null
          updated_at: string
          upload_id: string
          visible: boolean
        }
        Insert: {
          column_id: string
          created_at?: string
          id?: string
          label: string
          table_order?: number | null
          updated_at?: string
          upload_id: string
          visible?: boolean
        }
        Update: {
          column_id?: string
          created_at?: string
          id?: string
          label?: string
          table_order?: number | null
          updated_at?: string
          upload_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "vw_column_configs_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "vw_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_header_mappings: {
        Row: {
          company_id: string
          created_at: string
          customized_header: string
          id: string
          original_header: string
          table_order: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customized_header: string
          id?: string
          original_header: string
          table_order?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customized_header?: string
          id?: string
          original_header?: string
          table_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vw_header_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_records: {
        Row: {
          alert_status: string | null
          created_at: string
          death_date: string | null
          event_date: string | null
          event_name: string | null
          event_status: string | null
          extra_fields: Json | null
          id: string
          planned_date: string | null
          procedure_date: string | null
          proposed_date: string | null
          site_name: string | null
          subject_id: string | null
          upload_id: string
          window_end_date: string | null
          window_start_date: string | null
        }
        Insert: {
          alert_status?: string | null
          created_at?: string
          death_date?: string | null
          event_date?: string | null
          event_name?: string | null
          event_status?: string | null
          extra_fields?: Json | null
          id?: string
          planned_date?: string | null
          procedure_date?: string | null
          proposed_date?: string | null
          site_name?: string | null
          subject_id?: string | null
          upload_id: string
          window_end_date?: string | null
          window_start_date?: string | null
        }
        Update: {
          alert_status?: string | null
          created_at?: string
          death_date?: string | null
          event_date?: string | null
          event_name?: string | null
          event_status?: string | null
          extra_fields?: Json | null
          id?: string
          planned_date?: string | null
          procedure_date?: string | null
          proposed_date?: string | null
          site_name?: string | null
          subject_id?: string | null
          upload_id?: string
          window_end_date?: string | null
          window_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vw_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "vw_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_uploads: {
        Row: {
          column_count: number
          company_id: string
          created_at: string
          file_name: string
          filter_preferences: Json | null
          id: string
          row_count: number
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          column_count: number
          company_id: string
          created_at?: string
          file_name: string
          filter_preferences?: Json | null
          id?: string
          row_count: number
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          column_count?: number
          company_id?: string
          created_at?: string
          file_name?: string
          filter_preferences?: Json | null
          id?: string
          row_count?: number
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "vw_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vw_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vw_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Views: {
      project_assignments: {
        Row: {
          assigned_at: string | null
          company_id: string | null
          company_name: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          profile_id: string | null
          project_id: string | null
          protocol_name: string | null
          protocol_number: string | null
          protocol_status: string | null
          role: string | null
          trial_phase: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocols_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_company_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// Convenience type aliases
export type Profile = Tables<'profiles'>;
export type Company = Tables<'companies'>;
export type Project = Tables<'projects'>;
export type Module = Tables<'modules'>;

// Types with relations
export type ProfileWithCompany = Profile & {
  companies: Company | null;
};

export type UserProjectWithDetails = Tables<'user_projects'> & {
  projects: Project | null;
};

export type UserModuleWithDetails = Tables<'user_modules'> & {
  modules: Module | null;
};
