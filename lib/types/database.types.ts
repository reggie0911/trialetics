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
      ae_header_mappings: {
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
            foreignKeyName: "ae_header_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          protocol_id: string | null
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
          protocol_id?: string | null
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
          protocol_id?: string | null
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
        ]
      }
      ai_agent_overrides: {
        Row: {
          agent_id: string
          company_id: string | null
          created_at: string
          id: string
          persona: string | null
          task_instructions: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          persona?: string | null
          task_instructions?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          persona?: string | null
          task_instructions?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          agent_id: string | null
          company_id: string | null
          created_at: string
          id: string
          messages: Json
          page_context: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          page_context?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          page_context?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          budget_id: string
          category: string
          created_at: string
          description: string
          id: string
          notes: string | null
          quantity: number
          sort_order: number
          total_cost: number | null
          unit_cost: number
        }
        Insert: {
          budget_id: string
          category: string
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          total_cost?: number | null
          unit_cost?: number
        }
        Update: {
          budget_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          total_cost?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "study_budgets"
            referencedColumns: ["id"]
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
      committee_members: {
        Row: {
          committee_id: string
          created_at: string
          directory_contact_id: string
          directory_role_id: string | null
          end_date: string | null
          id: string
          is_active: boolean
          start_date: string | null
        }
        Insert: {
          committee_id: string
          created_at?: string
          directory_contact_id: string
          directory_role_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
        }
        Update: {
          committee_id?: string
          created_at?: string
          directory_contact_id?: string
          directory_role_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_members_directory_contact_id_fkey"
            columns: ["directory_contact_id"]
            isOneToOne: false
            referencedRelation: "directory_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_members_directory_role_id_fkey"
            columns: ["directory_role_id"]
            isOneToOne: false
            referencedRelation: "directory_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          committee_type: string
          company_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          study_id: string | null
          updated_at: string
        }
        Insert: {
          committee_type: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          study_id?: string | null
          updated_at?: string
        }
        Update: {
          committee_type?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          study_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "committees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          enabled_study_tracker_keys: string[]
          has_ctms_access: boolean
          has_eisf_access: boolean
          has_etmf_access: boolean
          has_tracker_access: boolean
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          enabled_study_tracker_keys?: string[]
          has_ctms_access?: boolean
          has_eisf_access?: boolean
          has_etmf_access?: boolean
          has_tracker_access?: boolean
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          enabled_study_tracker_keys?: string[]
          has_ctms_access?: boolean
          has_eisf_access?: boolean
          has_etmf_access?: boolean
          has_tracker_access?: boolean
          id?: string
          logo_url?: string | null
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
        ]
      }
      company_join_links: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          max_uses: number | null
          role: string
          study_id: string | null
          study_role: string | null
          token: string
          use_count: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          role?: string
          study_id?: string | null
          study_role?: string | null
          token?: string
          use_count?: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          role?: string
          study_id?: string | null
          study_role?: string | null
          token?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_join_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_join_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_join_links_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_module_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          company_id: string
          id: string
          new_values: Json
          old_values: Json
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          company_id: string
          id?: string
          new_values?: Json
          old_values?: Json
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          company_id?: string
          id?: string
          new_values?: Json
          old_values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_module_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_module_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_time_expense_settings: {
        Row: {
          company_id: string
          created_at: string
          daily_regular_hours: number
          overtime_multiplier: number | null
          updated_at: string
          weekly_regular_hours: number
        }
        Insert: {
          company_id: string
          created_at?: string
          daily_regular_hours?: number
          overtime_multiplier?: number | null
          updated_at?: string
          weekly_regular_hours?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          daily_regular_hours?: number
          overtime_multiplier?: number | null
          updated_at?: string
          weekly_regular_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_time_expense_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          company_id: string
          created_at: string
          entity_id: string
          field_id: string
          id: string
          tracker_definition_id: string
          updated_at: string
          value_boolean: boolean | null
          value_date: string | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_id: string
          field_id: string
          id?: string
          tracker_definition_id: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_id?: string
          field_id?: string
          id?: string
          tracker_definition_id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_tracker_definition_id_fkey"
            columns: ["tracker_definition_id"]
            isOneToOne: false
            referencedRelation: "custom_tracker_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          company_id: string
          created_at: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          options: Json | null
          required: boolean
          sort_order: number
          tracker_definition_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          field_label: string
          field_name: string
          field_type: string
          id?: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          tracker_definition_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          tracker_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_fields_tracker_definition_id_fkey"
            columns: ["tracker_definition_id"]
            isOneToOne: false
            referencedRelation: "custom_tracker_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tracker_definitions: {
        Row: {
          active: boolean
          columns: Json
          company_id: string
          created_at: string
          created_by_id: string | null
          description: string | null
          entity_type: string | null
          icon: string | null
          id: string
          name: string
          platform_access_enabled: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          columns?: Json
          company_id: string
          created_at?: string
          created_by_id?: string | null
          description?: string | null
          entity_type?: string | null
          icon?: string | null
          id?: string
          name: string
          platform_access_enabled?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          columns?: Json
          company_id?: string
          created_at?: string
          created_by_id?: string | null
          description?: string | null
          entity_type?: string | null
          icon?: string | null
          id?: string
          name?: string
          platform_access_enabled?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_tracker_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_tracker_definitions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_assignment_history: {
        Row: {
          action: string
          assignment_type: string
          changed_at: string
          changed_by: string | null
          company_id: string
          id: string
          junction_id: string
          snapshot: Json
        }
        Insert: {
          action: string
          assignment_type: string
          changed_at?: string
          changed_by?: string | null
          company_id: string
          id?: string
          junction_id: string
          snapshot?: Json
        }
        Update: {
          action?: string
          assignment_type?: string
          changed_at?: string
          changed_by?: string | null
          company_id?: string
          id?: string
          junction_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "directory_assignment_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_assignment_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          company_id: string
          entity_id: string
          entity_type: string
          id: string
          new_payload: Json
          old_payload: Json
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          company_id: string
          entity_id: string
          entity_type: string
          id?: string
          new_payload?: Json
          old_payload?: Json
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          company_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_payload?: Json
          old_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "directory_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_contact_institution: {
        Row: {
          created_at: string
          directory_contact_id: string
          id: string
          institution_id: string
          is_primary: boolean
        }
        Insert: {
          created_at?: string
          directory_contact_id: string
          id?: string
          institution_id: string
          is_primary?: boolean
        }
        Update: {
          created_at?: string
          directory_contact_id?: string
          id?: string
          institution_id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "directory_contact_institution_directory_contact_id_fkey"
            columns: ["directory_contact_id"]
            isOneToOne: false
            referencedRelation: "directory_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contact_institution_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_contact_secondary_roles: {
        Row: {
          directory_contact_id: string
          directory_role_id: string
        }
        Insert: {
          directory_contact_id: string
          directory_role_id: string
        }
        Update: {
          directory_contact_id?: string
          directory_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_contact_secondary_roles_directory_contact_id_fkey"
            columns: ["directory_contact_id"]
            isOneToOne: false
            referencedRelation: "directory_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contact_secondary_roles_directory_role_id_fkey"
            columns: ["directory_role_id"]
            isOneToOne: false
            referencedRelation: "directory_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_contact_study: {
        Row: {
          created_at: string
          directory_contact_id: string
          directory_role_id: string | null
          end_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          start_date: string | null
          study_id: string
        }
        Insert: {
          created_at?: string
          directory_contact_id: string
          directory_role_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          start_date?: string | null
          study_id: string
        }
        Update: {
          created_at?: string
          directory_contact_id?: string
          directory_role_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          start_date?: string | null
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_contact_study_directory_contact_id_fkey"
            columns: ["directory_contact_id"]
            isOneToOne: false
            referencedRelation: "directory_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contact_study_directory_role_id_fkey"
            columns: ["directory_role_id"]
            isOneToOne: false
            referencedRelation: "directory_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contact_study_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_contact_study_site: {
        Row: {
          created_at: string
          directory_contact_id: string
          directory_role_id: string | null
          end_date: string | null
          id: string
          is_active: boolean
          start_date: string | null
          study_site_id: string
        }
        Insert: {
          created_at?: string
          directory_contact_id: string
          directory_role_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          study_site_id: string
        }
        Update: {
          created_at?: string
          directory_contact_id?: string
          directory_role_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          study_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_contact_study_site_directory_contact_id_fkey"
            columns: ["directory_contact_id"]
            isOneToOne: false
            referencedRelation: "directory_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contact_study_site_directory_role_id_fkey"
            columns: ["directory_role_id"]
            isOneToOne: false
            referencedRelation: "directory_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contact_study_site_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_contacts: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          company_id: string
          country_code: string | null
          created_at: string
          department: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          primary_directory_role_id: string | null
          primary_institution_id: string | null
          profile_id: string | null
          region: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          company_id: string
          country_code?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          primary_directory_role_id?: string | null
          primary_institution_id?: string | null
          profile_id?: string | null
          region?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          company_id?: string
          country_code?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          primary_directory_role_id?: string | null
          primary_institution_id?: string | null
          profile_id?: string | null
          region?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contacts_primary_directory_role_id_fkey"
            columns: ["primary_directory_role_id"]
            isOneToOne: false
            referencedRelation: "directory_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contacts_primary_institution_id_fkey"
            columns: ["primary_institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_role_categories: {
        Row: {
          code: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      directory_roles: {
        Row: {
          category_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "directory_roles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "directory_role_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_feedback: {
        Row: {
          comment: string | null
          company_id: string
          created_at: string
          doc_slug: string
          id: string
          is_helpful: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          company_id: string
          created_at?: string
          doc_slug: string
          id?: string
          is_helpful: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          company_id?: string
          created_at?: string
          doc_slug?: string
          id?: string
          is_helpful?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ecrf_column_configs: {
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
            foreignKeyName: "ecrf_column_configs_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "ecrf_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      ecrf_header_mappings: {
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
            foreignKeyName: "ecrf_header_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ecrf_records: {
        Row: {
          created_at: string
          date_time: string | null
          event_date: string | null
          event_name: string | null
          extra_fields: Json | null
          form_name: string | null
          id: string
          query_raised_by_role: string | null
          query_resolution: string | null
          query_state: string | null
          query_text: string | null
          query_type: string | null
          site_name: string | null
          subject_id: string | null
          upload_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string
          date_time?: string | null
          event_date?: string | null
          event_name?: string | null
          extra_fields?: Json | null
          form_name?: string | null
          id?: string
          query_raised_by_role?: string | null
          query_resolution?: string | null
          query_state?: string | null
          query_text?: string | null
          query_type?: string | null
          site_name?: string | null
          subject_id?: string | null
          upload_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string
          date_time?: string | null
          event_date?: string | null
          event_name?: string | null
          extra_fields?: Json | null
          form_name?: string | null
          id?: string
          query_raised_by_role?: string | null
          query_resolution?: string | null
          query_state?: string | null
          query_text?: string | null
          query_type?: string | null
          site_name?: string | null
          subject_id?: string | null
          upload_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecrf_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "ecrf_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      ecrf_uploads: {
        Row: {
          column_count: number
          company_id: string
          created_at: string
          file_name: string
          filter_preferences: Json | null
          id: string
          protocol_id: string | null
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
          protocol_id?: string | null
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
          protocol_id?: string | null
          row_count?: number
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecrf_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecrf_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_approval_decisions: {
        Row: {
          comment: string | null
          created_at: string
          decision: string
          id: string
          profile_id: string
          report_id: string
          step_index: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decision: string
          id?: string
          profile_id: string
          report_id: string
          step_index: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          decision?: string
          id?: string
          profile_id?: string
          report_id?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_approval_decisions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_approval_decisions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_lines: {
        Row: {
          ai_suggestions: Json | null
          amount: number
          category_id: string
          created_at: string
          currency: string
          description: string | null
          expense_date: string
          id: string
          merchant: string | null
          report_id: string
          site_id: string | null
          study_id: string
          updated_at: string
        }
        Insert: {
          ai_suggestions?: Json | null
          amount: number
          category_id: string
          created_at?: string
          currency?: string
          description?: string | null
          expense_date: string
          id?: string
          merchant?: string | null
          report_id: string
          site_id?: string | null
          study_id: string
          updated_at?: string
        }
        Update: {
          ai_suggestions?: Json | null
          amount?: number
          category_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          merchant?: string | null
          report_id?: string
          site_id?: string | null
          study_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_lines_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_lines_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_lines_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_receipt_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          line_id: string
          mime_type: string | null
          storage_object_path: string
          uploaded_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          line_id: string
          mime_type?: string | null
          storage_object_path: string
          uploaded_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          line_id?: string
          mime_type?: string | null
          storage_object_path?: string
          uploaded_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_receipt_files_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "expense_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_receipt_files_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reports: {
        Row: {
          approval_step: number
          approved_snapshot: Json | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          profile_id: string
          status: string
          study_id: string
          submitted_at: string | null
          template_id: string | null
          title: string
          total_amount: number | null
          updated_at: string
          version: number
        }
        Insert: {
          approval_step?: number
          approved_snapshot?: Json | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          profile_id: string
          status?: string
          study_id: string
          submitted_at?: string | null
          template_id?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          approval_step?: number
          approved_snapshot?: Json | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          status?: string
          study_id?: string
          submitted_at?: string | null
          template_id?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "time_expense_approval_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_approval_templates: {
        Row: {
          company_id: string
          created_at: string
          escalation_threshold_cents: number
          id: string
          is_default: boolean
          name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          escalation_threshold_cents?: number
          id?: string
          is_default?: boolean
          name?: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          escalation_threshold_cents?: number
          id?: string
          is_default?: boolean
          name?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_approval_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_budget_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          site_budget_line_item_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          site_budget_line_item_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          site_budget_line_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_budget_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_budget_allocations_site_budget_line_item_id_fkey"
            columns: ["site_budget_line_item_id"]
            isOneToOne: false
            referencedRelation: "site_budget_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoice_decisions: {
        Row: {
          comment: string | null
          created_at: string
          decision: string
          id: string
          invoice_id: string
          profile_id: string
          step_index: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decision: string
          id?: string
          invoice_id: string
          profile_id: string
          step_index: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          decision?: string
          id?: string
          invoice_id?: string
          profile_id?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoice_decisions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoice_decisions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoices: {
        Row: {
          amount: number
          approval_step: number
          company_id: string
          created_at: string
          created_by_profile_id: string | null
          currency: string
          document_path: string | null
          due_at: string | null
          entity_type: string
          extracted_at: string | null
          extracted_data: Record<string, unknown> | null
          external_invoice_id: string
          id: string
          institution_id: string | null
          legacy_site_payment_id: string | null
          notes: string | null
          received_at: string
          site_id: string | null
          status: string
          study_id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approval_step?: number
          company_id: string
          created_at?: string
          created_by_profile_id?: string | null
          currency?: string
          document_path?: string | null
          due_at?: string | null
          entity_type: string
          extracted_at?: string | null
          extracted_data?: Record<string, unknown> | null
          external_invoice_id: string
          id?: string
          institution_id?: string | null
          legacy_site_payment_id?: string | null
          notes?: string | null
          received_at?: string
          site_id?: string | null
          status?: string
          study_id: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_step?: number
          company_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          currency?: string
          document_path?: string | null
          due_at?: string | null
          entity_type?: string
          extracted_at?: string | null
          extracted_data?: Record<string, unknown> | null
          external_invoice_id?: string
          id?: string
          institution_id?: string | null
          legacy_site_payment_id?: string | null
          notes?: string | null
          received_at?: string
          site_id?: string | null
          status?: string
          study_id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_legacy_site_payment_id_fkey"
            columns: ["legacy_site_payment_id"]
            isOneToOne: true
            referencedRelation: "site_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "finance_approval_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payment_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          payment_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "finance_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          currency: string
          id: string
          method: string
          notes: string | null
          paid_at: string | null
          reference: string | null
          status: string
          study_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: string
          study_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: string
          study_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transaction_log: {
        Row: {
          action: string
          actor_profile_id: string | null
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          from_state: string | null
          id: string
          payload: Json
          study_id: string | null
          to_state: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          from_state?: string | null
          id?: string
          payload?: Json
          study_id?: string | null
          to_state?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          from_state?: string | null
          id?: string
          payload?: Json
          study_id?: string | null
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_transaction_log_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_log_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_contracts: {
        Row: {
          contract_type: string
          created_at: string
          effective_date: string | null
          id: string
          institution_id: string | null
          notes: string | null
          site_id: string | null
          storage_path: string | null
          study_id: string
          title: string
          updated_at: string
        }
        Insert: {
          contract_type?: string
          created_at?: string
          effective_date?: string | null
          id?: string
          institution_id?: string | null
          notes?: string | null
          site_id?: string | null
          storage_path?: string | null
          study_id: string
          title: string
          updated_at?: string
        }
        Update: {
          contract_type?: string
          created_at?: string
          effective_date?: string | null
          id?: string
          institution_id?: string | null
          notes?: string | null
          site_id?: string | null
          storage_path?: string | null
          study_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_contracts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_items: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          resolved_date: string | null
          status: string
          trip_report_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          resolved_date?: string | null
          status?: string
          trip_report_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          resolved_date?: string | null
          status?: string
          trip_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_items_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
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
      institution_study: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          institution_id: string
          notes: string | null
          relationship_type: string
          start_date: string | null
          study_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          institution_id: string
          notes?: string | null
          relationship_type: string
          start_date?: string | null
          study_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          institution_id?: string
          notes?: string | null
          relationship_type?: string
          start_date?: string | null
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_study_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_study_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_study_site: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          notes: string | null
          study_site_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          notes?: string | null
          study_site_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          notes?: string | null
          study_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_study_site_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_study_site_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          archived_at: string | null
          city: string | null
          company_id: string
          country_code: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_type: string
          parent_institution_id: string | null
          postal_code: string | null
          region: string | null
          state_region: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          city?: string | null
          company_id: string
          country_code?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_type: string
          parent_institution_id?: string | null
          postal_code?: string | null
          region?: string | null
          state_region?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          city?: string | null
          company_id?: string
          country_code?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_type?: string
          parent_institution_id?: string | null
          postal_code?: string | null
          region?: string | null
          state_region?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutions_parent_institution_id_fkey"
            columns: ["parent_institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          company_id: string
          email: string
          first_name: string | null
          id: string
          invited_at: string
          invited_by: string
          last_name: string | null
          role: string
          status: string
          study_id: string | null
          study_role: string | null
        }
        Insert: {
          company_id: string
          email: string
          first_name?: string | null
          id?: string
          invited_at?: string
          invited_by: string
          last_name?: string | null
          role: string
          status?: string
          study_id?: string | null
          study_role?: string | null
        }
        Update: {
          company_id?: string
          email?: string
          first_name?: string | null
          id?: string
          invited_at?: string
          invited_by?: string
          last_name?: string | null
          role?: string
          status?: string
          study_id?: string | null
          study_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_items: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          name: string
          part_or_material_number: string | null
          study_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          name: string
          part_or_material_number?: string | null
          study_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          part_or_material_number?: string | null
          study_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_items_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_item_site_links: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          item_id: string
          study_id: string
          study_site_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_id: string
          study_id: string
          study_site_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_id?: string
          study_id?: string
          study_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_item_site_links_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ip_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_item_site_links_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_item_site_links_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_ledger_entries: {
        Row: {
          entry_type: string
          from_study_site_id: string | null
          id: string
          ip_order_id: string | null
          lot_id: string
          metadata: Json
          performed_at: string
          performed_by_profile_id: string
          quantity_delta: number
          site_name_snapshot: string | null
          site_number_snapshot: string | null
          study_id: string
          subject_id: string | null
          subject_number_snapshot: string | null
          to_study_site_id: string | null
        }
        Insert: {
          entry_type: string
          from_study_site_id?: string | null
          id?: string
          ip_order_id?: string | null
          lot_id: string
          metadata?: Json
          performed_at?: string
          performed_by_profile_id: string
          quantity_delta: number
          site_name_snapshot?: string | null
          site_number_snapshot?: string | null
          study_id: string
          subject_id?: string | null
          subject_number_snapshot?: string | null
          to_study_site_id?: string | null
        }
        Update: {
          entry_type?: string
          from_study_site_id?: string | null
          id?: string
          ip_order_id?: string | null
          lot_id?: string
          metadata?: Json
          performed_at?: string
          performed_by_profile_id?: string
          quantity_delta?: number
          site_name_snapshot?: string | null
          site_number_snapshot?: string | null
          study_id?: string
          subject_id?: string | null
          subject_number_snapshot?: string | null
          to_study_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_ledger_entries_from_study_site_id_fkey"
            columns: ["from_study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_ledger_entries_ip_order_id_fkey"
            columns: ["ip_order_id"]
            isOneToOne: false
            referencedRelation: "ip_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "ip_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "ip_v_log_rows"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "ip_ledger_entries_performed_by_profile_id_fkey"
            columns: ["performed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_ledger_entries_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_ledger_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_ledger_entries_to_study_site_id_fkey"
            columns: ["to_study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_lot_locations: {
        Row: {
          disposition: string
          id: string
          lot_id: string
          notes: string | null
          quantity_available: number
          quantity_on_hand: number
          study_id: string
          study_site_id: string | null
          updated_at: string
          verified_at: string | null
          verified_by_profile_id: string | null
        }
        Insert: {
          disposition?: string
          id?: string
          lot_id: string
          notes?: string | null
          quantity_available?: number
          quantity_on_hand?: number
          study_id: string
          study_site_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by_profile_id?: string | null
        }
        Update: {
          disposition?: string
          id?: string
          lot_id?: string
          notes?: string | null
          quantity_available?: number
          quantity_on_hand?: number
          study_id?: string
          study_site_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_lot_locations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "ip_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_lot_locations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "ip_v_log_rows"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "ip_lot_locations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_lot_locations_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_lot_locations_verified_by_profile_id_fkey"
            columns: ["verified_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_lots: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          id: string
          inventory_trace_id: string | null
          item_id: string
          lot_number: string | null
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_trace_id?: string | null
          item_id: string
          lot_number?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_trace_id?: string | null
          item_id?: string
          lot_number?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ip_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ip_v_log_rows"
            referencedColumns: ["item_id"]
          },
        ]
      }
      ip_order_documents: {
        Row: {
          content_type: string
          created_at: string
          doc_kind: string
          id: string
          label: string | null
          order_id: string
          original_filename: string
          storage_object_path: string
          study_id: string
          uploaded_by_profile_id: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          doc_kind?: string
          id?: string
          label?: string | null
          order_id: string
          original_filename?: string
          storage_object_path: string
          study_id: string
          uploaded_by_profile_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          doc_kind?: string
          id?: string
          label?: string | null
          order_id?: string
          original_filename?: string
          storage_object_path?: string
          study_id?: string
          uploaded_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ip_order_documents_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'ip_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ip_order_documents_study_id_fkey'
            columns: ['study_id']
            isOneToOne: false
            referencedRelation: 'studies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ip_order_documents_uploaded_by_profile_id_fkey'
            columns: ['uploaded_by_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ip_orders: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          inventory_trace_id: string | null
          item_id: string | null
          lot_id: string | null
          metadata: Json
          order_reference: string
          status: string
          study_id: string
          study_site_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          inventory_trace_id?: string | null
          item_id?: string | null
          lot_id?: string | null
          metadata?: Json
          order_reference?: string
          status?: string
          study_id: string
          study_site_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          inventory_trace_id?: string | null
          item_id?: string | null
          lot_id?: string | null
          metadata?: Json
          order_reference?: string
          status?: string
          study_id?: string
          study_site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_orders_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_orders_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_orders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ip_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "ip_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      kri_definitions: {
        Row: {
          calculation_method: string | null
          category: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          threshold_red: number | null
          threshold_yellow: number | null
          updated_at: string
        }
        Insert: {
          calculation_method?: string | null
          category?: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          threshold_red?: number | null
          threshold_yellow?: number | null
          updated_at?: string
        }
        Update: {
          calculation_method?: string | null
          category?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          threshold_red?: number | null
          threshold_yellow?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kri_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kri_values: {
        Row: {
          calculated_at: string
          id: string
          kri_definition_id: string
          period: string
          site_id: string | null
          status: string
          study_id: string
          value: number
        }
        Insert: {
          calculated_at?: string
          id?: string
          kri_definition_id: string
          period: string
          site_id?: string | null
          status?: string
          study_id: string
          value?: number
        }
        Update: {
          calculated_at?: string
          id?: string
          kri_definition_id?: string
          period?: string
          site_id?: string | null
          status?: string
          study_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kri_values_kri_definition_id_fkey"
            columns: ["kri_definition_id"]
            isOneToOne: false
            referencedRelation: "kri_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_values_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_values_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
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
          protocol_id: string | null
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
          protocol_id?: string | null
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
          protocol_id?: string | null
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
        ]
      }
      monitoring_visits: {
        Row: {
          actual_date: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          monitor_id: string | null
          notes: string | null
          planned_date: string | null
          site_id: string
          start_date: string | null
          status: string
          study_id: string
          updated_at: string
          visit_location: string | null
          visit_name: string | null
          visit_type: string
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          monitor_id?: string | null
          notes?: string | null
          planned_date?: string | null
          site_id: string
          start_date?: string | null
          status?: string
          study_id: string
          updated_at?: string
          visit_location?: string | null
          visit_name?: string | null
          visit_type?: string
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          monitor_id?: string | null
          notes?: string | null
          planned_date?: string | null
          site_id?: string
          start_date?: string | null
          status?: string
          study_id?: string
          updated_at?: string
          visit_location?: string | null
          visit_name?: string | null
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_visits_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_visits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_visits_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
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
          protocol_id: string | null
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
          protocol_id?: string | null
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
          protocol_id?: string | null
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
      payment_schedules: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          milestone_name: string
          site_id: string
          status: string
          study_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          milestone_name: string
          site_id: string
          status?: string
          study_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          milestone_name?: string
          site_id?: string
          status?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_documentation: {
        Row: {
          body_markdown: string
          category: string | null
          description: string | null
          icon_key: string | null
          module_route: string | null
          roles: string[]
          slug: string
          sort_order: number | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_markdown?: string
          category?: string | null
          description?: string | null
          icon_key?: string | null
          module_route?: string | null
          roles?: string[]
          slug: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_markdown?: string
          category?: string | null
          description?: string | null
          icon_key?: string | null
          module_route?: string | null
          roles?: string[]
          slug?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_documentation_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          is_active: boolean
          is_platform_admin: boolean
          job_title: string | null
          language: string | null
          last_name: string | null
          onboarding_completed_at: string | null
          onboarding_state: Json
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
          is_active?: boolean
          is_platform_admin?: boolean
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_state?: Json
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
          is_active?: boolean
          is_platform_admin?: boolean
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_state?: Json
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
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_submissions: {
        Row: {
          approval_date: string | null
          created_at: string
          expiry_date: string | null
          id: string
          notes: string | null
          reference_number: string | null
          status: string
          study_country_id: string
          submission_date: string | null
          submission_type: string
          updated_at: string
        }
        Insert: {
          approval_date?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          status?: string
          study_country_id: string
          submission_date?: string | null
          submission_type: string
          updated_at?: string
        }
        Update: {
          approval_date?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          status?: string
          study_country_id?: string
          submission_date?: string | null
          submission_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_submissions_study_country_id_fkey"
            columns: ["study_country_id"]
            isOneToOne: false
            referencedRelation: "study_countries"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          filters: Json
          id: string
          name: string
          report_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          filters?: Json
          id?: string
          name: string
          report_type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          filters?: Json
          id?: string
          name?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sdv_reports: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          profile_id: string
          protocol_id: string | null
          sdv_data_upload_id: string | null
          site_data_upload_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          profile_id: string
          protocol_id?: string | null
          sdv_data_upload_id?: string | null
          site_data_upload_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          profile_id?: string
          protocol_id?: string | null
          sdv_data_upload_id?: string | null
          site_data_upload_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdv_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_reports_sdv_data_upload_id_fkey"
            columns: ["sdv_data_upload_id"]
            isOneToOne: false
            referencedRelation: "sdv_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_reports_site_data_upload_id_fkey"
            columns: ["site_data_upload_id"]
            isOneToOne: false
            referencedRelation: "sdv_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      sdv_sdv_data: {
        Row: {
          company_id: string
          created_at: string
          event_name: string
          form_name: string
          id: number
          item_name: string
          merge_key: string
          report_id: string | null
          sdv_by: string | null
          sdv_date: string | null
          site_name: string
          subject_id: string
          upload_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_name: string
          form_name: string
          id?: number
          item_name: string
          merge_key: string
          report_id?: string | null
          sdv_by?: string | null
          sdv_date?: string | null
          site_name: string
          subject_id: string
          upload_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_name?: string
          form_name?: string
          id?: number
          item_name?: string
          merge_key?: string
          report_id?: string | null
          sdv_by?: string | null
          sdv_date?: string | null
          site_name?: string
          subject_id?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdv_sdv_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_sdv_data_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "sdv_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_sdv_data_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "sdv_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      sdv_site_data: {
        Row: {
          company_id: string
          created_at: string
          edit_by: string | null
          edit_date_time: string | null
          edit_reason: string | null
          event_name: string
          form_name: string
          id: number
          item_export_label: string
          merge_key: string
          report_id: string | null
          site_name: string
          subject_id: string
          upload_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          edit_by?: string | null
          edit_date_time?: string | null
          edit_reason?: string | null
          event_name: string
          form_name: string
          id?: number
          item_export_label: string
          merge_key: string
          report_id?: string | null
          site_name: string
          subject_id: string
          upload_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          edit_by?: string | null
          edit_date_time?: string | null
          edit_reason?: string | null
          event_name?: string
          form_name?: string
          id?: number
          item_export_label?: string
          merge_key?: string
          report_id?: string | null
          site_name?: string
          subject_id?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdv_site_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_site_data_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "sdv_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_site_data_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "sdv_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      sdv_uploads: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          file_name: string
          file_type: string
          id: string
          processed_count: number | null
          processing_completed_at: string | null
          processing_started_at: string | null
          profile_id: string
          progress: number | null
          protocol_id: string | null
          record_count: number
          report_id: string | null
          status: string
          storage_path: string | null
          total_count: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          file_name: string
          file_type: string
          id?: string
          processed_count?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          profile_id: string
          progress?: number | null
          protocol_id?: string | null
          record_count?: number
          report_id?: string | null
          status?: string
          storage_path?: string | null
          total_count?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_type?: string
          id?: string
          processed_count?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          profile_id?: string
          progress?: number | null
          protocol_id?: string | null
          record_count?: number
          report_id?: string | null
          status?: string
          storage_path?: string | null
          total_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdv_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_uploads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_uploads_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "sdv_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      site_budgets: {
        Row: {
          approved_amount: number | null
          created_at: string
          currency: string
          document_path: string | null
          effective_from: string
          id: string
          negotiation_status: string
          notes: string | null
          overhead_rate: number | null
          payment_info: Json | null
          payment_terms_type: string
          proposed_amount: number
          site_id: string
          study_budget_id: string | null
          study_id: string
          supersedes_budget_id: string | null
          terms: Json | null
          updated_at: string
          version: number
        }
        Insert: {
          approved_amount?: number | null
          created_at?: string
          currency?: string
          document_path?: string | null
          effective_from?: string
          id?: string
          negotiation_status?: string
          notes?: string | null
          overhead_rate?: number | null
          payment_info?: Json | null
          payment_terms_type?: string
          proposed_amount?: number
          site_id: string
          study_budget_id?: string | null
          study_id: string
          supersedes_budget_id?: string | null
          terms?: Json | null
          updated_at?: string
          version?: number
        }
        Update: {
          approved_amount?: number | null
          created_at?: string
          currency?: string
          document_path?: string | null
          effective_from?: string
          id?: string
          negotiation_status?: string
          notes?: string | null
          overhead_rate?: number | null
          payment_info?: Json | null
          payment_terms_type?: string
          proposed_amount?: number
          site_id?: string
          study_budget_id?: string | null
          study_id?: string
          supersedes_budget_id?: string | null
          terms?: Json | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_budgets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_budgets_study_budget_id_fkey"
            columns: ["study_budget_id"]
            isOneToOne: false
            referencedRelation: "study_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_budgets_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_budget_line_items: {
        Row: {
          cost_basis: string | null
          cost_with_overhead: number
          created_at: string
          description: string
          id: string
          is_active: boolean
          notes: string | null
          overhead_amount: number
          overhead_rate: number | null
          paid_to: string
          quantity: number
          section: string
          site_budget_id: string
          sort_order: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          cost_basis?: string | null
          description: string
          id?: string
          is_active?: boolean
          notes?: string | null
          overhead_rate?: number | null
          paid_to?: string
          quantity?: number
          section: string
          site_budget_id: string
          sort_order?: number
          unit_cost?: number
        }
        Update: {
          cost_basis?: string | null
          description?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          overhead_rate?: number | null
          paid_to?: string
          quantity?: number
          section?: string
          site_budget_id?: string
          sort_order?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_budget_line_items_site_budget_id_fkey"
            columns: ["site_budget_id"]
            isOneToOne: false
            referencedRelation: "site_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_contacts: {
        Row: {
          created_at: string
          directory_contact_id: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role: string
          site_id: string
        }
        Insert: {
          created_at?: string
          directory_contact_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role: string
          site_id: string
        }
        Update: {
          created_at?: string
          directory_contact_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_contacts_directory_contact_id_fkey"
            columns: ["directory_contact_id"]
            isOneToOne: false
            referencedRelation: "directory_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_contacts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          payment_date: string | null
          payment_type: string
          site_id: string
          status: string
          study_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_type?: string
          site_id: string
          status?: string
          study_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_type?: string
          site_id?: string
          status?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_payments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_payments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      studies: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          end_date: string | null
          finance_approval_template_id: string | null
          id: string
          indication: string | null
          overview: Json | null
          phase: string
          protocol_number: string
          sponsor: string | null
          sponsor_institution_id: string | null
          start_date: string | null
          status: string
          therapeutic_area: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          finance_approval_template_id?: string | null
          id?: string
          indication?: string | null
          overview?: Json | null
          phase: string
          protocol_number: string
          sponsor?: string | null
          sponsor_institution_id?: string | null
          start_date?: string | null
          status?: string
          therapeutic_area?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          finance_approval_template_id?: string | null
          id?: string
          indication?: string | null
          overview?: Json | null
          phase?: string
          protocol_number?: string
          sponsor?: string | null
          sponsor_institution_id?: string | null
          start_date?: string | null
          status?: string
          therapeutic_area?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studies_finance_approval_template_id_fkey"
            columns: ["finance_approval_template_id"]
            isOneToOne: false
            referencedRelation: "finance_approval_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studies_sponsor_institution_id_fkey"
            columns: ["sponsor_institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_budgets: {
        Row: {
          created_at: string
          currency: string
          effective_from: string
          id: string
          name: string
          status: string
          study_id: string
          supersedes_budget_id: string | null
          total_amount: number
          updated_at: string
          version: number
          wizard_inputs: Json | null
        }
        Insert: {
          created_at?: string
          currency?: string
          effective_from?: string
          id?: string
          name: string
          status?: string
          study_id: string
          supersedes_budget_id?: string | null
          total_amount?: number
          updated_at?: string
          version?: number
          wizard_inputs?: Json | null
        }
        Update: {
          created_at?: string
          currency?: string
          effective_from?: string
          id?: string
          name?: string
          status?: string
          study_id?: string
          supersedes_budget_id?: string | null
          total_amount?: number
          updated_at?: string
          version?: number
          wizard_inputs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "study_budgets_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_budgets_supersedes_budget_id_fkey"
            columns: ["supersedes_budget_id"]
            isOneToOne: false
            referencedRelation: "study_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      study_countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          id: string
          regulatory_status: string | null
          status: string
          study_id: string
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          id?: string
          regulatory_status?: string | null
          status?: string
          study_id: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
          regulatory_status?: string | null
          status?: string
          study_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_countries_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_milestones: {
        Row: {
          actual_date: string | null
          created_at: string
          department: string | null
          description: string | null
          id: string
          name: string
          planned_due_date: string | null
          planned_start_date: string | null
          status: string
          study_id: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          name: string
          planned_due_date?: string | null
          planned_start_date?: string | null
          status?: string
          study_id: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          name?: string
          planned_due_date?: string | null
          planned_start_date?: string | null
          status?: string
          study_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_milestones_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sites: {
        Row: {
          activation_date: string | null
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          nearest_airport_address: string | null
          nearest_airport_name: string | null
          nearest_airport_place_id: string | null
          nearest_hotel_address: string | null
          nearest_hotel_name: string | null
          nearest_hotel_place_id: string | null
          pi_directory_contact_id: string | null
          pi_email: string | null
          pi_name: string | null
          postal_code: string | null
          site_number: string
          state: string | null
          status: string
          study_country_id: string | null
          study_id: string
          target_enrollment: number | null
          travel_notes: string | null
          updated_at: string
        }
        Insert: {
          activation_date?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          nearest_airport_address?: string | null
          nearest_airport_name?: string | null
          nearest_airport_place_id?: string | null
          nearest_hotel_address?: string | null
          nearest_hotel_name?: string | null
          nearest_hotel_place_id?: string | null
          pi_directory_contact_id?: string | null
          pi_email?: string | null
          pi_name?: string | null
          postal_code?: string | null
          site_number: string
          state?: string | null
          status?: string
          study_country_id?: string | null
          study_id: string
          target_enrollment?: number | null
          travel_notes?: string | null
          updated_at?: string
        }
        Update: {
          activation_date?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          nearest_airport_address?: string | null
          nearest_airport_name?: string | null
          nearest_airport_place_id?: string | null
          nearest_hotel_address?: string | null
          nearest_hotel_name?: string | null
          nearest_hotel_place_id?: string | null
          pi_directory_contact_id?: string | null
          pi_email?: string | null
          pi_name?: string | null
          postal_code?: string | null
          site_number?: string
          state?: string | null
          status?: string
          study_country_id?: string | null
          study_id?: string
          target_enrollment?: number | null
          travel_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sites_pi_directory_contact_id_fkey"
            columns: ["pi_directory_contact_id"]
            isOneToOne: false
            referencedRelation: "directory_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sites_study_country_id_fkey"
            columns: ["study_country_id"]
            isOneToOne: false
            referencedRelation: "study_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sites_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_team_members: {
        Row: {
          created_at: string
          custom_role_id: string | null
          end_date: string | null
          id: string
          is_active: boolean
          profile_id: string
          role: string
          site_id: string | null
          start_date: string | null
          study_id: string
        }
        Insert: {
          created_at?: string
          custom_role_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          profile_id: string
          role?: string
          site_id?: string | null
          start_date?: string | null
          study_id: string
        }
        Update: {
          created_at?: string
          custom_role_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          profile_id?: string
          role?: string
          site_id?: string | null
          start_date?: string | null
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_team_members_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_team_members_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_team_members_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_visits: {
        Row: {
          actual_date: string | null
          created_at: string
          id: string
          notes: string | null
          planned_date: string | null
          status: string
          subject_id: string
          visit_name: string
          visit_number: number
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          planned_date?: string | null
          status?: string
          subject_id: string
          visit_name: string
          visit_number: number
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          planned_date?: string | null
          status?: string
          subject_id?: string
          visit_name?: string
          visit_number?: number
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_visits_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          completion_date: string | null
          created_at: string
          id: string
          randomization_date: string | null
          randomization_number: string | null
          screening_date: string | null
          screening_number: string | null
          site_id: string
          status: string
          study_id: string
          subject_number: string
          updated_at: string
          withdrawal_date: string | null
          withdrawal_reason: string | null
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          id?: string
          randomization_date?: string | null
          randomization_number?: string | null
          screening_date?: string | null
          screening_number?: string | null
          site_id: string
          status?: string
          study_id: string
          subject_number: string
          updated_at?: string
          withdrawal_date?: string | null
          withdrawal_reason?: string | null
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          id?: string
          randomization_date?: string | null
          randomization_number?: string | null
          screening_date?: string | null
          screening_number?: string | null
          site_id?: string
          status?: string
          study_id?: string
          subject_number?: string
          updated_at?: string
          withdrawal_date?: string | null
          withdrawal_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
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
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          seats_included: number
          seats_used: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          seats_included?: number
          seats_used?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          seats_included?: number
          seats_used?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          on_track_status: string | null
          planned_start_date: string | null
          priority: string
          site_id: string | null
          sort_order: number
          status: string
          study_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          on_track_status?: string | null
          planned_start_date?: string | null
          priority?: string
          site_id?: string | null
          sort_order?: number
          status?: string
          study_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          on_track_status?: string | null
          planned_start_date?: string | null
          priority?: string
          site_id?: string | null
          sort_order?: number
          status?: string
          study_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "study_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_roles: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          role_name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          role_name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_activity_types: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_activity_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_expense_approval_templates: {
        Row: {
          applies_to: string
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          applies_to: string
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          applies_to?: string
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_expense_approval_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_approval_decisions: {
        Row: {
          comment: string | null
          created_at: string
          decision: string
          id: string
          period_id: string
          profile_id: string
          step_index: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decision: string
          id?: string
          period_id: string
          profile_id: string
          step_index: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          decision?: string
          id?: string
          period_id?: string
          profile_id?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_approval_decisions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "timesheet_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_approval_decisions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          activity_type_id: string
          ai_suggestions: Json | null
          created_at: string
          hours: number
          id: string
          is_billable: boolean
          notes: string | null
          period_id: string
          sort_index: number
          site_id: string | null
          study_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          activity_type_id: string
          ai_suggestions?: Json | null
          created_at?: string
          hours?: number
          id?: string
          is_billable?: boolean
          notes?: string | null
          period_id: string
          sort_index?: number
          site_id?: string | null
          study_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          activity_type_id?: string
          ai_suggestions?: Json | null
          created_at?: string
          hours?: number
          id?: string
          is_billable?: boolean
          notes?: string | null
          period_id?: string
          sort_index?: number
          site_id?: string | null
          study_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "time_activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "timesheet_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_periods: {
        Row: {
          approval_step: number
          approved_snapshot: Json | null
          billable_hours: number | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          overtime_hours: number | null
          profile_id: string
          status: string
          study_id: string
          submitted_at: string | null
          template_id: string | null
          total_hours: number | null
          updated_at: string
          version: number
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          approval_step?: number
          approved_snapshot?: Json | null
          billable_hours?: number | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          profile_id: string
          status?: string
          study_id: string
          submitted_at?: string | null
          template_id?: string | null
          total_hours?: number | null
          updated_at?: string
          version?: number
          week_end_date: string
          week_start_date: string
        }
        Update: {
          approval_step?: number
          approved_snapshot?: Json | null
          billable_hours?: number | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          profile_id?: string
          status?: string
          study_id?: string
          submitted_at?: string | null
          template_id?: string | null
          total_hours?: number | null
          updated_at?: string
          version?: number
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_periods_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_periods_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_periods_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "time_expense_approval_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_action_items: {
        Row: {
          created_at: string
          description: string
          due_date: string | null
          id: string
          owner: string | null
          resolution_date: string | null
          sort_order: number
          status: string
          trip_report_id: string
        }
        Insert: {
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          owner?: string | null
          resolution_date?: string | null
          sort_order?: number
          status?: string
          trip_report_id: string
        }
        Update: {
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          owner?: string | null
          resolution_date?: string | null
          sort_order?: number
          status?: string
          trip_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_action_items_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_attendees: {
        Row: {
          attendee_type: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          role: string | null
          sort_order: number
          trip_report_id: string
        }
        Insert: {
          attendee_type: string
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          role?: string | null
          sort_order?: number
          trip_report_id: string
        }
        Update: {
          attendee_type?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: string | null
          sort_order?: number
          trip_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_attendees_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_crf_entries: {
        Row: {
          created_at: string
          crf_name: string | null
          id: string
          sdv_status: string | null
          sort_order: number
          subject_number: string | null
          trip_report_id: string
        }
        Insert: {
          created_at?: string
          crf_name?: string | null
          id?: string
          sdv_status?: string | null
          sort_order?: number
          subject_number?: string | null
          trip_report_id: string
        }
        Update: {
          created_at?: string
          crf_name?: string | null
          id?: string
          sdv_status?: string | null
          sort_order?: number
          subject_number?: string | null
          trip_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_crf_entries_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_findings: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          resolution_date: string | null
          resolution_notes: string | null
          resolution_status: string
          severity: string
          trip_report_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          resolution_date?: string | null
          resolution_notes?: string | null
          resolution_status?: string
          severity?: string
          trip_report_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          resolution_date?: string | null
          resolution_notes?: string | null
          resolution_status?: string
          severity?: string
          trip_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_findings_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_question_responses: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          response: string | null
          reviewer_comments: string | null
          sort_order: number
          template_question_id: string
          trip_report_id: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          response?: string | null
          reviewer_comments?: string | null
          sort_order?: number
          template_question_id: string
          trip_report_id: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          response?: string | null
          reviewer_comments?: string | null
          sort_order?: number
          template_question_id?: string
          trip_report_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_question_responses_template_question_id_fkey"
            columns: ["template_question_id"]
            isOneToOne: false
            referencedRelation: "visit_report_template_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_report_question_responses_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_status_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          from_status: string | null
          id: string
          metadata: Json | null
          to_status: string
          trip_report_id: string
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          to_status: string
          trip_report_id: string
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          to_status?: string
          trip_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_status_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_report_status_events_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_reports: {
        Row: {
          approval_due_date: string | null
          approval_signature_data: string | null
          approval_signed_at: string | null
          approved_by: string | null
          approved_date: string | null
          author_submission_signature_data: string | null
          author_submission_signed_at: string | null
          created_at: string
          created_by: string
          findings: string | null
          id: string
          narrative: string | null
          report_status: string | null
          reviewed_at: string | null
          reviewer_comments_attachments: string | null
          reviewer_comments_monitored_crfs: string | null
          reviewer_comments_narrative: string | null
          reviewer_comments_open_actions: string | null
          reviewer_comments_site_attendees: string | null
          reviewer_comments_sponsor_attendees: string | null
          reviewer_id: string | null
          status: string
          submission_due_date: string | null
          submitted_date: string | null
          summary: string | null
          template_id: string | null
          visit_id: string
        }
        Insert: {
          approval_due_date?: string | null
          approval_signature_data?: string | null
          approval_signed_at?: string | null
          approved_by?: string | null
          approved_date?: string | null
          author_submission_signature_data?: string | null
          author_submission_signed_at?: string | null
          created_at?: string
          created_by: string
          findings?: string | null
          id?: string
          narrative?: string | null
          report_status?: string | null
          reviewed_at?: string | null
          reviewer_comments_attachments?: string | null
          reviewer_comments_monitored_crfs?: string | null
          reviewer_comments_narrative?: string | null
          reviewer_comments_open_actions?: string | null
          reviewer_comments_site_attendees?: string | null
          reviewer_comments_sponsor_attendees?: string | null
          reviewer_id?: string | null
          status?: string
          submission_due_date?: string | null
          submitted_date?: string | null
          summary?: string | null
          template_id?: string | null
          visit_id: string
        }
        Update: {
          approval_due_date?: string | null
          approval_signature_data?: string | null
          approval_signed_at?: string | null
          approved_by?: string | null
          approved_date?: string | null
          author_submission_signature_data?: string | null
          author_submission_signed_at?: string | null
          created_at?: string
          created_by?: string
          findings?: string | null
          id?: string
          narrative?: string | null
          report_status?: string | null
          reviewed_at?: string | null
          reviewer_comments_attachments?: string | null
          reviewer_comments_monitored_crfs?: string | null
          reviewer_comments_narrative?: string | null
          reviewer_comments_open_actions?: string | null
          reviewer_comments_site_attendees?: string | null
          reviewer_comments_sponsor_attendees?: string | null
          reviewer_id?: string | null
          status?: string
          submission_due_date?: string | null
          submitted_date?: string | null
          summary?: string | null
          template_id?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "visit_report_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "monitoring_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_jobs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          error_details: Json | null
          error_message: string | null
          failed_records: number
          file_name: string
          id: string
          job_type: string
          metadata: Json | null
          processed_records: number
          progress: number
          started_at: string | null
          status: string
          total_records: number
          updated_at: string
          upload_id: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_details?: Json | null
          error_message?: string | null
          failed_records?: number
          file_name: string
          id?: string
          job_type: string
          metadata?: Json | null
          processed_records?: number
          progress?: number
          started_at?: string | null
          status?: string
          total_records?: number
          updated_at?: string
          upload_id?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_details?: Json | null
          error_message?: string | null
          failed_records?: number
          file_name?: string
          id?: string
          job_type?: string
          metadata?: Json | null
          processed_records?: number
          progress?: number
          started_at?: string | null
          status?: string
          total_records?: number
          updated_at?: string
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_report_attachments: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          trip_report_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          trip_report_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          trip_report_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_report_attachments_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_report_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_report_template_questions: {
        Row: {
          created_at: string
          id: string
          question_text: string
          report_order: number
          report_section: string | null
          report_sub_section: string | null
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_text: string
          report_order?: number
          report_section?: string | null
          report_sub_section?: string | null
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_text?: string
          report_order?: number
          report_section?: string | null
          report_sub_section?: string | null
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_report_template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "visit_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_report_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          days_approval: number
          days_basis: string
          days_submission: number
          id: string
          name: string
          study_id: string | null
          template_status: string
          updated_at: string
          visit_report_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          days_approval?: number
          days_basis?: string
          days_submission?: number
          id?: string
          name: string
          study_id?: string | null
          template_status?: string
          updated_at?: string
          visit_report_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          days_approval?: number
          days_basis?: string
          days_submission?: number
          id?: string
          name?: string
          study_id?: string | null
          template_status?: string
          updated_at?: string
          visit_report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_report_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_report_templates_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
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
          protocol_id: string | null
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
          protocol_id?: string | null
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
          protocol_id?: string | null
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
        ]
      }
    }
    Views: {
      ip_v_disposition_totals: {
        Row: {
          category: string | null
          disposition: string | null
          study_id: string | null
          study_site_id: string | null
          total_qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_items_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_lot_locations_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_v_log_rows: {
        Row: {
          batch_number: string | null
          category: string | null
          disposition: string | null
          dispensed_at: string | null
          dispensed_by_name: string | null
          dispensed_container_fill_state: string | null
          dispensed_subject_number: string | null
          destroyed_container_fill_state: string | null
          flag_unverified_used: boolean | null
          item_id: string | null
          item_name: string | null
          location_id: string | null
          lot_id: string | null
          lot_number: string | null
          notes: string | null
          order_deleted_at: string | null
          order_id: string | null
          order_reference: string | null
          order_status: string | null
          quantity_available: number | null
          quantity_on_hand: number | null
          received_at: string | null
          received_by_name: string | null
          returned_container_fill_state: string | null
          serial_number: string | null
          site_name: string | null
          site_number: string | null
          study_id: string | null
          study_site_id: string | null
          unit: string | null
          verified_at: string | null
          verified_by_name: string | null
          verified_by_profile_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_items_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_lot_locations_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_lot_locations_verified_by_profile_id_fkey"
            columns: ["verified_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ensure_user_profile: { Args: never; Returns: Json }
      expense_report_record_decision: {
        Args: { p_comment: string; p_decision: string; p_report_id: string }
        Returns: Json
      }
      finance_invoice_record_decision: {
        Args: { p_comment: string; p_decision: string; p_invoice_id: string }
        Returns: Json
      }
      timesheet_period_record_decision: {
        Args: { p_comment: string; p_decision: string; p_period_id: string }
        Returns: Json
      }
      generate_company_id: { Args: never; Returns: string }
      get_sdv_aggregations: {
        Args: {
          p_event_filter?: string
          p_form_filter?: string
          p_report_id: string
          p_site_filter?: string
          p_source_filter?: string
          p_subject_filter?: string
        }
        Returns: {
          both_count: number
          data_expected: number
          sdv_percent: number
          site_data_only_count: number
          total_items: number
          total_sites: number
          total_subjects: number
          verified_items: number
        }[]
      }
      get_sdv_cascading_filter_options: {
        Args: {
          p_event_filter?: string
          p_report_id: string
          p_site_filter?: string
          p_subject_filter?: string
        }
        Returns: {
          event_names: string[]
          form_names: string[]
          subject_ids: string[]
        }[]
      }
      get_sdv_event_summary: {
        Args: {
          p_report_id: string
          p_site_name: string
          p_source_filter?: string
          p_subject_id: string
        }
        Returns: {
          both_count: number
          data_expected: number
          event_name: string
          sdv_percent: number
          site_data_only_count: number
          site_name: string
          subject_id: string
          total_items: number
          verified_items: number
        }[]
      }
      get_sdv_field_details: {
        Args: {
          p_crf_name: string
          p_site_name: string
          p_subject_id: string
          p_upload_id: string
          p_visit_type: string
        }
        Returns: {
          crf_field: string
          crf_name: string
          data_entered: number
          data_expected: number
          data_needing_review: number
          data_verified: number
          estimate_days: number
          estimate_hours: number
          sdv_percent: number
          site_name: string
          subject_id: string
          visit_type: string
        }[]
      }
      get_sdv_filter_options: {
        Args: { p_report_id: string }
        Returns: {
          data_sources: string[]
          event_names: string[]
          form_names: string[]
          site_names: string[]
          subject_ids: string[]
        }[]
      }
      get_sdv_form_summary: {
        Args: {
          p_event_name: string
          p_report_id: string
          p_site_name: string
          p_source_filter?: string
          p_subject_id: string
        }
        Returns: {
          both_count: number
          data_expected: number
          event_name: string
          form_name: string
          sdv_percent: number
          site_data_only_count: number
          site_name: string
          subject_id: string
          total_items: number
          verified_items: number
        }[]
      }
      get_sdv_item_details: {
        Args: {
          p_event_name: string
          p_form_name: string
          p_report_id: string
          p_site_name: string
          p_source_filter?: string
          p_subject_id: string
        }
        Returns: {
          data_source: string
          edit_by: string
          edit_date_time: string
          edit_reason: string
          event_name: string
          form_name: string
          is_initial_entry: boolean
          is_verified: boolean
          item_display: string
          item_export_label: string
          item_name: string
          sdv_by: string
          sdv_date: string
          site_name: string
          subject_id: string
        }[]
      }
      get_sdv_site_summary: {
        Args: { p_report_id: string; p_source_filter?: string }
        Returns: {
          both_count: number
          data_expected: number
          sdv_percent: number
          site_data_only_count: number
          site_name: string
          total_items: number
          total_subjects: number
          verified_items: number
        }[]
      }
      get_sdv_sites_summary: {
        Args: {
          p_crf_filter?: string
          p_site_filter?: string
          p_subject_filter?: string
          p_upload_id: string
          p_visit_filter?: string
        }
        Returns: {
          record_count: number
          site_name: string
        }[]
      }
      get_sdv_subject_summary: {
        Args: {
          p_report_id: string
          p_site_name: string
          p_source_filter?: string
        }
        Returns: {
          both_count: number
          data_expected: number
          sdv_percent: number
          site_data_only_count: number
          site_name: string
          subject_id: string
          total_items: number
          verified_items: number
        }[]
      }
      ip_assert_study_company: { Args: { p_study_id: string }; Returns: string }
      ip_correct_site_lot_serial: {
        Args: {
          p_lot_id: string
          p_reason?: string
          p_serial_number: string
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_create_item: {
        Args: {
          p_category: string
          p_name: string
          p_part_or_material_number?: string
          p_study_id: string
          p_unit?: string
        }
        Returns: string
      }
      ip_destroy_at_site: {
        Args: {
          p_container_fill_state?: string | null
          p_lot_id: string
          p_notes?: string | null
          p_quantity: number
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_dispense: {
        Args: {
          p_container_fill_state?: string | null
          p_lot_id: string
          p_quantity: number
          p_study_id: string
          p_study_site_id: string
          p_subject_id?: string | null
          p_subject_number_free_text?: string | null
        }
        Returns: undefined
      }
      ip_ensure_site_lot_receipt_mirror_if_missing: {
        Args: {
          p_lot_id: string
          p_study_id: string
          p_study_site_id: string
        }
        Returns: boolean
      }
      ip_admin_reset_site_line_to_available: {
        Args: {
          p_lot_id: string
          p_reason?: string | null
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_admin_unverify_inventory_at_site: {
        Args: {
          p_lot_id: string
          p_reason?: string | null
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_archive_item: {
        Args: { p_item_id: string }
        Returns: undefined
      }
      ip_archive_item_site_link: {
        Args: { p_item_id: string; p_study_id: string; p_study_site_id: string }
        Returns: undefined
      }
      ip_get_item_site_metrics: {
        Args: {
          p_include_archived?: boolean
          p_item_id: string
          p_study_id: string
        }
        Returns: {
          global_in_stock: number
          global_returns: number
          global_sent: number
          order_count: number
          site_available: number
          site_destroyed: number
          site_in_transit: number
          site_name: string
          site_number: string
          site_onsite: number
          site_returned: number
          site_shipments: number
          site_transfers: number
          site_used: number
          study_site_id: string
        }[]
      }
      ip_get_study_metrics: {
        Args: {
          p_category?: string
          p_include_archived?: boolean
          p_study_id: string
          p_study_site_id?: string
        }
        Returns: {
          associated_sites: number
          category: string
          compliance_pct: number
          global_in_stock: number
          global_returns: number
          global_sent: number
          item_id: string
          item_name: string
          site_available: number
          site_destroyed: number
          site_in_transit: number
          site_onsite: number
          site_returned: number
          site_shipments: number
          site_transfers: number
          site_used: number
          unit: string
        }[]
      }
      ip_in_transit_lines: {
        Args: { p_study_id: string; p_study_site_id?: string }
        Returns: {
          item_id: string
          item_name: string
          lot_id: string
          lot_number: string
          qty_in_transit: number
          serial_number: string
          study_site_id: string
        }[]
      }
      ip_initial_global_receipt: {
        Args: {
          p_batch_number?: string
          p_expiry_date?: string
          p_inventory_trace_id?: string | null
          p_item_id: string
          p_lot_number?: string
          p_quantity: number
          p_receipt_metadata?: unknown
          p_serial_number?: string
          p_study_id: string
        }
        Returns: string
      }
      ip_internal_insert_ledger: {
        Args: {
          p_entry_type: string
          p_from_site: string
          p_lot_id: string
          p_metadata: Json
          p_order_id: string
          p_profile_id: string
          p_quantity_delta: number
          p_site_name_snapshot: string
          p_site_number_snapshot: string
          p_study_id: string
          p_subject_id: string
          p_subject_number_snapshot: string
          p_to_site: string
        }
        Returns: string
      }
      ip_order_dispatch: {
        Args: {
          p_batch_number?: string | null
          p_expiry_date?: string | null
          p_inventory_trace_id?: string | null
          p_item_id: string
          p_lot_number?: string | null
          p_quantity: number
          p_serial_number?: string | null
          p_source_lot_id: string
          p_study_id: string
          p_study_site_id: string
        }
        Returns: string
      }
      ip_receive_at_site: {
        Args: {
          p_lot_id: string
          p_notes?: string | null
          p_quantity: number
          p_received_at?: string | null
          p_serial_number?: string | null
          p_study_id: string
          p_study_site_id: string
          /** When true, ledger row is excluded from operator "Received" metrics (automated ship→receive). */
          p_system_fulfillment?: boolean
        }
        Returns: undefined
      }
      ip_reconciliation_flags: {
        Args: { p_study_id: string; p_study_site_id?: string }
        Returns: {
          flag_quantity_mismatch: boolean
          flag_unverified_used: boolean
          item_id: string
          location_id: string
          lot_id: string
        }[]
      }
      ip_resolve_caller_profile_id: { Args: never; Returns: string }
      ip_return_to_global: {
        Args: {
          p_container_fill_state?: string | null
          p_lot_id: string
          p_notes?: string | null
          p_quantity: number
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_restore_item: {
        Args: { p_item_id: string }
        Returns: undefined
      }
      ip_restore_item_site_link: {
        Args: { p_item_id: string; p_study_id: string; p_study_site_id: string }
        Returns: undefined
      }
      ip_set_site_lot_serial: {
        Args: {
          p_lot_id: string
          p_serial_number: string
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_ship_to_site: {
        Args: {
          p_lot_id: string
          p_quantity: number
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_transfer_site: {
        Args: {
          p_from_site_id: string
          p_lot_id: string
          p_quantity: number
          p_study_id: string
          p_to_site_id: string
        }
        Returns: undefined
      }
      ip_unreceive_at_site: {
        Args: {
          p_lot_id: string
          p_quantity: number
          p_reason?: string | null
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_update_item: {
        Args: {
          p_category?: string
          p_item_id: string
          p_metadata?: Json
          p_name?: string
          p_part_or_material_number?: string
          p_unit?: string
        }
        Returns: undefined
      }
      ip_update_lot_location_notes: {
        Args: { p_location_id: string; p_notes: string }
        Returns: undefined
      }
      ip_verify_lot: {
        Args: {
          p_comment?: string | null
          p_lot_id: string
          p_study_id: string
          p_study_site_id: string
          p_used_at?: string | null
        }
        Returns: undefined
      }
      merge_mvrg_cvorres_fields: { Args: { jsonb_data: Json }; Returns: Json }
      normalize_mc_extra_fields: { Args: { extra_fields: Json }; Returns: Json }
      normalize_mc_field_name: { Args: { field_name: string }; Returns: string }
      normalize_sdv_field_name: {
        Args: { field_name: string }
        Returns: string
      }
      platform_business_analytics: { Args: { p_days?: number }; Returns: Json }
      platform_create_custom_tracker_definition: {
        Args: {
          p_company_id: string
          p_description?: string
          p_entity_type?: string
          p_icon?: string
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      platform_list_custom_tracker_definitions: {
        Args: never
        Returns: {
          active: boolean
          company_id: string
          company_name: string
          id: string
          name: string
          platform_access_enabled: boolean
          slug: string
          updated_at: string
        }[]
      }
      refresh_sdv_merged_view: { Args: never; Returns: undefined }
      set_company_module_access: {
        Args: {
          p_company_id: string
          p_has_ctms_access: boolean
          p_has_etmf_access: boolean
          p_has_tracker_access: boolean
          p_has_eisf_access: boolean
        }
        Returns: undefined
      }
      eisf_get_dashboard_stats: {
        Args: { p_study_id?: string | null }
        Returns: Json
      }
      set_company_study_tracker_keys: {
        Args: { p_company_id: string; p_keys: string[] }
        Returns: undefined
      }
      set_tracker_platform_access: {
        Args: { p_enabled: boolean; p_tracker_definition_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type:
        | "irb"
        | "central_irb"
        | "cro"
        | "regional_cro"
        | "laboratory"
        | "central_laboratory"
        | "vendor"
        | "pharmacy"
        | "imaging_center"
      action_item_priority: "low" | "medium" | "high" | "critical"
      action_item_source_type:
        | "trip_report"
        | "monitoring"
        | "general"
        | "irb"
        | "vendor"
        | "kri"
      action_item_status: "open" | "in_progress" | "resolved" | "closed"
      activity_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "skipped"
        | "not_applicable"
      activity_type:
        | "created"
        | "updated"
        | "deleted"
        | "status_changed"
        | "type_changed"
      address_type: "primary" | "mailing" | "billing" | "shipping" | "other"
      capa_status:
        | "planned"
        | "in_progress"
        | "completed"
        | "verified_effective"
        | "verified_ineffective"
        | "closed"
      capa_type: "corrective" | "preventive"
      contact_project_role:
        | "principal_investigator"
        | "sub_investigator"
        | "coordinator"
        | "medical_monitor"
        | "project_manager"
        | "data_manager"
        | "regulatory_lead"
        | "qa_lead"
        | "other"
      contact_role:
        | "principal_investigator"
        | "sub_investigator"
        | "coordinator"
        | "site_staff"
        | "sponsor_rep"
        | "cro_rep"
        | "regulatory"
        | "lab_director"
        | "qa_lead"
        | "project_manager"
        | "data_manager"
        | "finance"
        | "contracts"
        | "other"
        | "co_principal_investigator"
        | "lead_research_coordinator"
        | "research_coordinator"
        | "research_director"
        | "pharmacist"
        | "clinical_research_associate"
      contact_type:
        | "investigator"
        | "site_staff"
        | "sponsor_rep"
        | "cro_rep"
        | "monitor"
        | "data_manager"
        | "regulatory"
        | "pharmacist"
        | "other"
      custom_field_type:
        | "text"
        | "number"
        | "date"
        | "select"
        | "multiselect"
        | "boolean"
        | "url"
      dependency_type:
        | "finish_to_start"
        | "start_to_start"
        | "finish_to_finish"
        | "start_to_finish"
      deviation_severity: "minor" | "major" | "critical"
      deviation_status:
        | "open"
        | "investigating"
        | "capa_required"
        | "capa_in_progress"
        | "closed"
      engagement_activity_type:
        | "reminder"
        | "follow_up"
        | "travel_support"
        | "incentive"
        | "wellness_check"
        | "reschedule"
        | "other"
      engagement_channel: "phone" | "email" | "sms" | "in_person" | "portal"
      engagement_outcome:
        | "successful"
        | "no_answer"
        | "rescheduled"
        | "declined"
        | "not_applicable"
      entity_status: "active" | "inactive" | "pending"
      feasibility_criteria_category:
        | "therapeutic_experience"
        | "patient_population"
        | "regulatory"
        | "infrastructure"
        | "investigator"
        | "logistics"
      feasibility_evaluation_status:
        | "pending"
        | "in_progress"
        | "scored"
        | "selected"
        | "rejected"
      feasibility_study_status:
        | "draft"
        | "in_progress"
        | "completed"
        | "archived"
      financial_export_format: "csv" | "xlsx" | "json"
      financial_export_status: "pending" | "generating" | "completed" | "failed"
      integration_status: "active" | "inactive" | "error"
      integration_type: "edc" | "safety" | "finance" | "irt"
      irb_continuing_review_status:
        | "pending"
        | "submitted"
        | "approved"
        | "lapsed"
      irb_submission_status:
        | "submitted"
        | "under_review"
        | "approved"
        | "approved_with_conditions"
        | "disapproved"
        | "withdrawn"
      irb_submission_type:
        | "initial"
        | "amendment"
        | "continuing_review"
        | "safety_report"
        | "closure"
      kri_alert_level: "yellow" | "red"
      kri_category:
        | "enrollment"
        | "safety"
        | "data_quality"
        | "site_performance"
        | "regulatory"
        | "financial"
      kri_direction: "higher_is_better" | "lower_is_better"
      milestone_status:
        | "pending"
        | "on_track"
        | "at_risk"
        | "delayed"
        | "completed"
      milestone_type:
        | "regulatory"
        | "enrollment"
        | "data"
        | "reporting"
        | "closeout"
      organization_project_role:
        | "sponsor"
        | "site"
        | "cro"
        | "lab"
        | "vendor"
        | "irb"
        | "regulatory"
      organization_type:
        | "site"
        | "sponsor"
        | "cro"
        | "vendor"
        | "lab"
        | "irb"
        | "regulatory"
      portfolio_health: "on_track" | "at_risk" | "critical"
      protocol_activity_status:
        | "planned"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "on_hold"
      protocol_design:
        | "randomized"
        | "open_label"
        | "double_blind"
        | "single_blind"
        | "crossover"
        | "parallel"
        | "observational"
      protocol_governance_role:
        | "medical_monitor"
        | "safety_officer"
        | "project_lead"
        | "data_manager"
        | "statistician"
      protocol_phase:
        | "phase_i"
        | "phase_ii"
        | "phase_iii"
        | "phase_iv"
        | "observational"
        | "early_feasibility_study"
        | "first_in_human"
        | "pilot_stage"
        | "pivotal"
        | "post_market"
      protocol_status:
        | "planned"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "terminated"
      randomization_list_status: "draft" | "active" | "locked" | "archived"
      randomization_method: "simple" | "block" | "stratified" | "adaptive"
      resource_assignment_status: "active" | "planned" | "completed"
      retention_status:
        | "on_track"
        | "at_risk"
        | "missed"
        | "completed"
        | "withdrawn"
      risk_category:
        | "quality"
        | "safety"
        | "regulatory"
        | "operational"
        | "financial"
        | "data_integrity"
        | "compliance"
        | "ethics"
      risk_severity: "low" | "medium" | "high"
      safety_event_type: "sae" | "susar" | "aesi"
      safety_reporting_status: "draft" | "submitted" | "acknowledged" | "closed"
      scorecard_criterion_category:
        | "enrollment"
        | "data_quality"
        | "compliance"
        | "safety"
        | "operational"
      shipment_status: "pending" | "in_transit" | "delivered" | "confirmed"
      site_selection_decision: "selected" | "backup" | "rejected" | "deferred"
      site_status:
        | "planned"
        | "not_initiated"
        | "initiated"
        | "enrolling"
        | "closed"
        | "terminated"
      startup_checklist_status: "not_started" | "in_progress" | "completed"
      startup_step_category:
        | "feasibility"
        | "regulatory"
        | "irb"
        | "contract"
        | "siv"
        | "other"
      startup_step_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "blocked"
        | "not_applicable"
      subject_status:
        | "screening"
        | "enrolled"
        | "completed"
        | "terminated"
        | "screen_failure"
      supply_item_status:
        | "available"
        | "reserved"
        | "dispensed"
        | "expired"
        | "returned"
        | "destroyed"
      sync_status: "pending" | "running" | "completed" | "failed"
      sync_type: "manual" | "scheduled"
      team_role:
        | "study_manager"
        | "clinical_director"
        | "cra"
        | "data_manager"
        | "medical_monitor"
        | "regulatory_specialist"
        | "quality_assurance"
        | "biostatistician"
        | "pharmacovigilance"
        | "site_coordinator"
      vendor_category:
        | "cro"
        | "lab"
        | "logistics"
        | "technology"
        | "consulting"
        | "other"
      vendor_contract_status: "draft" | "active" | "expired" | "terminated"
      vendor_deliverable_status:
        | "pending"
        | "in_progress"
        | "delivered"
        | "accepted"
        | "rejected"
      vendor_kpi_status: "on_track" | "at_risk" | "behind"
      visit_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "missed"
        | "cancelled"
      visit_type:
        | "screening"
        | "baseline"
        | "treatment"
        | "follow_up"
        | "early_termination"
        | "unscheduled"
      workflow_action_type:
        | "send_notification"
        | "create_action_item"
        | "update_field"
        | "send_email"
        | "assign_task"
      workflow_trigger_type:
        | "record_created"
        | "record_updated"
        | "status_changed"
        | "date_reached"
        | "manual"
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
    Enums: {
      account_type: [
        "irb",
        "central_irb",
        "cro",
        "regional_cro",
        "laboratory",
        "central_laboratory",
        "vendor",
        "pharmacy",
        "imaging_center",
      ],
      action_item_priority: ["low", "medium", "high", "critical"],
      action_item_source_type: [
        "trip_report",
        "monitoring",
        "general",
        "irb",
        "vendor",
        "kri",
      ],
      action_item_status: ["open", "in_progress", "resolved", "closed"],
      activity_status: [
        "pending",
        "in_progress",
        "completed",
        "skipped",
        "not_applicable",
      ],
      activity_type: [
        "created",
        "updated",
        "deleted",
        "status_changed",
        "type_changed",
      ],
      address_type: ["primary", "mailing", "billing", "shipping", "other"],
      capa_status: [
        "planned",
        "in_progress",
        "completed",
        "verified_effective",
        "verified_ineffective",
        "closed",
      ],
      capa_type: ["corrective", "preventive"],
      contact_project_role: [
        "principal_investigator",
        "sub_investigator",
        "coordinator",
        "medical_monitor",
        "project_manager",
        "data_manager",
        "regulatory_lead",
        "qa_lead",
        "other",
      ],
      contact_role: [
        "principal_investigator",
        "sub_investigator",
        "coordinator",
        "site_staff",
        "sponsor_rep",
        "cro_rep",
        "regulatory",
        "lab_director",
        "qa_lead",
        "project_manager",
        "data_manager",
        "finance",
        "contracts",
        "other",
        "co_principal_investigator",
        "lead_research_coordinator",
        "research_coordinator",
        "research_director",
        "pharmacist",
        "clinical_research_associate",
      ],
      contact_type: [
        "investigator",
        "site_staff",
        "sponsor_rep",
        "cro_rep",
        "monitor",
        "data_manager",
        "regulatory",
        "pharmacist",
        "other",
      ],
      custom_field_type: [
        "text",
        "number",
        "date",
        "select",
        "multiselect",
        "boolean",
        "url",
      ],
      dependency_type: [
        "finish_to_start",
        "start_to_start",
        "finish_to_finish",
        "start_to_finish",
      ],
      deviation_severity: ["minor", "major", "critical"],
      deviation_status: [
        "open",
        "investigating",
        "capa_required",
        "capa_in_progress",
        "closed",
      ],
      engagement_activity_type: [
        "reminder",
        "follow_up",
        "travel_support",
        "incentive",
        "wellness_check",
        "reschedule",
        "other",
      ],
      engagement_channel: ["phone", "email", "sms", "in_person", "portal"],
      engagement_outcome: [
        "successful",
        "no_answer",
        "rescheduled",
        "declined",
        "not_applicable",
      ],
      entity_status: ["active", "inactive", "pending"],
      feasibility_criteria_category: [
        "therapeutic_experience",
        "patient_population",
        "regulatory",
        "infrastructure",
        "investigator",
        "logistics",
      ],
      feasibility_evaluation_status: [
        "pending",
        "in_progress",
        "scored",
        "selected",
        "rejected",
      ],
      feasibility_study_status: [
        "draft",
        "in_progress",
        "completed",
        "archived",
      ],
      financial_export_format: ["csv", "xlsx", "json"],
      financial_export_status: ["pending", "generating", "completed", "failed"],
      integration_status: ["active", "inactive", "error"],
      integration_type: ["edc", "safety", "finance", "irt"],
      irb_continuing_review_status: [
        "pending",
        "submitted",
        "approved",
        "lapsed",
      ],
      irb_submission_status: [
        "submitted",
        "under_review",
        "approved",
        "approved_with_conditions",
        "disapproved",
        "withdrawn",
      ],
      irb_submission_type: [
        "initial",
        "amendment",
        "continuing_review",
        "safety_report",
        "closure",
      ],
      kri_alert_level: ["yellow", "red"],
      kri_category: [
        "enrollment",
        "safety",
        "data_quality",
        "site_performance",
        "regulatory",
        "financial",
      ],
      kri_direction: ["higher_is_better", "lower_is_better"],
      milestone_status: [
        "pending",
        "on_track",
        "at_risk",
        "delayed",
        "completed",
      ],
      milestone_type: [
        "regulatory",
        "enrollment",
        "data",
        "reporting",
        "closeout",
      ],
      organization_project_role: [
        "sponsor",
        "site",
        "cro",
        "lab",
        "vendor",
        "irb",
        "regulatory",
      ],
      organization_type: [
        "site",
        "sponsor",
        "cro",
        "vendor",
        "lab",
        "irb",
        "regulatory",
      ],
      portfolio_health: ["on_track", "at_risk", "critical"],
      protocol_activity_status: [
        "planned",
        "in_progress",
        "completed",
        "cancelled",
        "on_hold",
      ],
      protocol_design: [
        "randomized",
        "open_label",
        "double_blind",
        "single_blind",
        "crossover",
        "parallel",
        "observational",
      ],
      protocol_governance_role: [
        "medical_monitor",
        "safety_officer",
        "project_lead",
        "data_manager",
        "statistician",
      ],
      protocol_phase: [
        "phase_i",
        "phase_ii",
        "phase_iii",
        "phase_iv",
        "observational",
        "early_feasibility_study",
        "first_in_human",
        "pilot_stage",
        "pivotal",
        "post_market",
      ],
      protocol_status: [
        "planned",
        "in_progress",
        "on_hold",
        "completed",
        "terminated",
      ],
      randomization_list_status: ["draft", "active", "locked", "archived"],
      randomization_method: ["simple", "block", "stratified", "adaptive"],
      resource_assignment_status: ["active", "planned", "completed"],
      retention_status: [
        "on_track",
        "at_risk",
        "missed",
        "completed",
        "withdrawn",
      ],
      risk_category: [
        "quality",
        "safety",
        "regulatory",
        "operational",
        "financial",
        "data_integrity",
        "compliance",
        "ethics",
      ],
      risk_severity: ["low", "medium", "high"],
      safety_event_type: ["sae", "susar", "aesi"],
      safety_reporting_status: ["draft", "submitted", "acknowledged", "closed"],
      scorecard_criterion_category: [
        "enrollment",
        "data_quality",
        "compliance",
        "safety",
        "operational",
      ],
      shipment_status: ["pending", "in_transit", "delivered", "confirmed"],
      site_selection_decision: ["selected", "backup", "rejected", "deferred"],
      site_status: [
        "planned",
        "not_initiated",
        "initiated",
        "enrolling",
        "closed",
        "terminated",
      ],
      startup_checklist_status: ["not_started", "in_progress", "completed"],
      startup_step_category: [
        "feasibility",
        "regulatory",
        "irb",
        "contract",
        "siv",
        "other",
      ],
      startup_step_status: [
        "pending",
        "in_progress",
        "completed",
        "blocked",
        "not_applicable",
      ],
      subject_status: [
        "screening",
        "enrolled",
        "completed",
        "terminated",
        "screen_failure",
      ],
      supply_item_status: [
        "available",
        "reserved",
        "dispensed",
        "expired",
        "returned",
        "destroyed",
      ],
      sync_status: ["pending", "running", "completed", "failed"],
      sync_type: ["manual", "scheduled"],
      team_role: [
        "study_manager",
        "clinical_director",
        "cra",
        "data_manager",
        "medical_monitor",
        "regulatory_specialist",
        "quality_assurance",
        "biostatistician",
        "pharmacovigilance",
        "site_coordinator",
      ],
      vendor_category: [
        "cro",
        "lab",
        "logistics",
        "technology",
        "consulting",
        "other",
      ],
      vendor_contract_status: ["draft", "active", "expired", "terminated"],
      vendor_deliverable_status: [
        "pending",
        "in_progress",
        "delivered",
        "accepted",
        "rejected",
      ],
      vendor_kpi_status: ["on_track", "at_risk", "behind"],
      visit_status: [
        "scheduled",
        "in_progress",
        "completed",
        "missed",
        "cancelled",
      ],
      visit_type: [
        "screening",
        "baseline",
        "treatment",
        "follow_up",
        "early_termination",
        "unscheduled",
      ],
      workflow_action_type: [
        "send_notification",
        "create_action_item",
        "update_field",
        "send_email",
        "assign_task",
      ],
      workflow_trigger_type: [
        "record_created",
        "record_updated",
        "status_changed",
        "date_reached",
        "manual",
      ],
    },
  },
} as const
