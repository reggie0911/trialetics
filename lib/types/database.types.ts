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
  public: {
    Tables: {
      action_items: {
        Row: {
          assigned_by_id: string | null
          assigned_to_id: string | null
          category: string | null
          company_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          escalated: boolean | null
          escalated_at: string | null
          id: string
          priority: Database["public"]["Enums"]["action_item_priority"]
          protocol_id: string | null
          resolution_notes: string | null
          resolved_date: string | null
          source_id: string | null
          source_type: Database["public"]["Enums"]["action_item_source_type"]
          status: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by_id?: string | null
          assigned_to_id?: string | null
          category?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          escalated?: boolean | null
          escalated_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["action_item_priority"]
          protocol_id?: string | null
          resolution_notes?: string | null
          resolved_date?: string | null
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["action_item_source_type"]
          status?: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by_id?: string | null
          assigned_to_id?: string | null
          category?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          escalated?: boolean | null
          escalated_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["action_item_priority"]
          protocol_id?: string | null
          resolution_notes?: string | null
          resolved_date?: string | null
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["action_item_source_type"]
          status?: Database["public"]["Enums"]["action_item_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_items_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "action_items_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "action_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "action_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "action_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      activity_dependencies: {
        Row: {
          company_id: string
          created_at: string | null
          dependency_type: Database["public"]["Enums"]["dependency_type"]
          id: string
          lag_days: number | null
          predecessor_id: string
          successor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dependency_type?: Database["public"]["Enums"]["dependency_type"]
          id?: string
          lag_days?: number | null
          predecessor_id: string
          successor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dependency_type?: Database["public"]["Enums"]["dependency_type"]
          id?: string
          lag_days?: number | null
          predecessor_id?: string
          successor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_dependencies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_dependencies_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "protocol_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_dependencies_successor_id_fkey"
            columns: ["successor_id"]
            isOneToOne: false
            referencedRelation: "protocol_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          address_type: Database["public"]["Enums"]["address_type"]
          city: string | null
          country: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_primary: boolean | null
          postal_code: string | null
          state: string | null
          street_1: string | null
          street_2: string | null
          updated_at: string | null
        }
        Insert: {
          address_type?: Database["public"]["Enums"]["address_type"]
          city?: string | null
          country?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_primary?: boolean | null
          postal_code?: string | null
          state?: string | null
          street_1?: string | null
          street_2?: string | null
          updated_at?: string | null
        }
        Update: {
          address_type?: Database["public"]["Enums"]["address_type"]
          city?: string | null
          country?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_primary?: boolean | null
          postal_code?: string | null
          state?: string | null
          street_1?: string | null
          street_2?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
            foreignKeyName: "ae_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "ae_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "ae_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
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
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          budgeted_amount: number
          category: string
          company_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          protocol_id: string
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          budgeted_amount?: number
          category: string
          company_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          protocol_id: string
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          budgeted_amount?: number
          category?: string
          company_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          protocol_id?: string
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "budget_line_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "budget_line_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      clinical_programs: {
        Row: {
          application_id: string | null
          company_id: string
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          description: string | null
          id: string
          mechanism: string | null
          metadata: Json | null
          name: string
          status: Database["public"]["Enums"]["protocol_status"]
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          mechanism?: string | null
          metadata?: Json | null
          name: string
          status?: Database["public"]["Enums"]["protocol_status"]
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          mechanism?: string | null
          metadata?: Json | null
          name?: string
          status?: Database["public"]["Enums"]["protocol_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_programs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_programs_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_programs_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      clinical_protocols: {
        Row: {
          actual_cost: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          approval_date: string | null
          budgeted_cost: number | null
          company_id: string
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          currency_code: string | null
          design: Database["public"]["Enums"]["protocol_design"] | null
          exchange_date: string | null
          id: string
          metadata: Json | null
          objective: string | null
          phase: Database["public"]["Enums"]["protocol_phase"] | null
          planned_end_date: string | null
          planned_sites_count: number | null
          planned_start_date: string | null
          planned_subjects_count: number | null
          program_id: string | null
          protocol_number: string
          psdv_initial_subjects_count: number | null
          psdv_subject_auto_select_rate: number | null
          rate_list_id: string | null
          regions_required: boolean | null
          revenue: number | null
          sponsor: string | null
          status: Database["public"]["Enums"]["protocol_status"]
          title: string
          type: string | null
          updated_at: string | null
          withholding_amount: number | null
          withholding_percent: number | null
        }
        Insert: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          approval_date?: string | null
          budgeted_cost?: number | null
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          currency_code?: string | null
          design?: Database["public"]["Enums"]["protocol_design"] | null
          exchange_date?: string | null
          id?: string
          metadata?: Json | null
          objective?: string | null
          phase?: Database["public"]["Enums"]["protocol_phase"] | null
          planned_end_date?: string | null
          planned_sites_count?: number | null
          planned_start_date?: string | null
          planned_subjects_count?: number | null
          program_id?: string | null
          protocol_number: string
          psdv_initial_subjects_count?: number | null
          psdv_subject_auto_select_rate?: number | null
          rate_list_id?: string | null
          regions_required?: boolean | null
          revenue?: number | null
          sponsor?: string | null
          status?: Database["public"]["Enums"]["protocol_status"]
          title: string
          type?: string | null
          updated_at?: string | null
          withholding_amount?: number | null
          withholding_percent?: number | null
        }
        Update: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          approval_date?: string | null
          budgeted_cost?: number | null
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          currency_code?: string | null
          design?: Database["public"]["Enums"]["protocol_design"] | null
          exchange_date?: string | null
          id?: string
          metadata?: Json | null
          objective?: string | null
          phase?: Database["public"]["Enums"]["protocol_phase"] | null
          planned_end_date?: string | null
          planned_sites_count?: number | null
          planned_start_date?: string | null
          planned_subjects_count?: number | null
          program_id?: string | null
          protocol_number?: string
          psdv_initial_subjects_count?: number | null
          psdv_subject_auto_select_rate?: number | null
          rate_list_id?: string | null
          regions_required?: boolean | null
          revenue?: number | null
          sponsor?: string | null
          status?: Database["public"]["Enums"]["protocol_status"]
          title?: string
          type?: string | null
          updated_at?: string | null
          withholding_amount?: number | null
          withholding_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_protocols_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_protocols_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_protocols_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "clinical_protocols_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "clinical_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_protocols_rate_list_id_fkey"
            columns: ["rate_list_id"]
            isOneToOne: false
            referencedRelation: "rate_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_regions: {
        Row: {
          company_id: string
          created_at: string | null
          currency_code: string | null
          exchange_date: string | null
          id: string
          metadata: Json | null
          no_site_info: boolean | null
          planned_sites_count: number | null
          planned_subjects_count: number | null
          protocol_id: string
          psdv_initial_subjects_count: number | null
          psdv_subject_auto_select_rate: number | null
          region_name: string
          updated_at: string | null
          withholding_amount: number | null
          withholding_percent: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          currency_code?: string | null
          exchange_date?: string | null
          id?: string
          metadata?: Json | null
          no_site_info?: boolean | null
          planned_sites_count?: number | null
          planned_subjects_count?: number | null
          protocol_id: string
          psdv_initial_subjects_count?: number | null
          psdv_subject_auto_select_rate?: number | null
          region_name: string
          updated_at?: string | null
          withholding_amount?: number | null
          withholding_percent?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          currency_code?: string | null
          exchange_date?: string | null
          id?: string
          metadata?: Json | null
          no_site_info?: boolean | null
          planned_sites_count?: number | null
          planned_subjects_count?: number | null
          protocol_id?: string
          psdv_initial_subjects_count?: number | null
          psdv_subject_auto_select_rate?: number | null
          region_name?: string
          updated_at?: string | null
          withholding_amount?: number | null
          withholding_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_regions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_regions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_regions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "clinical_regions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "clinical_regions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      clinical_sites: {
        Row: {
          close_out_date: string | null
          company_id: string
          completed_subject_count: number | null
          created_at: string | null
          currency_code: string | null
          early_terminated_count: number | null
          enrolled_subject_count: number | null
          exchange_date: string | null
          first_subject_enrolled_date: string | null
          id: string
          irb_approval_date: string | null
          irb_approval_number: string | null
          irb_expiration_date: string | null
          irb_institution_name: string | null
          last_completed_visit_date: string | null
          last_subject_enrolled_date: string | null
          metadata: Json | null
          no_subject_info: boolean | null
          organization_id: string | null
          planned_subject_count: number | null
          principal_investigator_id: string | null
          protocol_id: string
          psdv_initial_subjects_count: number | null
          psdv_subject_auto_select_rate: number | null
          region_id: string | null
          screen_failure_count: number | null
          sdv_policy: string | null
          site_initiated_date: string | null
          site_number: string | null
          site_qualification_date: string | null
          site_terminated_date: string | null
          status: Database["public"]["Enums"]["site_status"]
          total_subjects_requiring_sdv: number | null
          updated_at: string | null
          use_cdms_auto_select_rule: boolean | null
          withholding_amount: number | null
          withholding_percent: number | null
        }
        Insert: {
          close_out_date?: string | null
          company_id: string
          completed_subject_count?: number | null
          created_at?: string | null
          currency_code?: string | null
          early_terminated_count?: number | null
          enrolled_subject_count?: number | null
          exchange_date?: string | null
          first_subject_enrolled_date?: string | null
          id?: string
          irb_approval_date?: string | null
          irb_approval_number?: string | null
          irb_expiration_date?: string | null
          irb_institution_name?: string | null
          last_completed_visit_date?: string | null
          last_subject_enrolled_date?: string | null
          metadata?: Json | null
          no_subject_info?: boolean | null
          organization_id?: string | null
          planned_subject_count?: number | null
          principal_investigator_id?: string | null
          protocol_id: string
          psdv_initial_subjects_count?: number | null
          psdv_subject_auto_select_rate?: number | null
          region_id?: string | null
          screen_failure_count?: number | null
          sdv_policy?: string | null
          site_initiated_date?: string | null
          site_number?: string | null
          site_qualification_date?: string | null
          site_terminated_date?: string | null
          status?: Database["public"]["Enums"]["site_status"]
          total_subjects_requiring_sdv?: number | null
          updated_at?: string | null
          use_cdms_auto_select_rule?: boolean | null
          withholding_amount?: number | null
          withholding_percent?: number | null
        }
        Update: {
          close_out_date?: string | null
          company_id?: string
          completed_subject_count?: number | null
          created_at?: string | null
          currency_code?: string | null
          early_terminated_count?: number | null
          enrolled_subject_count?: number | null
          exchange_date?: string | null
          first_subject_enrolled_date?: string | null
          id?: string
          irb_approval_date?: string | null
          irb_approval_number?: string | null
          irb_expiration_date?: string | null
          irb_institution_name?: string | null
          last_completed_visit_date?: string | null
          last_subject_enrolled_date?: string | null
          metadata?: Json | null
          no_subject_info?: boolean | null
          organization_id?: string | null
          planned_subject_count?: number | null
          principal_investigator_id?: string | null
          protocol_id?: string
          psdv_initial_subjects_count?: number | null
          psdv_subject_auto_select_rate?: number | null
          region_id?: string | null
          screen_failure_count?: number | null
          sdv_policy?: string | null
          site_initiated_date?: string | null
          site_number?: string | null
          site_qualification_date?: string | null
          site_terminated_date?: string | null
          status?: Database["public"]["Enums"]["site_status"]
          total_subjects_requiring_sdv?: number | null
          updated_at?: string | null
          use_cdms_auto_select_rule?: boolean | null
          withholding_amount?: number | null
          withholding_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_sites_principal_investigator_id_fkey"
            columns: ["principal_investigator_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_sites_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_sites_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "clinical_sites_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "clinical_sites_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "clinical_sites_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "clinical_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_sites_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_training_summary"
            referencedColumns: ["region_id"]
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
          has_ctms_access: boolean
          has_etmf_access: boolean
          has_tracker_access: boolean
          enabled_study_tracker_keys: string[]
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
          has_ctms_access?: boolean
          has_etmf_access?: boolean
          has_tracker_access?: boolean
          enabled_study_tracker_keys?: string[]
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
          has_ctms_access?: boolean
          has_etmf_access?: boolean
          has_tracker_access?: boolean
          enabled_study_tracker_keys?: string[]
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
          {
            foreignKeyName: "fk_companies_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
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
      contact_activity: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          changed_fields: Json | null
          contact_id: string
          created_at: string | null
          description: string
          id: string
          performed_by_id: string | null
          performer_email: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          changed_fields?: Json | null
          contact_id: string
          created_at?: string | null
          description: string
          id?: string
          performed_by_id?: string | null
          performer_email?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          changed_fields?: Json | null
          contact_id?: string
          created_at?: string | null
          description?: string
          id?: string
          performed_by_id?: string | null
          performer_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_activity_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activity_performed_by_id_fkey"
            columns: ["performed_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activity_performed_by_id_fkey"
            columns: ["performed_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      contact_protocols: {
        Row: {
          contact_id: string
          created_at: string | null
          end_date: string | null
          id: string
          organization_id: string | null
          protocol_id: string
          role: Database["public"]["Enums"]["contact_project_role"]
          start_date: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string | null
          protocol_id: string
          role: Database["public"]["Enums"]["contact_project_role"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string | null
          protocol_id?: string
          role?: Database["public"]["Enums"]["contact_project_role"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_protocols_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_protocols_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "contact_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "contact_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      contact_training_completion: {
        Row: {
          comments: string | null
          completed: boolean | null
          completed_date: string | null
          created_at: string | null
          id: string
          protocol_contact_id: string
          site_training_topic_id: string
          updated_at: string | null
        }
        Insert: {
          comments?: string | null
          completed?: boolean | null
          completed_date?: string | null
          created_at?: string | null
          id?: string
          protocol_contact_id: string
          site_training_topic_id: string
          updated_at?: string | null
        }
        Update: {
          comments?: string | null
          completed?: boolean | null
          completed_date?: string | null
          created_at?: string | null
          id?: string
          protocol_contact_id?: string
          site_training_topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_training_completion_protocol_contact_id_fkey"
            columns: ["protocol_contact_id"]
            isOneToOne: false
            referencedRelation: "protocol_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_training_completion_site_training_topic_id_fkey"
            columns: ["site_training_topic_id"]
            isOneToOne: false
            referencedRelation: "site_training_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          credentials: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          license_number: string | null
          manager_id: string | null
          metadata: Json | null
          notes: string | null
          phone: string | null
          primary_specialty: string | null
          profile_image_url: string | null
          status: Database["public"]["Enums"]["entity_status"]
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          credentials?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          license_number?: string | null
          manager_id?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          primary_specialty?: string | null
          profile_image_url?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          credentials?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          license_number?: string | null
          manager_id?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          primary_specialty?: string | null
          profile_image_url?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "contacts_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crf_tracking: {
        Row: {
          charts_reviewed_date: string | null
          company_id: string
          created_at: string | null
          forms_signed_date: string | null
          id: string
          page_numbers_to_verify: string | null
          page_numbers_verified: string | null
          retrieved: boolean | null
          sdv_required: boolean | null
          site_visit_id: string
          source_verified: boolean | null
          subject_visit_id: string
          updated_at: string | null
        }
        Insert: {
          charts_reviewed_date?: string | null
          company_id: string
          created_at?: string | null
          forms_signed_date?: string | null
          id?: string
          page_numbers_to_verify?: string | null
          page_numbers_verified?: string | null
          retrieved?: boolean | null
          sdv_required?: boolean | null
          site_visit_id: string
          source_verified?: boolean | null
          subject_visit_id: string
          updated_at?: string | null
        }
        Update: {
          charts_reviewed_date?: string | null
          company_id?: string
          created_at?: string | null
          forms_signed_date?: string | null
          id?: string
          page_numbers_to_verify?: string | null
          page_numbers_verified?: string | null
          retrieved?: boolean | null
          sdv_required?: boolean | null
          site_visit_id?: string
          source_verified?: boolean | null
          subject_visit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crf_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crf_tracking_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crf_tracking_subject_visit_id_fkey"
            columns: ["subject_visit_id"]
            isOneToOne: false
            referencedRelation: "subject_visits"
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
      document_column_configs: {
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
            foreignKeyName: "document_column_configs_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "document_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      document_header_mappings: {
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
            foreignKeyName: "document_header_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_records: {
        Row: {
          approval_date: string | null
          approved_by: string | null
          created_at: string
          document_category: string | null
          document_name: string | null
          document_type: string | null
          expiration_date: string | null
          extra_fields: Json | null
          file_size: number | null
          file_url: string | null
          id: string
          project_id: string | null
          site_name: string | null
          status: string | null
          upload_date: string | null
          upload_id: string
          version: string | null
        }
        Insert: {
          approval_date?: string | null
          approved_by?: string | null
          created_at?: string
          document_category?: string | null
          document_name?: string | null
          document_type?: string | null
          expiration_date?: string | null
          extra_fields?: Json | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          site_name?: string | null
          status?: string | null
          upload_date?: string | null
          upload_id: string
          version?: string | null
        }
        Update: {
          approval_date?: string | null
          approved_by?: string | null
          created_at?: string
          document_category?: string | null
          document_name?: string | null
          document_type?: string | null
          expiration_date?: string | null
          extra_fields?: Json | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          site_name?: string | null
          status?: string | null
          upload_date?: string | null
          upload_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "document_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          artifact_name: string
          artifact_number: string | null
          company_id: string | null
          core_or_recommended: string | null
          created_at: string
          dating_convention: string | null
          definition_purpose: string | null
          extra_data: Json | null
          ich_code: string | null
          id: string
          recommended_sub_artifacts: string | null
          reference_tmf_template: string | null
          reference_tmf_template_id: string | null
          section_name: string
          section_number: string | null
          updated_at: string
          zone_name: string
          zone_number: string | null
        }
        Insert: {
          artifact_name: string
          artifact_number?: string | null
          company_id?: string | null
          core_or_recommended?: string | null
          created_at?: string
          dating_convention?: string | null
          definition_purpose?: string | null
          extra_data?: Json | null
          ich_code?: string | null
          id?: string
          recommended_sub_artifacts?: string | null
          reference_tmf_template?: string | null
          reference_tmf_template_id?: string | null
          section_name: string
          section_number?: string | null
          updated_at?: string
          zone_name: string
          zone_number?: string | null
        }
        Update: {
          artifact_name?: string
          artifact_number?: string | null
          company_id?: string | null
          core_or_recommended?: string | null
          created_at?: string
          dating_convention?: string | null
          definition_purpose?: string | null
          extra_data?: Json | null
          ich_code?: string | null
          id?: string
          recommended_sub_artifacts?: string | null
          reference_tmf_template?: string | null
          reference_tmf_template_id?: string | null
          section_name?: string
          section_number?: string | null
          updated_at?: string
          zone_name?: string
          zone_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_uploads: {
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
            foreignKeyName: "document_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
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
            foreignKeyName: "ecrf_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecrf_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "ecrf_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "ecrf_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "ecrf_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecrf_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      enrollment_projections: {
        Row: {
          assumptions: Json | null
          company_id: string
          created_at: string | null
          id: string
          method: string
          projected_by_id: string | null
          projection_date: string
          projection_name: string | null
          protocol_id: string
          site_projections: Json | null
          total_projected_count: number | null
          total_projected_date: string | null
          updated_at: string | null
        }
        Insert: {
          assumptions?: Json | null
          company_id: string
          created_at?: string | null
          id?: string
          method: string
          projected_by_id?: string | null
          projection_date: string
          projection_name?: string | null
          protocol_id: string
          site_projections?: Json | null
          total_projected_count?: number | null
          total_projected_date?: string | null
          updated_at?: string | null
        }
        Update: {
          assumptions?: Json | null
          company_id?: string
          created_at?: string | null
          id?: string
          method?: string
          projected_by_id?: string | null
          projection_date?: string
          projection_name?: string | null
          protocol_id?: string
          site_projections?: Json | null
          total_projected_count?: number | null
          total_projected_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_projections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_projections_projected_by_id_fkey"
            columns: ["projected_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_projections_projected_by_id_fkey"
            columns: ["projected_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "enrollment_projections_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_projections_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "enrollment_projections_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "enrollment_projections_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      enrollment_scenarios: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          notes: string | null
          parameters: Json | null
          projected_first_enrolled: string | null
          projected_last_enrolled: string | null
          projected_total: number | null
          protocol_id: string
          scenario_name: string
          scenario_type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          parameters?: Json | null
          projected_first_enrolled?: string | null
          projected_last_enrolled?: string | null
          projected_total?: number | null
          protocol_id: string
          scenario_name: string
          scenario_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          parameters?: Json | null
          projected_first_enrolled?: string | null
          projected_last_enrolled?: string | null
          projected_total?: number | null
          protocol_id?: string
          scenario_name?: string
          scenario_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_scenarios_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_scenarios_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "enrollment_scenarios_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "enrollment_scenarios_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      enrollment_targets: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          milestone_label: string | null
          protocol_id: string
          region_id: string | null
          site_id: string | null
          target_count: number
          target_date: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          milestone_label?: string | null
          protocol_id: string
          region_id?: string | null
          site_id?: string | null
          target_count: number
          target_date: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          milestone_label?: string | null
          protocol_id?: string
          region_id?: string | null
          site_id?: string | null
          target_count?: number
          target_date?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_targets_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_targets_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "enrollment_targets_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "enrollment_targets_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "enrollment_targets_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "clinical_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_targets_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_training_summary"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "enrollment_targets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
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
      irb_amendments: {
        Row: {
          affected_sites: string[] | null
          amendment_number: string | null
          amendment_type: string | null
          approved_date: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          implementation_date: string | null
          protocol_id: string | null
          status: string
          submission_id: string | null
          submitted_date: string | null
          updated_at: string | null
        }
        Insert: {
          affected_sites?: string[] | null
          amendment_number?: string | null
          amendment_type?: string | null
          approved_date?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          implementation_date?: string | null
          protocol_id?: string | null
          status?: string
          submission_id?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Update: {
          affected_sites?: string[] | null
          amendment_number?: string | null
          amendment_type?: string | null
          approved_date?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          implementation_date?: string | null
          protocol_id?: string | null
          status?: string
          submission_id?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "irb_amendments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irb_amendments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irb_amendments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "irb_amendments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "irb_amendments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "irb_amendments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "irb_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      irb_approvals: {
        Row: {
          approval_date: string | null
          approval_number: string | null
          approved_consent_version: string | null
          approved_protocol_version: string | null
          company_id: string
          conditions: string | null
          created_at: string | null
          expiration_date: string | null
          id: string
          notes: string | null
          submission_id: string
          updated_at: string | null
        }
        Insert: {
          approval_date?: string | null
          approval_number?: string | null
          approved_consent_version?: string | null
          approved_protocol_version?: string | null
          company_id: string
          conditions?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          notes?: string | null
          submission_id: string
          updated_at?: string | null
        }
        Update: {
          approval_date?: string | null
          approval_number?: string | null
          approved_consent_version?: string | null
          approved_protocol_version?: string | null
          company_id?: string
          conditions?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          notes?: string | null
          submission_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "irb_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irb_approvals_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "irb_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      irb_continuing_reviews: {
        Row: {
          adverse_event_summary: string | null
          approved_date: string | null
          company_id: string
          created_at: string | null
          due_date: string | null
          id: string
          protocol_deviation_summary: string | null
          protocol_id: string | null
          review_period_end: string | null
          review_period_start: string | null
          status: Database["public"]["Enums"]["irb_continuing_review_status"]
          subject_enrollment_summary: string | null
          submission_id: string | null
          submitted_date: string | null
          updated_at: string | null
        }
        Insert: {
          adverse_event_summary?: string | null
          approved_date?: string | null
          company_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          protocol_deviation_summary?: string | null
          protocol_id?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          status?: Database["public"]["Enums"]["irb_continuing_review_status"]
          subject_enrollment_summary?: string | null
          submission_id?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Update: {
          adverse_event_summary?: string | null
          approved_date?: string | null
          company_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          protocol_deviation_summary?: string | null
          protocol_id?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          status?: Database["public"]["Enums"]["irb_continuing_review_status"]
          subject_enrollment_summary?: string | null
          submission_id?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "irb_continuing_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irb_continuing_reviews_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irb_continuing_reviews_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "irb_continuing_reviews_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "irb_continuing_reviews_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "irb_continuing_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "irb_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      irb_submissions: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          irb_organization_id: string | null
          notes: string | null
          protocol_id: string | null
          reference_number: string | null
          response_date: string | null
          site_id: string | null
          status: Database["public"]["Enums"]["irb_submission_status"]
          submission_date: string | null
          submission_type: Database["public"]["Enums"]["irb_submission_type"]
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          irb_organization_id?: string | null
          notes?: string | null
          protocol_id?: string | null
          reference_number?: string | null
          response_date?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["irb_submission_status"]
          submission_date?: string | null
          submission_type: Database["public"]["Enums"]["irb_submission_type"]
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          irb_organization_id?: string | null
          notes?: string | null
          protocol_id?: string | null
          reference_number?: string | null
          response_date?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["irb_submission_status"]
          submission_date?: string | null
          submission_type?: Database["public"]["Enums"]["irb_submission_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "irb_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irb_submissions_irb_organization_id_fkey"
            columns: ["irb_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irb_submissions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irb_submissions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "irb_submissions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "irb_submissions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "irb_submissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      kri_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by_id: string | null
          action_item_id: string | null
          alert_level: Database["public"]["Enums"]["kri_alert_level"]
          company_id: string
          created_at: string | null
          id: string
          kri_value_id: string
          message: string
          protocol_id: string | null
          site_id: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by_id?: string | null
          action_item_id?: string | null
          alert_level: Database["public"]["Enums"]["kri_alert_level"]
          company_id: string
          created_at?: string | null
          id?: string
          kri_value_id: string
          message: string
          protocol_id?: string | null
          site_id?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by_id?: string | null
          action_item_id?: string | null
          alert_level?: Database["public"]["Enums"]["kri_alert_level"]
          company_id?: string
          created_at?: string | null
          id?: string
          kri_value_id?: string
          message?: string
          protocol_id?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kri_alerts_acknowledged_by_id_fkey"
            columns: ["acknowledged_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_alerts_acknowledged_by_id_fkey"
            columns: ["acknowledged_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "kri_alerts_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_alerts_kri_value_id_fkey"
            columns: ["kri_value_id"]
            isOneToOne: false
            referencedRelation: "kri_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_alerts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_alerts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "kri_alerts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "kri_alerts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "kri_alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      kri_definitions: {
        Row: {
          calculation_method: string | null
          category: Database["public"]["Enums"]["kri_category"]
          company_id: string
          created_at: string | null
          created_by_id: string | null
          data_source: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          calculation_method?: string | null
          category: Database["public"]["Enums"]["kri_category"]
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          data_source?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          calculation_method?: string | null
          category?: Database["public"]["Enums"]["kri_category"]
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          data_source?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kri_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_definitions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_definitions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      kri_thresholds: {
        Row: {
          company_id: string
          created_at: string | null
          direction: Database["public"]["Enums"]["kri_direction"]
          effective_date: string | null
          green_upper: number | null
          id: string
          kri_definition_id: string
          protocol_id: string | null
          red_upper: number | null
          updated_at: string | null
          yellow_upper: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          direction?: Database["public"]["Enums"]["kri_direction"]
          effective_date?: string | null
          green_upper?: number | null
          id?: string
          kri_definition_id: string
          protocol_id?: string | null
          red_upper?: number | null
          updated_at?: string | null
          yellow_upper?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          direction?: Database["public"]["Enums"]["kri_direction"]
          effective_date?: string | null
          green_upper?: number | null
          id?: string
          kri_definition_id?: string
          protocol_id?: string | null
          red_upper?: number | null
          updated_at?: string | null
          yellow_upper?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kri_thresholds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_thresholds_kri_definition_id_fkey"
            columns: ["kri_definition_id"]
            isOneToOne: false
            referencedRelation: "kri_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_thresholds_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_thresholds_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "kri_thresholds_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "kri_thresholds_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      kri_values: {
        Row: {
          calculated_at: string | null
          company_id: string
          created_at: string | null
          id: string
          kri_definition_id: string
          measurement_date: string
          notes: string | null
          protocol_id: string | null
          site_id: string | null
          value: number
        }
        Insert: {
          calculated_at?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          kri_definition_id: string
          measurement_date?: string
          notes?: string | null
          protocol_id?: string | null
          site_id?: string | null
          value: number
        }
        Update: {
          calculated_at?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          kri_definition_id?: string
          measurement_date?: string
          notes?: string | null
          protocol_id?: string | null
          site_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kri_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_values_kri_definition_id_fkey"
            columns: ["kri_definition_id"]
            isOneToOne: false
            referencedRelation: "kri_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_values_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kri_values_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "kri_values_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "kri_values_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "kri_values_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
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
            foreignKeyName: "mc_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "mc_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "mc_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
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
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_read: boolean
          company_id: string
          created_at: string | null
          id: string
          is_hidden: boolean
          module_name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_read?: boolean
          company_id: string
          created_at?: string | null
          id?: string
          is_hidden?: boolean
          module_name: string
          role: string
          updated_at?: string | null
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_read?: boolean
          company_id?: string
          created_at?: string | null
          id?: string
          is_hidden?: boolean
          module_name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          {
            foreignKeyName: "fk_modules_created_by"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      organization_activity: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          changed_fields: Json | null
          created_at: string | null
          description: string
          id: string
          organization_id: string
          performed_by_id: string | null
          performer_email: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          changed_fields?: Json | null
          created_at?: string | null
          description: string
          id?: string
          organization_id: string
          performed_by_id?: string | null
          performer_email?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          changed_fields?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          organization_id?: string
          performed_by_id?: string | null
          performer_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_activity_performed_by_id_fkey"
            columns: ["performed_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_activity_performed_by_id_fkey"
            columns: ["performed_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      organization_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_primary: boolean | null
          organization_id: string
          role: Database["public"]["Enums"]["contact_role"]
          start_date: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          organization_id: string
          role?: Database["public"]["Enums"]["contact_role"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          organization_id?: string
          role?: Database["public"]["Enums"]["contact_role"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by_id: string | null
          creator_email: string | null
          id: string
          note_type: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          note_type?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          note_type?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_notes_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_notes_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "organization_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_protocols: {
        Row: {
          close_out_date: string | null
          completed_subject_count: number | null
          created_at: string | null
          end_date: string | null
          enrolled_subject_count: number | null
          first_subject_enrolled_date: string | null
          id: string
          irb_approval_date: string | null
          irb_approval_number: string | null
          irb_expiration_date: string | null
          irb_institution_name: string | null
          last_completed_visit_date: string | null
          last_subject_enrolled_date: string | null
          organization_id: string
          planned_subject_count: number | null
          protocol_id: string
          role: Database["public"]["Enums"]["organization_project_role"]
          screen_failure_count: number | null
          site_initiation_date: string | null
          site_qualification_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string | null
        }
        Insert: {
          close_out_date?: string | null
          completed_subject_count?: number | null
          created_at?: string | null
          end_date?: string | null
          enrolled_subject_count?: number | null
          first_subject_enrolled_date?: string | null
          id?: string
          irb_approval_date?: string | null
          irb_approval_number?: string | null
          irb_expiration_date?: string | null
          irb_institution_name?: string | null
          last_completed_visit_date?: string | null
          last_subject_enrolled_date?: string | null
          organization_id: string
          planned_subject_count?: number | null
          protocol_id: string
          role: Database["public"]["Enums"]["organization_project_role"]
          screen_failure_count?: number | null
          site_initiation_date?: string | null
          site_qualification_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
        }
        Update: {
          close_out_date?: string | null
          completed_subject_count?: number | null
          created_at?: string | null
          end_date?: string | null
          enrolled_subject_count?: number | null
          first_subject_enrolled_date?: string | null
          id?: string
          irb_approval_date?: string | null
          irb_approval_number?: string | null
          irb_expiration_date?: string | null
          irb_institution_name?: string | null
          last_completed_visit_date?: string | null
          last_subject_enrolled_date?: string | null
          organization_id?: string
          planned_subject_count?: number | null
          protocol_id?: string
          role?: Database["public"]["Enums"]["organization_project_role"]
          screen_failure_count?: number | null
          site_initiation_date?: string | null
          site_qualification_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_protocols_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "organization_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "organization_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      organization_status_history: {
        Row: {
          changed_at: string
          changed_by_email: string | null
          changed_by_id: string | null
          id: string
          new_status: string
          old_status: string
          organization_id: string
        }
        Insert: {
          changed_at?: string
          changed_by_email?: string | null
          changed_by_id?: string | null
          id?: string
          new_status: string
          old_status: string
          organization_id: string
        }
        Update: {
          changed_at?: string
          changed_by_email?: string | null
          changed_by_id?: string | null
          id?: string
          new_status?: string
          old_status?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_status_history_changed_by_id_fkey"
            columns: ["changed_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_status_history_changed_by_id_fkey"
            columns: ["changed_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "organization_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_team_members: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          profile_id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          profile_id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          profile_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      organizations: {
        Row: {
          company_id: string
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          email: string | null
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          parent_organization_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string | null
          website: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          parent_organization_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          parent_organization_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "patient_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "patient_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "patient_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
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
            referencedRelation: "protocol_assignments"
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
      payment_activities: {
        Row: {
          actual_amount: number
          company_id: string
          contract_id: string | null
          created_at: string | null
          currency_code: string | null
          deviation_amount: number | null
          id: string
          is_completed: boolean | null
          is_unplanned: boolean | null
          payee_contact_id: string | null
          payment_record_id: string | null
          site_id: string
          standard_amount: number
          subject_activity_id: string | null
          subject_visit_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_amount?: number
          company_id: string
          contract_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          deviation_amount?: number | null
          id?: string
          is_completed?: boolean | null
          is_unplanned?: boolean | null
          payee_contact_id?: string | null
          payment_record_id?: string | null
          site_id: string
          standard_amount?: number
          subject_activity_id?: string | null
          subject_visit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_amount?: number
          company_id?: string
          contract_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          deviation_amount?: number | null
          id?: string
          is_completed?: boolean | null
          is_unplanned?: boolean | null
          payee_contact_id?: string | null
          payment_record_id?: string | null
          site_id?: string
          standard_amount?: number
          subject_activity_id?: string | null
          subject_visit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_activities_payment_record"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_activities_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "site_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_activities_payee_contact_id_fkey"
            columns: ["payee_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_activities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_activities_subject_activity_id_fkey"
            columns: ["subject_activity_id"]
            isOneToOne: false
            referencedRelation: "subject_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_activities_subject_visit_id_fkey"
            columns: ["subject_visit_id"]
            isOneToOne: false
            referencedRelation: "subject_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_exceptions: {
        Row: {
          company_id: string
          created_at: string | null
          currency_code: string | null
          exception_amount: number
          id: string
          protocol_id: string
          site_id: string
          template_activity_id: string
          template_visit_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          currency_code?: string | null
          exception_amount: number
          id?: string
          protocol_id: string
          site_id: string
          template_activity_id: string
          template_visit_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          currency_code?: string | null
          exception_amount?: number
          id?: string
          protocol_id?: string
          site_id?: string
          template_activity_id?: string
          template_visit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_exceptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_exceptions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_exceptions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "payment_exceptions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "payment_exceptions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "payment_exceptions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_exceptions_template_activity_id_fkey"
            columns: ["template_activity_id"]
            isOneToOne: false
            referencedRelation: "template_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_exceptions_template_visit_id_fkey"
            columns: ["template_visit_id"]
            isOneToOne: false
            referencedRelation: "template_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          check_amount: number | null
          check_date: string | null
          check_number: string | null
          company_id: string
          contract_id: string | null
          created_at: string | null
          currency_code: string | null
          earned_amount: number | null
          id: string
          payee_contact_id: string | null
          payment_number: string | null
          payment_type: string
          protocol_id: string | null
          region_id: string | null
          requested_amount: number | null
          site_id: string
          status: string
          updated_at: string | null
          vat_amount: number | null
        }
        Insert: {
          check_amount?: number | null
          check_date?: string | null
          check_number?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          earned_amount?: number | null
          id?: string
          payee_contact_id?: string | null
          payment_number?: string | null
          payment_type?: string
          protocol_id?: string | null
          region_id?: string | null
          requested_amount?: number | null
          site_id: string
          status?: string
          updated_at?: string | null
          vat_amount?: number | null
        }
        Update: {
          check_amount?: number | null
          check_date?: string | null
          check_number?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          earned_amount?: number | null
          id?: string
          payee_contact_id?: string | null
          payment_number?: string | null
          payment_type?: string
          protocol_id?: string | null
          region_id?: string | null
          requested_amount?: number | null
          site_id?: string
          status?: string
          updated_at?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "site_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_payee_contact_id_fkey"
            columns: ["payee_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "payment_records_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "payment_records_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "payment_records_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "clinical_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_training_summary"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "payment_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_splits: {
        Row: {
          contract_id: string
          created_at: string | null
          id: string
          payee_contact_id: string | null
          payment_activity_id: string
          split_amount: number
          split_percentage: number
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          id?: string
          payee_contact_id?: string | null
          payment_activity_id: string
          split_amount: number
          split_percentage: number
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          id?: string
          payee_contact_id?: string | null
          payment_activity_id?: string
          split_amount?: number
          split_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_splits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "site_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_splits_payee_contact_id_fkey"
            columns: ["payee_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_splits_payment_activity_id_fkey"
            columns: ["payment_activity_id"]
            isOneToOne: false
            referencedRelation: "payment_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      position_types: {
        Row: {
          code: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "position_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_documentation: {
        Row: {
          slug: string
          body_markdown: string
          title: string | null
          description: string | null
          category: string | null
          icon_key: string | null
          roles: string[]
          module_route: string | null
          sort_order: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          slug: string
          body_markdown?: string
          title?: string | null
          description?: string | null
          category?: string | null
          icon_key?: string | null
          roles?: string[]
          module_route?: string | null
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          slug?: string
          body_markdown?: string
          title?: string | null
          description?: string | null
          category?: string | null
          icon_key?: string | null
          roles?: string[]
          module_route?: string | null
          sort_order?: number | null
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
            referencedRelation: "protocol_assignments"
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
      protocol_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          company_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_central: boolean | null
          metadata: Json | null
          organization_id: string
          protocol_id: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          company_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_central?: boolean | null
          metadata?: Json | null
          organization_id: string
          protocol_id: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          company_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_central?: boolean | null
          metadata?: Json | null
          organization_id?: string
          protocol_id?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_accounts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_accounts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_accounts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_accounts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      protocol_activities: {
        Row: {
          activity_type: string | null
          actual_cost: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          assigned_to_id: string | null
          budgeted_cost: number | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          planned_end_date: string | null
          planned_start_date: string | null
          protocol_id: string
          sort_order: number | null
          status: Database["public"]["Enums"]["protocol_activity_status"]
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_type?: string | null
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_to_id?: string | null
          budgeted_cost?: number | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          protocol_id: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["protocol_activity_status"]
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_type?: string | null
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_to_id?: string | null
          budgeted_cost?: number | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          protocol_id?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["protocol_activity_status"]
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_activities_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_activities_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "protocol_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_activities_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_activities_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_activities_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_activities_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "protocol_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_activity_templates: {
        Row: {
          activity_type: string | null
          company_id: string
          created_at: string | null
          default_budgeted_cost: number | null
          default_duration_days: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          activity_type?: string | null
          company_id: string
          created_at?: string | null
          default_budgeted_cost?: number | null
          default_duration_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          activity_type?: string | null
          company_id?: string
          created_at?: string | null
          default_budgeted_cost?: number | null
          default_duration_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_activity_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_contacts: {
        Row: {
          clinical_site_id: string | null
          company_id: string
          contact_id: string
          created_at: string | null
          end_date: string | null
          id: string
          organization_id: string | null
          protocol_id: string
          role: string
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          clinical_site_id?: string | null
          company_id: string
          contact_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string | null
          protocol_id: string
          role: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          clinical_site_id?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string | null
          protocol_id?: string
          role?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_contacts_clinical_site_id_fkey"
            columns: ["clinical_site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_contacts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_contacts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_contacts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_contacts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      protocol_governance: {
        Row: {
          assigned_date: string | null
          company_id: string
          contact_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          protocol_id: string
          removed_date: string | null
          role: Database["public"]["Enums"]["protocol_governance_role"]
          updated_at: string | null
        }
        Insert: {
          assigned_date?: string | null
          company_id: string
          contact_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          protocol_id: string
          removed_date?: string | null
          role: Database["public"]["Enums"]["protocol_governance_role"]
          updated_at?: string | null
        }
        Update: {
          assigned_date?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          protocol_id?: string
          removed_date?: string | null
          role?: Database["public"]["Enums"]["protocol_governance_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_governance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_governance_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_governance_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_governance_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_governance_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_governance_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      protocol_milestones: {
        Row: {
          actual_date: string | null
          baseline_date: string | null
          company_id: string
          created_at: string | null
          forecast_date: string | null
          id: string
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          name: string
          notes: string | null
          protocol_id: string
          sort_order: number | null
          status: Database["public"]["Enums"]["milestone_status"]
          updated_at: string | null
        }
        Insert: {
          actual_date?: string | null
          baseline_date?: string | null
          company_id: string
          created_at?: string | null
          forecast_date?: string | null
          id?: string
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          name: string
          notes?: string | null
          protocol_id: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string | null
        }
        Update: {
          actual_date?: string | null
          baseline_date?: string | null
          company_id?: string
          created_at?: string | null
          forecast_date?: string | null
          id?: string
          milestone_type?: Database["public"]["Enums"]["milestone_type"]
          name?: string
          notes?: string | null
          protocol_id?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_milestones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_milestones_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_milestones_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_milestones_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_milestones_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      protocol_risk_resolution_activities: {
        Row: {
          assigned_to_id: string | null
          company_id: string
          completed_date: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          protocol_risk_id: string
          sort_order: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to_id?: string | null
          company_id: string
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          protocol_risk_id: string
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to_id?: string | null
          company_id?: string
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          protocol_risk_id?: string
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_risk_resolution_activities_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_risk_resolution_activities_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "protocol_risk_resolution_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_risk_resolution_activities_protocol_risk_id_fkey"
            columns: ["protocol_risk_id"]
            isOneToOne: false
            referencedRelation: "protocol_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_risks: {
        Row: {
          company_id: string
          created_at: string | null
          created_by_id: string | null
          description: string | null
          id: string
          identified_date: string | null
          protocol_id: string
          resolved_date: string | null
          risk_level: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          id?: string
          identified_date?: string | null
          protocol_id: string
          resolved_date?: string | null
          risk_level?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          id?: string
          identified_date?: string | null
          protocol_id?: string
          resolved_date?: string | null
          risk_level?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_risks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_risks_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_risks_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "protocol_risks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_risks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_risks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_risks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      protocol_status_reports: {
        Row: {
          company_id: string
          created_at: string | null
          created_by_id: string | null
          forecast: string | null
          id: string
          issues: string | null
          next_steps: string | null
          period_end: string | null
          period_start: string | null
          progress_summary: string | null
          protocol_id: string
          report_date: string
          risks: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          forecast?: string | null
          id?: string
          issues?: string | null
          next_steps?: string | null
          period_end?: string | null
          period_start?: string | null
          progress_summary?: string | null
          protocol_id: string
          report_date?: string
          risks?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          forecast?: string | null
          id?: string
          issues?: string | null
          next_steps?: string | null
          period_end?: string | null
          period_start?: string | null
          progress_summary?: string | null
          protocol_id?: string
          report_date?: string
          risks?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_status_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_status_reports_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_status_reports_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "protocol_status_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_status_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_status_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_status_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      protocol_tasks: {
        Row: {
          actual_cost: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          budgeted_cost: number | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          planned_end_date: string | null
          planned_start_date: string | null
          protocol_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          budgeted_cost?: number | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          protocol_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          budgeted_cost?: number | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          protocol_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_tasks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_tasks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_tasks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_tasks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      protocol_teams: {
        Row: {
          company_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_primary: boolean | null
          metadata: Json | null
          protocol_id: string
          role: Database["public"]["Enums"]["team_role"]
          start_date: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          protocol_id: string
          role: Database["public"]["Enums"]["team_role"]
          start_date: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          protocol_id?: string
          role?: Database["public"]["Enums"]["team_role"]
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_teams_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_teams_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_teams_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_teams_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      protocol_versions: {
        Row: {
          amendment_version: string | null
          approval_date: string | null
          company_id: string
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          description: string | null
          id: string
          is_original: boolean | null
          metadata: Json | null
          protocol_id: string
          updated_at: string | null
          version_number: string
        }
        Insert: {
          amendment_version?: string | null
          approval_date?: string | null
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          is_original?: boolean | null
          metadata?: Json | null
          protocol_id: string
          updated_at?: string | null
          version_number: string
        }
        Update: {
          amendment_version?: string | null
          approval_date?: string | null
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          is_original?: boolean | null
          metadata?: Json | null
          protocol_id?: string
          updated_at?: string | null
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_versions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_versions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "protocol_versions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_versions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_versions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "protocol_versions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      rate_list_items: {
        Row: {
          created_at: string | null
          hourly_rate: number
          id: string
          position_type_id: string
          rate_list_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hourly_rate?: number
          id?: string
          position_type_id: string
          rate_list_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hourly_rate?: number
          id?: string
          position_type_id?: string
          rate_list_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_list_items_position_type_id_fkey"
            columns: ["position_type_id"]
            isOneToOne: false
            referencedRelation: "position_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_list_items_rate_list_id_fkey"
            columns: ["rate_list_id"]
            isOneToOne: false
            referencedRelation: "rate_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_lists: {
        Row: {
          company_id: string
          created_at: string | null
          currency_code: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_records: {
        Row: {
          company_id: string
          created_at: string | null
          document_type: string
          id: string
          last_checked_date: string | null
          match_status: string
          protocol_id: string
          resolution_notes: string | null
          resolved_date: string | null
          site_expiration_date: string | null
          site_id: string
          site_status: string
          sponsor_expiration_date: string | null
          sponsor_status: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          document_type: string
          id?: string
          last_checked_date?: string | null
          match_status: string
          protocol_id: string
          resolution_notes?: string | null
          resolved_date?: string | null
          site_expiration_date?: string | null
          site_id: string
          site_status: string
          sponsor_expiration_date?: string | null
          sponsor_status: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          document_type?: string
          id?: string
          last_checked_date?: string | null
          match_status?: string
          protocol_id?: string
          resolution_notes?: string | null
          resolved_date?: string | null
          site_expiration_date?: string | null
          site_id?: string
          site_status?: string
          sponsor_expiration_date?: string | null
          sponsor_status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_records_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_records_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "reconciliation_records_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "reconciliation_records_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "reconciliation_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      region_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          company_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_regional: boolean | null
          metadata: Json | null
          organization_id: string
          region_id: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          company_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_regional?: boolean | null
          metadata?: Json | null
          organization_id: string
          region_id: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          company_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_regional?: boolean | null
          metadata?: Json | null
          organization_id?: string
          region_id?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "region_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_accounts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "clinical_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_accounts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_training_summary"
            referencedColumns: ["region_id"]
          },
        ]
      }
      region_teams: {
        Row: {
          company_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_primary: boolean | null
          metadata: Json | null
          region_id: string
          role: Database["public"]["Enums"]["team_role"]
          start_date: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          region_id: string
          role: Database["public"]["Enums"]["team_role"]
          start_date: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          region_id?: string
          role?: Database["public"]["Enums"]["team_role"]
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_teams_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "clinical_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_teams_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_training_summary"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "region_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      risk_assessment_question_values: {
        Row: {
          company_id: string
          created_at: string | null
          detectability_score: number | null
          id: string
          impact_score: number | null
          metadata: Json | null
          probability_score: number | null
          question_id: string
          sequence: number
          value_label: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          detectability_score?: number | null
          id?: string
          impact_score?: number | null
          metadata?: Json | null
          probability_score?: number | null
          question_id: string
          sequence: number
          value_label: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          detectability_score?: number | null
          id?: string
          impact_score?: number | null
          metadata?: Json | null
          probability_score?: number | null
          question_id?: string
          sequence?: number
          value_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessment_question_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessment_question_values_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessment_questions: {
        Row: {
          category: Database["public"]["Enums"]["risk_category"]
          company_id: string
          considerations: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          question_text: string
          sequence: number
          template_id: string
          weight: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["risk_category"]
          company_id: string
          considerations?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          question_text: string
          sequence: number
          template_id: string
          weight?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["risk_category"]
          company_id?: string
          considerations?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          question_text?: string
          sequence?: number
          template_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessment_questions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessment_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessment_responses: {
        Row: {
          assessment_id: string
          calculated_score: number | null
          company_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          question_id: string
          response_text: string | null
          selected_value_id: string | null
          updated_at: string | null
        }
        Insert: {
          assessment_id: string
          calculated_score?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          question_id: string
          response_text?: string | null
          selected_value_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string
          calculated_score?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          question_id?: string
          response_text?: string | null
          selected_value_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "risk_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessment_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessment_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessment_responses_selected_value_id_fkey"
            columns: ["selected_value_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_question_values"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessment_templates: {
        Row: {
          assessment_type: string
          company_id: string
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          description: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          assessment_type: string
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          assessment_type?: string
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessment_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessment_templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessment_templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          assessed_by_email: string | null
          assessed_by_id: string | null
          assessment_date: string
          company_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          functional_impact: string | null
          id: string
          metadata: Json | null
          mitigation_plan: string | null
          rationale: string | null
          risk_level: string | null
          status: string | null
          template_id: string
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          assessed_by_email?: string | null
          assessed_by_id?: string | null
          assessment_date: string
          company_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          functional_impact?: string | null
          id?: string
          metadata?: Json | null
          mitigation_plan?: string | null
          rationale?: string | null
          risk_level?: string | null
          status?: string | null
          template_id: string
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          assessed_by_email?: string | null
          assessed_by_id?: string | null
          assessment_date?: string
          company_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          functional_impact?: string | null
          id?: string
          metadata?: Json | null
          mitigation_plan?: string | null
          rationale?: string | null
          risk_level?: string | null
          status?: string | null
          template_id?: string
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_assessed_by_id_fkey"
            columns: ["assessed_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_assessed_by_id_fkey"
            columns: ["assessed_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "risk_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_resolution_activities: {
        Row: {
          assigned_to_id: string | null
          company_id: string
          completed_date: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          risk_assessment_id: string
          sort_order: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to_id?: string | null
          company_id: string
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          risk_assessment_id: string
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to_id?: string | null
          company_id?: string
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          risk_assessment_id?: string
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_resolution_activities_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_resolution_activities_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "risk_resolution_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_resolution_activities_risk_assessment_id_fkey"
            columns: ["risk_assessment_id"]
            isOneToOne: false
            referencedRelation: "risk_assessments"
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
            foreignKeyName: "sdv_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "sdv_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "sdv_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "sdv_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
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
            foreignKeyName: "sdv_uploads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "sdv_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "sdv_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "sdv_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
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
      site_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          company_id: string
          created_at: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          organization_id: string
          site_id: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          company_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          site_id: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          company_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          site_id?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_accounts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_contracts: {
        Row: {
          clinical_site_id: string | null
          contract_amount: number | null
          contract_number: string | null
          contract_type: string
          created_at: string | null
          currency_code: string | null
          effective_date: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          organization_id: string
          payee_contact_id: string | null
          protocol_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          clinical_site_id?: string | null
          contract_amount?: number | null
          contract_number?: string | null
          contract_type: string
          created_at?: string | null
          currency_code?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payee_contact_id?: string | null
          protocol_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          clinical_site_id?: string | null
          contract_amount?: number | null
          contract_number?: string | null
          contract_type?: string
          created_at?: string | null
          currency_code?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payee_contact_id?: string | null
          protocol_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_contracts_clinical_site_id_fkey"
            columns: ["clinical_site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_contracts_payee_contact_id_fkey"
            columns: ["payee_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_contracts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_contracts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_contracts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_contracts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      site_documents: {
        Row: {
          clinical_site_id: string | null
          created_at: string | null
          document_name: string
          document_type: string
          expected_date: string | null
          expiration_date: string | null
          file_url: string | null
          id: string
          notes: string | null
          organization_id: string
          protocol_id: string | null
          received_date: string | null
          sent_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          clinical_site_id?: string | null
          created_at?: string | null
          document_name: string
          document_type: string
          expected_date?: string | null
          expiration_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          protocol_id?: string | null
          received_date?: string | null
          sent_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          clinical_site_id?: string | null
          created_at?: string | null
          document_name?: string
          document_type?: string
          expected_date?: string | null
          expiration_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          protocol_id?: string | null
          received_date?: string | null
          sent_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_documents_clinical_site_id_fkey"
            columns: ["clinical_site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_documents_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_documents_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_documents_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_documents_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      site_scorecard_criteria: {
        Row: {
          category: Database["public"]["Enums"]["scorecard_criterion_category"]
          company_id: string
          created_at: string | null
          criterion_name: string
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["scorecard_criterion_category"]
          company_id: string
          created_at?: string | null
          criterion_name: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["scorecard_criterion_category"]
          company_id?: string
          created_at?: string | null
          criterion_name?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_scorecard_criteria_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_scorecards: {
        Row: {
          company_id: string
          compliance_score: number | null
          created_at: string | null
          data_quality_score: number | null
          enrollment_score: number | null
          id: string
          notes: string | null
          overall_score: number | null
          protocol_id: string
          scorecard_date: string
          scored_by_id: string | null
          site_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          compliance_score?: number | null
          created_at?: string | null
          data_quality_score?: number | null
          enrollment_score?: number | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          protocol_id: string
          scorecard_date?: string
          scored_by_id?: string | null
          site_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          compliance_score?: number | null
          created_at?: string | null
          data_quality_score?: number | null
          enrollment_score?: number | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          protocol_id?: string
          scorecard_date?: string
          scored_by_id?: string | null
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_scorecards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_scorecards_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_scorecards_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_scorecards_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_scorecards_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_scorecards_scored_by_id_fkey"
            columns: ["scored_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_scorecards_scored_by_id_fkey"
            columns: ["scored_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "site_scorecards_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_startup_checklists: {
        Row: {
          company_id: string
          completed_date: string | null
          created_at: string | null
          id: string
          protocol_id: string
          site_id: string
          started_date: string | null
          status: Database["public"]["Enums"]["startup_checklist_status"]
          template_name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          completed_date?: string | null
          created_at?: string | null
          id?: string
          protocol_id: string
          site_id: string
          started_date?: string | null
          status?: Database["public"]["Enums"]["startup_checklist_status"]
          template_name?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          completed_date?: string | null
          created_at?: string | null
          id?: string
          protocol_id?: string
          site_id?: string
          started_date?: string | null
          status?: Database["public"]["Enums"]["startup_checklist_status"]
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_startup_checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_startup_checklists_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_startup_checklists_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_startup_checklists_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_startup_checklists_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_startup_checklists_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_startup_steps: {
        Row: {
          assigned_to_id: string | null
          blocker_description: string | null
          checklist_id: string
          company_id: string
          completed_date: string | null
          created_at: string | null
          id: string
          is_required: boolean | null
          notes: string | null
          sort_order: number | null
          status: Database["public"]["Enums"]["startup_step_status"]
          step_category: Database["public"]["Enums"]["startup_step_category"]
          step_name: string
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to_id?: string | null
          blocker_description?: string | null
          checklist_id: string
          company_id: string
          completed_date?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          notes?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["startup_step_status"]
          step_category?: Database["public"]["Enums"]["startup_step_category"]
          step_name: string
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to_id?: string | null
          blocker_description?: string | null
          checklist_id?: string
          company_id?: string
          completed_date?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          notes?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["startup_step_status"]
          step_category?: Database["public"]["Enums"]["startup_step_category"]
          step_name?: string
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_startup_steps_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_startup_steps_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "site_startup_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_startup_steps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_teams: {
        Row: {
          company_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_primary: boolean | null
          metadata: Json | null
          role: Database["public"]["Enums"]["team_role"]
          site_id: string
          start_date: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          role: Database["public"]["Enums"]["team_role"]
          site_id: string
          start_date: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          role?: Database["public"]["Enums"]["team_role"]
          site_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_teams_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      site_training_plans: {
        Row: {
          clinical_site_id: string
          created_at: string | null
          id: string
          training_plan_version_id: string
        }
        Insert: {
          clinical_site_id: string
          created_at?: string | null
          id?: string
          training_plan_version_id: string
        }
        Update: {
          clinical_site_id?: string
          created_at?: string | null
          id?: string
          training_plan_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_training_plans_clinical_site_id_fkey"
            columns: ["clinical_site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_training_plans_training_plan_version_id_fkey"
            columns: ["training_plan_version_id"]
            isOneToOne: false
            referencedRelation: "training_plan_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_training_topics: {
        Row: {
          clinical_site_id: string
          created_at: string | null
          id: string
          source: string
          training_topic_id: string
        }
        Insert: {
          clinical_site_id: string
          created_at?: string | null
          id?: string
          source?: string
          training_topic_id: string
        }
        Update: {
          clinical_site_id?: string
          created_at?: string | null
          id?: string
          source?: string
          training_topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_training_topics_clinical_site_id_fkey"
            columns: ["clinical_site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_training_topics_training_topic_id_fkey"
            columns: ["training_topic_id"]
            isOneToOne: false
            referencedRelation: "training_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          assigned_to_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          protocol_id: string | null
          updated_at: string | null
          visit_end: string | null
          visit_name: string
          visit_start: string
          visit_status: string
          visit_type: string
        }
        Insert: {
          assigned_to_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          protocol_id?: string | null
          updated_at?: string | null
          visit_end?: string | null
          visit_name: string
          visit_start: string
          visit_status?: string
          visit_type: string
        }
        Update: {
          assigned_to_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          protocol_id?: string | null
          updated_at?: string | null
          visit_end?: string | null
          visit_name?: string
          visit_start?: string
          visit_status?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "site_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_visits_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "site_visits_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      spend_actuals: {
        Row: {
          amount: number
          budget_line_item_id: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          payment_record_id: string | null
          protocol_id: string
          spend_date: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          budget_line_item_id?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          payment_record_id?: string | null
          protocol_id: string
          spend_date: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          budget_line_item_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          payment_record_id?: string | null
          protocol_id?: string
          spend_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_actuals_budget_line_item_id_fkey"
            columns: ["budget_line_item_id"]
            isOneToOne: false
            referencedRelation: "budget_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_actuals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_actuals_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_actuals_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_actuals_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "spend_actuals_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "spend_actuals_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      spend_forecasts: {
        Row: {
          assumptions: Json | null
          company_id: string
          created_at: string | null
          forecast_date: string
          forecast_name: string | null
          forecast_period_end: string
          forecast_period_start: string
          forecasted_by_id: string | null
          id: string
          line_item_forecasts: Json | null
          protocol_id: string
          total_forecasted_spend: number | null
          updated_at: string | null
        }
        Insert: {
          assumptions?: Json | null
          company_id: string
          created_at?: string | null
          forecast_date: string
          forecast_name?: string | null
          forecast_period_end: string
          forecast_period_start: string
          forecasted_by_id?: string | null
          id?: string
          line_item_forecasts?: Json | null
          protocol_id: string
          total_forecasted_spend?: number | null
          updated_at?: string | null
        }
        Update: {
          assumptions?: Json | null
          company_id?: string
          created_at?: string | null
          forecast_date?: string
          forecast_name?: string | null
          forecast_period_end?: string
          forecast_period_start?: string
          forecasted_by_id?: string | null
          id?: string
          line_item_forecasts?: Json | null
          protocol_id?: string
          total_forecasted_spend?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_forecasts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_forecasts_forecasted_by_id_fkey"
            columns: ["forecasted_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_forecasts_forecasted_by_id_fkey"
            columns: ["forecasted_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "spend_forecasts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_forecasts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "spend_forecasts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "spend_forecasts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      subject_activities: {
        Row: {
          activity_name: string
          activity_type: string | null
          assigned_to: string | null
          company_id: string
          completed_date: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          status: Database["public"]["Enums"]["activity_status"]
          subject_visit_id: string
          template_activity_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_name: string
          activity_type?: string | null
          assigned_to?: string | null
          company_id: string
          completed_date?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          subject_visit_id: string
          template_activity_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_name?: string
          activity_type?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_date?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          subject_visit_id?: string
          template_activity_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subject_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_activities_subject_visit_id_fkey"
            columns: ["subject_visit_id"]
            isOneToOne: false
            referencedRelation: "subject_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_activities_template_activity_id_fkey"
            columns: ["template_activity_id"]
            isOneToOne: false
            referencedRelation: "template_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_visit_templates: {
        Row: {
          comments: string | null
          company_id: string
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          description: string | null
          id: string
          irb_approval_date: string | null
          is_active: boolean | null
          metadata: Json | null
          name: string
          protocol_id: string
          updated_at: string | null
          version_number: string
        }
        Insert: {
          comments?: string | null
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          irb_approval_date?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          protocol_id: string
          updated_at?: string | null
          version_number: string
        }
        Update: {
          comments?: string | null
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          description?: string | null
          id?: string
          irb_approval_date?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          protocol_id?: string
          updated_at?: string | null
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_visit_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_visit_templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_visit_templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subject_visit_templates_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_visit_templates_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "subject_visit_templates_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "subject_visit_templates_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      subject_visits: {
        Row: {
          actual_date: string | null
          company_id: string
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          id: string
          metadata: Json | null
          notes: string | null
          scheduled_date: string | null
          sequence: number
          site_id: string
          status: Database["public"]["Enums"]["visit_status"]
          subject_id: string
          template_visit_id: string | null
          updated_at: string | null
          visit_name: string
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          actual_date?: string | null
          company_id: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          scheduled_date?: string | null
          sequence: number
          site_id: string
          status?: Database["public"]["Enums"]["visit_status"]
          subject_id: string
          template_visit_id?: string | null
          updated_at?: string | null
          visit_name: string
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          actual_date?: string | null
          company_id?: string
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          scheduled_date?: string | null
          sequence?: number
          site_id?: string
          status?: Database["public"]["Enums"]["visit_status"]
          subject_id?: string
          template_visit_id?: string | null
          updated_at?: string | null
          visit_name?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "subject_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_visits_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_visits_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subject_visits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_visits_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_visits_template_visit_id_fkey"
            columns: ["template_visit_id"]
            isOneToOne: false
            referencedRelation: "template_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          company_id: string
          completion_date: string | null
          created_at: string | null
          created_by_id: string | null
          creator_email: string | null
          demographic_data: Json | null
          enrollment_date: string | null
          id: string
          metadata: Json | null
          screen_failure_reason: string | null
          screening_date: string | null
          screening_number: string | null
          sdv_last_updated_source: string | null
          sdv_required: boolean | null
          site_id: string
          status: Database["public"]["Enums"]["subject_status"]
          subject_number: string | null
          termination_date: string | null
          termination_reason: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          completion_date?: string | null
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          demographic_data?: Json | null
          enrollment_date?: string | null
          id?: string
          metadata?: Json | null
          screen_failure_reason?: string | null
          screening_date?: string | null
          screening_number?: string | null
          sdv_last_updated_source?: string | null
          sdv_required?: boolean | null
          site_id: string
          status?: Database["public"]["Enums"]["subject_status"]
          subject_number?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          completion_date?: string | null
          created_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          demographic_data?: Json | null
          enrollment_date?: string | null
          id?: string
          metadata?: Json | null
          screen_failure_reason?: string | null
          screening_date?: string | null
          screening_number?: string | null
          sdv_last_updated_source?: string | null
          sdv_required?: boolean | null
          site_id?: string
          status?: Database["public"]["Enums"]["subject_status"]
          subject_number?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subjects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      team_assignment_history: {
        Row: {
          changed_by_email: string | null
          changed_by_id: string | null
          company_id: string
          created_at: string | null
          end_date: string | null
          entity_id: string
          entity_type: string
          id: string
          is_locked: boolean | null
          metadata: Json | null
          role: Database["public"]["Enums"]["team_role"]
          start_date: string
          user_id: string
        }
        Insert: {
          changed_by_email?: string | null
          changed_by_id?: string | null
          company_id: string
          created_at?: string | null
          end_date?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_locked?: boolean | null
          metadata?: Json | null
          role: Database["public"]["Enums"]["team_role"]
          start_date: string
          user_id: string
        }
        Update: {
          changed_by_email?: string | null
          changed_by_id?: string | null
          company_id?: string
          created_at?: string | null
          end_date?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_locked?: boolean | null
          metadata?: Json | null
          role?: Database["public"]["Enums"]["team_role"]
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_assignment_history_changed_by_id_fkey"
            columns: ["changed_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_assignment_history_changed_by_id_fkey"
            columns: ["changed_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "team_assignment_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_assignment_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_assignment_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      template_activities: {
        Row: {
          activity_name: string
          activity_type: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          metadata: Json | null
          template_visit_id: string
        }
        Insert: {
          activity_name: string
          activity_type?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          metadata?: Json | null
          template_visit_id: string
        }
        Update: {
          activity_name?: string
          activity_type?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          metadata?: Json | null
          template_visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_activities_template_visit_id_fkey"
            columns: ["template_visit_id"]
            isOneToOne: false
            referencedRelation: "template_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      template_visits: {
        Row: {
          company_id: string
          created_at: string | null
          day_from_baseline: number
          description: string | null
          id: string
          metadata: Json | null
          page_numbers_to_verify: string | null
          sdv_required: boolean | null
          sequence: number
          template_id: string
          visit_name: string
          visit_type: Database["public"]["Enums"]["visit_type"]
          visit_window_after: number | null
          visit_window_before: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          day_from_baseline?: number
          description?: string | null
          id?: string
          metadata?: Json | null
          page_numbers_to_verify?: string | null
          sdv_required?: boolean | null
          sequence: number
          template_id: string
          visit_name: string
          visit_type: Database["public"]["Enums"]["visit_type"]
          visit_window_after?: number | null
          visit_window_before?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          day_from_baseline?: number
          description?: string | null
          id?: string
          metadata?: Json | null
          page_numbers_to_verify?: string | null
          sdv_required?: boolean | null
          sequence?: number
          template_id?: string
          visit_name?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
          visit_window_after?: number | null
          visit_window_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_visits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "subject_visit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tmf_artifact_files: {
        Row: {
          artifact_id: string
          company_id: string
          created_at: string | null
          document_upload_id: string | null
          file_name: string | null
          file_path: string | null
          id: string
          notes: string | null
          updated_at: string | null
          uploaded_by_id: string | null
          version: string | null
        }
        Insert: {
          artifact_id: string
          company_id: string
          created_at?: string | null
          document_upload_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          uploaded_by_id?: string | null
          version?: string | null
        }
        Update: {
          artifact_id?: string
          company_id?: string
          created_at?: string | null
          document_upload_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          uploaded_by_id?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmf_artifact_files_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "tmf_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_artifact_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_artifact_files_document_upload_id_fkey"
            columns: ["document_upload_id"]
            isOneToOne: false
            referencedRelation: "document_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_artifact_files_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_artifact_files_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      tmf_artifacts: {
        Row: {
          artifact_number: string | null
          company_id: string
          completion_date: string | null
          created_at: string | null
          description: string | null
          id: string
          is_country_specific: boolean
          is_required: boolean
          is_site_specific: boolean
          name: string
          protocol_id: string
          responsible_role: string | null
          section_id: string
          sort_order: number
          status: string
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          artifact_number?: string | null
          company_id: string
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_country_specific?: boolean
          is_required?: boolean
          is_site_specific?: boolean
          name: string
          protocol_id: string
          responsible_role?: string | null
          section_id: string
          sort_order?: number
          status?: string
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          artifact_number?: string | null
          company_id?: string
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_country_specific?: boolean
          is_required?: boolean
          is_site_specific?: boolean
          name?: string
          protocol_id?: string
          responsible_role?: string | null
          section_id?: string
          sort_order?: number
          status?: string
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmf_artifacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_artifacts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_artifacts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "tmf_artifacts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "tmf_artifacts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "tmf_artifacts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "tmf_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      tmf_completeness_checks: {
        Row: {
          check_date: string
          checked_by_id: string | null
          company_id: string
          completed_artifacts: number
          completeness_percentage: number
          created_at: string | null
          id: string
          not_applicable_artifacts: number
          notes: string | null
          protocol_id: string
          total_artifacts: number
          zone_breakdown: Json | null
        }
        Insert: {
          check_date?: string
          checked_by_id?: string | null
          company_id: string
          completed_artifacts: number
          completeness_percentage: number
          created_at?: string | null
          id?: string
          not_applicable_artifacts?: number
          notes?: string | null
          protocol_id: string
          total_artifacts: number
          zone_breakdown?: Json | null
        }
        Update: {
          check_date?: string
          checked_by_id?: string | null
          company_id?: string
          completed_artifacts?: number
          completeness_percentage?: number
          created_at?: string | null
          id?: string
          not_applicable_artifacts?: number
          notes?: string | null
          protocol_id?: string
          total_artifacts?: number
          zone_breakdown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tmf_completeness_checks_checked_by_id_fkey"
            columns: ["checked_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_completeness_checks_checked_by_id_fkey"
            columns: ["checked_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tmf_completeness_checks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_completeness_checks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_completeness_checks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "tmf_completeness_checks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "tmf_completeness_checks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      tmf_sections: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          section_number: string | null
          sort_order: number
          updated_at: string | null
          zone_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          section_number?: string | null
          sort_order?: number
          updated_at?: string | null
          zone_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          section_number?: string | null
          sort_order?: number
          updated_at?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tmf_sections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_sections_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "tmf_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      tmf_zones: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string | null
          zone_number: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string | null
          zone_number: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string | null
          zone_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tmf_zones_company_id_fkey"
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
          protocol_id: string
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
          protocol_id: string
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
          protocol_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "todos_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "todos_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      training_plan_criteria: {
        Row: {
          created_at: string | null
          id: string
          indication: string | null
          protocol_id: string | null
          region_id: string | null
          scope: string
          site_status: string | null
          training_plan_id: string
          trial_phase: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          indication?: string | null
          protocol_id?: string | null
          region_id?: string | null
          scope: string
          site_status?: string | null
          training_plan_id: string
          trial_phase?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          indication?: string | null
          protocol_id?: string | null
          region_id?: string | null
          scope?: string
          site_status?: string | null
          training_plan_id?: string
          trial_phase?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_criteria_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_criteria_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "training_plan_criteria_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "training_plan_criteria_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "training_plan_criteria_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "clinical_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_criteria_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_training_summary"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "training_plan_criteria_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_version_topics: {
        Row: {
          created_at: string | null
          id: string
          training_topic_id: string
          version_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          training_topic_id: string
          version_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          training_topic_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_version_topics_training_topic_id_fkey"
            columns: ["training_topic_id"]
            isOneToOne: false
            referencedRelation: "training_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_version_topics_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "training_plan_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_versions: {
        Row: {
          archived_date: string | null
          created_at: string | null
          id: string
          name: string
          published_date: string | null
          status: string
          training_plan_id: string
          updated_at: string | null
          version_number: number
        }
        Insert: {
          archived_date?: string | null
          created_at?: string | null
          id?: string
          name: string
          published_date?: string | null
          status?: string
          training_plan_id: string
          updated_at?: string | null
          version_number: number
        }
        Update: {
          archived_date?: string | null
          created_at?: string | null
          id?: string
          name?: string
          published_date?: string | null
          status?: string
          training_plan_id?: string
          updated_at?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_versions_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          obsolete_date: string | null
          process_status: string | null
          publish_result: string | null
          sites_processed: number | null
          total_sites: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          obsolete_date?: string | null
          process_status?: string | null
          publish_result?: string | null
          sites_processed?: number | null
          total_sites?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          obsolete_date?: string | null
          process_status?: string | null
          publish_result?: string | null
          sites_processed?: number | null
          total_sites?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_topics: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          description: string | null
          duration: number | null
          duration_unit: string | null
          id: string
          mandatory: boolean | null
          name: string
          obsolete_date: string | null
          role: string[] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          duration_unit?: string | null
          id?: string
          mandatory?: boolean | null
          name: string
          obsolete_date?: string | null
          role?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          duration_unit?: string | null
          id?: string
          mandatory?: boolean | null
          name?: string
          obsolete_date?: string | null
          role?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_topics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_approvals: {
        Row: {
          id: string
          login: string | null
          new_status: string
          old_status: string | null
          trip_report_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          login?: string | null
          new_status: string
          old_status?: string | null
          trip_report_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          login?: string | null
          new_status?: string
          old_status?: string | null
          trip_report_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_approvals_trip_report_id_fkey"
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
          contact_id: string
          created_at: string | null
          id: string
          role: string | null
          trip_report_id: string
        }
        Insert: {
          attendee_type?: string
          contact_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          trip_report_id: string
        }
        Update: {
          attendee_type?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          trip_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_report_attendees_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_checklist_items: {
        Row: {
          activity: string
          comments: string | null
          created_at: string | null
          id: string
          report_sub_section: string | null
          response: string | null
          reviewer_comments: string | null
          sort_order: number | null
          status: string | null
          trip_report_id: string
          updated_at: string | null
        }
        Insert: {
          activity: string
          comments?: string | null
          created_at?: string | null
          id?: string
          report_sub_section?: string | null
          response?: string | null
          reviewer_comments?: string | null
          sort_order?: number | null
          status?: string | null
          trip_report_id: string
          updated_at?: string | null
        }
        Update: {
          activity?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          report_sub_section?: string | null
          response?: string | null
          reviewer_comments?: string | null
          sort_order?: number | null
          status?: string | null
          trip_report_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_checklist_items_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_crf_tracking: {
        Row: {
          charts_reviewed_date: string | null
          created_at: string | null
          crf_name: string | null
          forms_signed_date: string | null
          id: string
          page_numbers_verified: string | null
          retrieved: boolean | null
          sdv_type: string | null
          source_verified: boolean | null
          subject_identifier: string | null
          subject_visit_id: string | null
          trip_report_id: string
          updated_at: string | null
          visit_name: string | null
        }
        Insert: {
          charts_reviewed_date?: string | null
          created_at?: string | null
          crf_name?: string | null
          forms_signed_date?: string | null
          id?: string
          page_numbers_verified?: string | null
          retrieved?: boolean | null
          sdv_type?: string | null
          source_verified?: boolean | null
          subject_identifier?: string | null
          subject_visit_id?: string | null
          trip_report_id: string
          updated_at?: string | null
          visit_name?: string | null
        }
        Update: {
          charts_reviewed_date?: string | null
          created_at?: string | null
          crf_name?: string | null
          forms_signed_date?: string | null
          id?: string
          page_numbers_verified?: string | null
          retrieved?: boolean | null
          sdv_type?: string | null
          source_verified?: boolean | null
          subject_identifier?: string | null
          subject_visit_id?: string | null
          trip_report_id?: string
          updated_at?: string | null
          visit_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_crf_tracking_subject_visit_id_fkey"
            columns: ["subject_visit_id"]
            isOneToOne: false
            referencedRelation: "subject_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_report_crf_tracking_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_follow_up_items: {
        Row: {
          action_due_date: string | null
          activity: string
          category: string | null
          completed_date: string | null
          created_at: string | null
          date_opened: string | null
          date_resolved: string | null
          description: string | null
          id: string
          reviewer_comments: string | null
          sort_order: number | null
          status: string | null
          trip_report_id: string
          updated_at: string | null
        }
        Insert: {
          action_due_date?: string | null
          activity: string
          category?: string | null
          completed_date?: string | null
          created_at?: string | null
          date_opened?: string | null
          date_resolved?: string | null
          description?: string | null
          id?: string
          reviewer_comments?: string | null
          sort_order?: number | null
          status?: string | null
          trip_report_id: string
          updated_at?: string | null
        }
        Update: {
          action_due_date?: string | null
          activity?: string
          category?: string | null
          completed_date?: string | null
          created_at?: string | null
          date_opened?: string | null
          date_resolved?: string | null
          description?: string | null
          id?: string
          reviewer_comments?: string | null
          sort_order?: number | null
          status?: string | null
          trip_report_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_follow_up_items_trip_report_id_fkey"
            columns: ["trip_report_id"]
            isOneToOne: false
            referencedRelation: "trip_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_template_details: {
        Row: {
          activity: string
          activity_type: string
          created_at: string | null
          id: string
          priority: string | null
          report_order: number | null
          report_sub_section: string | null
          sort_order: number | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          activity: string
          activity_type: string
          created_at?: string | null
          id?: string
          priority?: string | null
          report_order?: number | null
          report_sub_section?: string | null
          sort_order?: number | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          activity?: string
          activity_type?: string
          created_at?: string | null
          id?: string
          priority?: string | null
          report_order?: number | null
          report_sub_section?: string | null
          sort_order?: number | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_template_details_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "trip_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_report_templates: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          protocol_id: string | null
          region: string | null
          updated_at: string | null
          visit_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          protocol_id?: string | null
          region?: string | null
          updated_at?: string | null
          visit_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          protocol_id?: string | null
          region?: string | null
          updated_at?: string | null
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_report_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_report_templates_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_report_templates_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "trip_report_templates_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "trip_report_templates_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      trip_reports: {
        Row: {
          approver_comments: string | null
          approver_id: string | null
          assigned_to_id: string | null
          completed_date: string | null
          created_at: string | null
          crf_reviewer_comments: string | null
          id: string
          narrative: string | null
          notes: string | null
          reviewer_comments: string | null
          reviewer_id: string | null
          site_attendees_reviewer_comments: string | null
          site_visit_id: string
          sponsor_attendees_reviewer_comments: string | null
          status: string
          study_info_reviewer_comments: string | null
          template_id: string | null
          trip_report_completed_date: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approver_comments?: string | null
          approver_id?: string | null
          assigned_to_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          crf_reviewer_comments?: string | null
          id?: string
          narrative?: string | null
          notes?: string | null
          reviewer_comments?: string | null
          reviewer_id?: string | null
          site_attendees_reviewer_comments?: string | null
          site_visit_id: string
          sponsor_attendees_reviewer_comments?: string | null
          status?: string
          study_info_reviewer_comments?: string | null
          template_id?: string | null
          trip_report_completed_date?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approver_comments?: string | null
          approver_id?: string | null
          assigned_to_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          crf_reviewer_comments?: string | null
          id?: string
          narrative?: string | null
          notes?: string | null
          reviewer_comments?: string | null
          reviewer_id?: string | null
          site_attendees_reviewer_comments?: string | null
          site_visit_id?: string
          sponsor_attendees_reviewer_comments?: string | null
          status?: string
          study_info_reviewer_comments?: string | null
          template_id?: string | null
          trip_report_completed_date?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_reports_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "trip_reports_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "trip_reports_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "trip_reports_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "trip_report_templates"
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
          {
            foreignKeyName: "upload_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
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
            referencedRelation: "protocol_assignments"
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
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_read: boolean | null
          created_at: string | null
          id: string
          is_hidden: boolean | null
          module_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_read?: boolean | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          module_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_read?: boolean | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          module_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_protocol_assignments: {
        Row: {
          assigned_at: string | null
          created_by_id: string | null
          creator_email: string | null
          id: string
          protocol_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          protocol_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          created_by_id?: string | null
          creator_email?: string | null
          id?: string
          protocol_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_protocol_assignments_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_protocol_assignments_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_protocol_assignments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_protocol_assignments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "user_protocol_assignments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "user_protocol_assignments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "user_protocol_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_protocol_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      variance_reports: {
        Row: {
          category_breakdown: Json | null
          company_id: string
          created_at: string | null
          generated_by_id: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          protocol_id: string
          report_date: string
          total_actual: number
          total_budgeted: number
          total_variance: number
          updated_at: string | null
          variance_percentage: number | null
        }
        Insert: {
          category_breakdown?: Json | null
          company_id: string
          created_at?: string | null
          generated_by_id?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          protocol_id: string
          report_date: string
          total_actual?: number
          total_budgeted?: number
          total_variance?: number
          updated_at?: string | null
          variance_percentage?: number | null
        }
        Update: {
          category_breakdown?: Json | null
          company_id?: string
          created_at?: string | null
          generated_by_id?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          protocol_id?: string
          report_date?: string
          total_actual?: number
          total_budgeted?: number
          total_variance?: number
          updated_at?: string | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "variance_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_reports_generated_by_id_fkey"
            columns: ["generated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_reports_generated_by_id_fkey"
            columns: ["generated_by_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "variance_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "variance_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "variance_reports_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      vendor_contracts: {
        Row: {
          company_id: string
          contract_number: string | null
          contract_type: string | null
          created_at: string | null
          currency: string | null
          end_date: string | null
          id: string
          protocol_id: string | null
          scope_description: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["vendor_contract_status"]
          title: string
          total_value: number | null
          updated_at: string | null
          vendor_profile_id: string
        }
        Insert: {
          company_id: string
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          protocol_id?: string | null
          scope_description?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["vendor_contract_status"]
          title: string
          total_value?: number | null
          updated_at?: string | null
          vendor_profile_id: string
        }
        Update: {
          company_id?: string
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          protocol_id?: string | null
          scope_description?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["vendor_contract_status"]
          title?: string
          total_value?: number | null
          updated_at?: string | null
          vendor_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_contracts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_contracts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "vendor_contracts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "vendor_contracts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "vendor_contracts_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_deliverables: {
        Row: {
          acceptance_criteria: string | null
          company_id: string
          completed_date: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["vendor_deliverable_status"]
          title: string
          updated_at: string | null
          vendor_contract_id: string
        }
        Insert: {
          acceptance_criteria?: string | null
          company_id: string
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["vendor_deliverable_status"]
          title: string
          updated_at?: string | null
          vendor_contract_id: string
        }
        Update: {
          acceptance_criteria?: string | null
          company_id?: string
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["vendor_deliverable_status"]
          title?: string
          updated_at?: string | null
          vendor_contract_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_deliverables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_deliverables_vendor_contract_id_fkey"
            columns: ["vendor_contract_id"]
            isOneToOne: false
            referencedRelation: "vendor_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_kpis: {
        Row: {
          actual_value: number | null
          company_id: string
          created_at: string | null
          id: string
          kpi_name: string
          measurement_period_end: string | null
          measurement_period_start: string | null
          notes: string | null
          status: Database["public"]["Enums"]["vendor_kpi_status"]
          target_value: number | null
          unit: string | null
          updated_at: string | null
          vendor_profile_id: string
        }
        Insert: {
          actual_value?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          kpi_name: string
          measurement_period_end?: string | null
          measurement_period_start?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["vendor_kpi_status"]
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
          vendor_profile_id: string
        }
        Update: {
          actual_value?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          kpi_name?: string
          measurement_period_end?: string | null
          measurement_period_start?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["vendor_kpi_status"]
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
          vendor_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_kpis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_kpis_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_profiles: {
        Row: {
          company_id: string
          contract_status: Database["public"]["Enums"]["vendor_contract_status"]
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          primary_contact_id: string | null
          qualification_expiry_date: string | null
          qualification_status: string | null
          qualified_date: string | null
          services_description: string | null
          updated_at: string | null
          vendor_category: Database["public"]["Enums"]["vendor_category"]
        }
        Insert: {
          company_id: string
          contract_status?: Database["public"]["Enums"]["vendor_contract_status"]
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          primary_contact_id?: string | null
          qualification_expiry_date?: string | null
          qualification_status?: string | null
          qualified_date?: string | null
          services_description?: string | null
          updated_at?: string | null
          vendor_category?: Database["public"]["Enums"]["vendor_category"]
        }
        Update: {
          company_id?: string
          contract_status?: Database["public"]["Enums"]["vendor_contract_status"]
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          primary_contact_id?: string | null
          qualification_expiry_date?: string | null
          qualification_status?: string | null
          qualified_date?: string | null
          services_description?: string | null
          updated_at?: string | null
          vendor_category?: Database["public"]["Enums"]["vendor_category"]
        }
        Relationships: [
          {
            foreignKeyName: "vendor_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_profiles_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
            foreignKeyName: "vw_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vw_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "vw_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "vw_uploads_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
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
            referencedRelation: "protocol_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Views: {
      protocol_assignments: {
        Row: {
          assigned_at: string | null
          company_id: string | null
          company_name: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          profile_id: string | null
          protocol_id: string | null
          protocol_name: string | null
          protocol_number: string | null
          protocol_status: Database["public"]["Enums"]["protocol_status"] | null
          role: string | null
          trial_phase: Database["public"]["Enums"]["protocol_phase"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_protocols_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_cost_summary: {
        Row: {
          actual_cost: number | null
          budgeted_cost: number | null
          company_id: string | null
          contract_total: number | null
          currency_code: string | null
          payment_earned_total: number | null
          payment_paid_total: number | null
          payment_requested_total: number | null
          protocol_id: string | null
          protocol_number: string | null
          revenue: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          budgeted_cost?: number | null
          company_id?: string | null
          contract_total?: never
          currency_code?: string | null
          payment_earned_total?: never
          payment_paid_total?: never
          payment_requested_total?: never
          protocol_id?: string | null
          protocol_number?: string | null
          revenue?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          budgeted_cost?: number | null
          company_id?: string | null
          contract_total?: never
          currency_code?: string | null
          payment_earned_total?: never
          payment_paid_total?: never
          payment_requested_total?: never
          protocol_id?: string | null
          protocol_number?: string | null
          revenue?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_protocols_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_training_summary: {
        Row: {
          company_id: string | null
          protocol_id: string | null
          protocol_number: string | null
          title: string | null
          total_sites: number | null
          total_trainings: number | null
          trainings_completed: number | null
        }
        Insert: {
          company_id?: string | null
          protocol_id?: string | null
          protocol_number?: string | null
          title?: string | null
          total_sites?: never
          total_trainings?: never
          trainings_completed?: never
        }
        Update: {
          company_id?: string | null
          protocol_id?: string | null
          protocol_number?: string | null
          title?: string | null
          total_sites?: never
          total_trainings?: never
          trainings_completed?: never
        }
        Relationships: [
          {
            foreignKeyName: "clinical_protocols_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      region_training_summary: {
        Row: {
          company_id: string | null
          protocol_id: string | null
          region_id: string | null
          region_name: string | null
          total_sites: number | null
          total_trainings: number | null
          trainings_completed: number | null
        }
        Insert: {
          company_id?: string | null
          protocol_id?: string | null
          region_id?: string | null
          region_name?: string | null
          total_sites?: never
          total_trainings?: never
          trainings_completed?: never
        }
        Update: {
          company_id?: string | null
          protocol_id?: string | null
          region_id?: string | null
          region_name?: string | null
          total_sites?: never
          total_trainings?: never
          trainings_completed?: never
        }
        Relationships: [
          {
            foreignKeyName: "clinical_regions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_regions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_regions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_assignments"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "clinical_regions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_cost_summary"
            referencedColumns: ["protocol_id"]
          },
          {
            foreignKeyName: "clinical_regions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_training_summary"
            referencedColumns: ["protocol_id"]
          },
        ]
      }
      sdv_merged_view: {
        Row: {
          company_id: string | null
          data_source: string | null
          edit_by: string | null
          edit_date_time: string | null
          edit_reason: string | null
          event_name: string | null
          form_name: string | null
          is_initial_entry: boolean | null
          is_verified: boolean | null
          item_display: string | null
          item_export_label: string | null
          item_name: string | null
          merge_key: string | null
          record_id: number | null
          report_id: string | null
          sdv_by: string | null
          sdv_date: string | null
          sdv_upload_id: string | null
          site_name: string | null
          site_upload_id: string | null
          subject_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdv_sdv_data_upload_id_fkey"
            columns: ["sdv_upload_id"]
            isOneToOne: false
            referencedRelation: "sdv_uploads"
            referencedColumns: ["id"]
          },
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
            columns: ["site_upload_id"]
            isOneToOne: false
            referencedRelation: "sdv_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
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
      merge_mvrg_cvorres_fields: { Args: { jsonb_data: Json }; Returns: Json }
      normalize_mc_extra_fields: { Args: { extra_fields: Json }; Returns: Json }
      normalize_mc_field_name: { Args: { field_name: string }; Returns: string }
      normalize_sdv_field_name: {
        Args: { field_name: string }
        Returns: string
      }
      refresh_sdv_merged_view: { Args: never; Returns: undefined }
      seed_company_module_permissions: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      set_company_module_access: {
        Args: {
          p_company_id: string
          p_has_ctms_access: boolean
          p_has_etmf_access: boolean
          p_has_tracker_access: boolean
        }
        Returns: undefined
      }
      set_company_study_tracker_keys: {
        Args: { p_company_id: string; p_keys: string[] }
        Returns: undefined
      }
      set_tracker_platform_access: {
        Args: {
          p_enabled: boolean
          p_tracker_definition_id: string
        }
        Returns: undefined
      }
      platform_create_custom_tracker_definition: {
        Args: {
          p_company_id: string
          p_description?: string | null
          p_entity_type?: string | null
          p_icon?: string | null
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      platform_list_custom_tracker_definitions: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          company_id: string
          company_name: string
          name: string
          slug: string
          platform_access_enabled: boolean
          active: boolean
          updated_at: string
        }[]
      }
      platform_business_analytics: {
        Args: { p_days?: number }
        Returns: Json
      }
      ensure_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      dependency_type:
        | "finish_to_start"
        | "start_to_start"
        | "finish_to_finish"
        | "start_to_finish"
      entity_status: "active" | "inactive" | "pending"
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
      risk_category:
        | "quality"
        | "safety"
        | "regulatory"
        | "operational"
        | "financial"
        | "data_integrity"
        | "compliance"
        | "ethics"
      scorecard_criterion_category:
        | "enrollment"
        | "data_quality"
        | "compliance"
        | "safety"
        | "operational"
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
      ],
      dependency_type: [
        "finish_to_start",
        "start_to_start",
        "finish_to_finish",
        "start_to_finish",
      ],
      entity_status: ["active", "inactive", "pending"],
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
      scorecard_criterion_category: [
        "enrollment",
        "data_quality",
        "compliance",
        "safety",
        "operational",
      ],
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
    },
  },
} as const
