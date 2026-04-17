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
        ]
      }
      bf_brand_directions: {
        Row: {
          color_palette: Json | null
          created_at: string
          icon_style: string | null
          id: string
          imagery_direction: string | null
          logo_directions: Json | null
          mood: string | null
          patient_communication_style: string | null
          project_id: string
          tagline_options: string[] | null
          tone_variants: Json | null
          typography_recommendations: Json | null
          visual_direction: string | null
        }
        Insert: {
          color_palette?: Json | null
          created_at?: string
          icon_style?: string | null
          id?: string
          imagery_direction?: string | null
          logo_directions?: Json | null
          mood?: string | null
          patient_communication_style?: string | null
          project_id: string
          tagline_options?: string[] | null
          tone_variants?: Json | null
          typography_recommendations?: Json | null
          visual_direction?: string | null
        }
        Update: {
          color_palette?: Json | null
          created_at?: string
          icon_style?: string | null
          id?: string
          imagery_direction?: string | null
          logo_directions?: Json | null
          mood?: string | null
          patient_communication_style?: string | null
          project_id?: string
          tagline_options?: string[] | null
          tone_variants?: Json | null
          typography_recommendations?: Json | null
          visual_direction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bf_brand_directions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_brand_inputs: {
        Row: {
          additional_imagery_guidelines: string | null
          brand_direction: string[] | null
          brand_name: string | null
          communication_goals: string[] | null
          countries: string[] | null
          created_at: string
          cro: string | null
          device_or_drug: string | null
          icon_preference: string | null
          id: string
          indication: string | null
          industry: string | null
          is_patient_facing: boolean | null
          keywords: string[] | null
          patient_population: string | null
          phase: string | null
          preferred_colors: string[] | null
          project_id: string
          protocol_number: string | null
          severity: string | null
          sponsor: string | null
          study_name: string | null
          style_preset: string | null
          tagline: string | null
          target_audience: string[] | null
          therapeutic_area: string | null
          trial_type: string | null
          typography_preference: string | null
          updated_at: string
          visual_preference: string | null
        }
        Insert: {
          additional_imagery_guidelines?: string | null
          brand_direction?: string[] | null
          brand_name?: string | null
          communication_goals?: string[] | null
          countries?: string[] | null
          created_at?: string
          cro?: string | null
          device_or_drug?: string | null
          icon_preference?: string | null
          id?: string
          indication?: string | null
          industry?: string | null
          is_patient_facing?: boolean | null
          keywords?: string[] | null
          patient_population?: string | null
          phase?: string | null
          preferred_colors?: string[] | null
          project_id: string
          protocol_number?: string | null
          severity?: string | null
          sponsor?: string | null
          study_name?: string | null
          style_preset?: string | null
          tagline?: string | null
          target_audience?: string[] | null
          therapeutic_area?: string | null
          trial_type?: string | null
          typography_preference?: string | null
          updated_at?: string
          visual_preference?: string | null
        }
        Update: {
          additional_imagery_guidelines?: string | null
          brand_direction?: string[] | null
          brand_name?: string | null
          communication_goals?: string[] | null
          countries?: string[] | null
          created_at?: string
          cro?: string | null
          device_or_drug?: string | null
          icon_preference?: string | null
          id?: string
          indication?: string | null
          industry?: string | null
          is_patient_facing?: boolean | null
          keywords?: string[] | null
          patient_population?: string | null
          phase?: string | null
          preferred_colors?: string[] | null
          project_id?: string
          protocol_number?: string | null
          severity?: string | null
          sponsor?: string | null
          study_name?: string | null
          style_preset?: string | null
          tagline?: string | null
          target_audience?: string[] | null
          therapeutic_area?: string | null
          trial_type?: string | null
          typography_preference?: string | null
          updated_at?: string
          visual_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bf_brand_inputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_brand_kit_versions: {
        Row: {
          brand_kit_id: string
          change_summary: string | null
          changed_by: string
          created_at: string
          id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          brand_kit_id: string
          change_summary?: string | null
          changed_by: string
          created_at?: string
          id?: string
          snapshot: Json
          version_number?: number
        }
        Update: {
          brand_kit_id?: string
          change_summary?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "bf_brand_kit_versions_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "bf_brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_brand_kits: {
        Row: {
          brand_voice_summary: string | null
          color_palette: Json | null
          created_at: string
          font_pairing: Json | null
          icon_mark_concept_id: string | null
          id: string
          primary_logo_concept_id: string | null
          project_id: string
          secondary_logo_concept_id: string | null
          updated_at: string
          usage_guidance: string | null
        }
        Insert: {
          brand_voice_summary?: string | null
          color_palette?: Json | null
          created_at?: string
          font_pairing?: Json | null
          icon_mark_concept_id?: string | null
          id?: string
          primary_logo_concept_id?: string | null
          project_id: string
          secondary_logo_concept_id?: string | null
          updated_at?: string
          usage_guidance?: string | null
        }
        Update: {
          brand_voice_summary?: string | null
          color_palette?: Json | null
          created_at?: string
          font_pairing?: Json | null
          icon_mark_concept_id?: string | null
          id?: string
          primary_logo_concept_id?: string | null
          project_id?: string
          secondary_logo_concept_id?: string | null
          updated_at?: string
          usage_guidance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bf_brand_kits_icon_mark_concept_id_fkey"
            columns: ["icon_mark_concept_id"]
            isOneToOne: false
            referencedRelation: "bf_logo_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bf_brand_kits_primary_logo_concept_id_fkey"
            columns: ["primary_logo_concept_id"]
            isOneToOne: false
            referencedRelation: "bf_logo_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bf_brand_kits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bf_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bf_brand_kits_secondary_logo_concept_id_fkey"
            columns: ["secondary_logo_concept_id"]
            isOneToOne: false
            referencedRelation: "bf_logo_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_exports: {
        Row: {
          brand_kit_id: string | null
          created_at: string
          export_type: string
          file_name: string | null
          id: string
          project_id: string
          storage_path: string | null
        }
        Insert: {
          brand_kit_id?: string | null
          created_at?: string
          export_type: string
          file_name?: string | null
          id?: string
          project_id: string
          storage_path?: string | null
        }
        Update: {
          brand_kit_id?: string | null
          created_at?: string
          export_type?: string
          file_name?: string | null
          id?: string
          project_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bf_exports_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "bf_brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bf_exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_logo_concepts: {
        Row: {
          created_at: string
          generation_metadata: Json | null
          id: string
          is_favorite: boolean
          is_selected: boolean
          png_storage_path: string | null
          project_id: string
          prompt: string | null
          svg_storage_path: string | null
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          generation_metadata?: Json | null
          id?: string
          is_favorite?: boolean
          is_selected?: boolean
          png_storage_path?: string | null
          project_id: string
          prompt?: string | null
          svg_storage_path?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          generation_metadata?: Json | null
          id?: string
          is_favorite?: boolean
          is_selected?: boolean
          png_storage_path?: string | null
          project_id?: string
          prompt?: string | null
          svg_storage_path?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bf_logo_concepts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_material_themes: {
        Row: {
          created_at: string
          id: string
          monitoring_visit_styling: Json | null
          newsletter_styling: Json | null
          one_pager_layout: Json | null
          pdf_styling: Json | null
          powerpoint_theme: Json | null
          project_id: string
          siv_deck_styling: Json | null
          training_manual_styling: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          monitoring_visit_styling?: Json | null
          newsletter_styling?: Json | null
          one_pager_layout?: Json | null
          pdf_styling?: Json | null
          powerpoint_theme?: Json | null
          project_id: string
          siv_deck_styling?: Json | null
          training_manual_styling?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          monitoring_visit_styling?: Json | null
          newsletter_styling?: Json | null
          one_pager_layout?: Json | null
          pdf_styling?: Json | null
          powerpoint_theme?: Json | null
          project_id?: string
          siv_deck_styling?: Json | null
          training_manual_styling?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bf_material_themes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_mockups: {
        Row: {
          created_at: string
          custom_hint: string | null
          id: string
          is_favorite: boolean
          mockup_type: string
          project_id: string
          prompt: string | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          custom_hint?: string | null
          id?: string
          is_favorite?: boolean
          mockup_type: string
          project_id: string
          prompt?: string | null
          storage_path: string
        }
        Update: {
          created_at?: string
          custom_hint?: string | null
          id?: string
          is_favorite?: boolean
          mockup_type?: string
          project_id?: string
          prompt?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "bf_mockups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_projects: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bf_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_recruitment_kits: {
        Row: {
          brochure_tone: string | null
          campaign_palette: Json | null
          created_at: string
          cta_styles: Json | null
          diversity_imagery_guidance: string | null
          headline_styles: Json | null
          id: string
          project_id: string
          social_ad_direction: string | null
          updated_at: string
        }
        Insert: {
          brochure_tone?: string | null
          campaign_palette?: Json | null
          created_at?: string
          cta_styles?: Json | null
          diversity_imagery_guidance?: string | null
          headline_styles?: Json | null
          id?: string
          project_id: string
          social_ad_direction?: string | null
          updated_at?: string
        }
        Update: {
          brochure_tone?: string | null
          campaign_palette?: Json | null
          created_at?: string
          cta_styles?: Json | null
          diversity_imagery_guidance?: string | null
          headline_styles?: Json | null
          id?: string
          project_id?: string
          social_ad_direction?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bf_recruitment_kits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bf_share_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          project_id: string
          revoked: boolean
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          project_id: string
          revoked?: boolean
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          project_id?: string
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "bf_share_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          budget_id: string
          category: string
          cost_basis: string | null
          created_at: string
          description: string
          direct_cost: number | null
          id: string
          indirect_cost: number | null
          notes: string | null
          quantity: number
          section_id: string | null
          sort_order: number
          total_cost: number | null
          unit_cost: number
        }
        Insert: {
          budget_id: string
          category: string
          cost_basis?: string | null
          created_at?: string
          description: string
          direct_cost?: number | null
          id?: string
          indirect_cost?: number | null
          notes?: string | null
          quantity?: number
          section_id?: string | null
          sort_order?: number
          total_cost?: number | null
          unit_cost?: number
        }
        Update: {
          budget_id?: string
          category?: string
          cost_basis?: string | null
          created_at?: string
          description?: string
          direct_cost?: number | null
          id?: string
          indirect_cost?: number | null
          notes?: string | null
          quantity?: number
          section_id?: string | null
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
          {
            foreignKeyName: "budget_line_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "study_budget_sections"
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
          company_id: string
          created_at: string | null
          enabled_study_tracker_keys: string[]
          has_brandforge_access: boolean
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
          company_id?: string
          created_at?: string | null
          enabled_study_tracker_keys?: string[]
          has_brandforge_access?: boolean
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
          company_id?: string
          created_at?: string | null
          enabled_study_tracker_keys?: string[]
          has_brandforge_access?: boolean
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
        Relationships: []
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
      eisf_audit_log: {
        Row: {
          action: string
          company_id: string
          eisf_document_id: string | null
          eisf_document_request_id: string | null
          eisf_document_version_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          company_id: string
          eisf_document_id?: string | null
          eisf_document_request_id?: string | null
          eisf_document_version_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          eisf_document_id?: string | null
          eisf_document_request_id?: string | null
          eisf_document_version_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eisf_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_audit_log_eisf_document_id_fkey"
            columns: ["eisf_document_id"]
            isOneToOne: false
            referencedRelation: "eisf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_audit_log_eisf_document_request_id_fkey"
            columns: ["eisf_document_request_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_audit_log_eisf_document_version_id_fkey"
            columns: ["eisf_document_version_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eisf_document_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "eisf_document_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eisf_document_request_comments: {
        Row: {
          author_id: string
          body: string
          company_id: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          author_id: string
          body: string
          company_id: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eisf_document_request_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_request_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      eisf_document_requests: {
        Row: {
          assigned_to: string | null
          cancelled_at: string | null
          category_id: string | null
          company_id: string
          created_at: string
          decline_reason: string | null
          due_date: string | null
          folder_id: string
          fulfilled_at: string | null
          fulfilled_document_id: string | null
          fulfilled_version_id: string | null
          id: string
          instructions: string
          priority: Database["public"]["Enums"]["eisf_request_priority"]
          requested_by: string
          status: Database["public"]["Enums"]["eisf_request_status"]
          study_id: string
          title: string
          tmf_ref_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cancelled_at?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string
          decline_reason?: string | null
          due_date?: string | null
          folder_id: string
          fulfilled_at?: string | null
          fulfilled_document_id?: string | null
          fulfilled_version_id?: string | null
          id?: string
          instructions?: string
          priority?: Database["public"]["Enums"]["eisf_request_priority"]
          requested_by: string
          status?: Database["public"]["Enums"]["eisf_request_status"]
          study_id: string
          title: string
          tmf_ref_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cancelled_at?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string
          decline_reason?: string | null
          due_date?: string | null
          folder_id?: string
          fulfilled_at?: string | null
          fulfilled_document_id?: string | null
          fulfilled_version_id?: string | null
          id?: string
          instructions?: string
          priority?: Database["public"]["Enums"]["eisf_request_priority"]
          requested_by?: string
          status?: Database["public"]["Enums"]["eisf_request_status"]
          study_id?: string
          title?: string
          tmf_ref_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eisf_document_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_requests_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "eisf_site_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_requests_fulfilled_document_id_fkey"
            columns: ["fulfilled_document_id"]
            isOneToOne: false
            referencedRelation: "eisf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_requests_fulfilled_version_id_fkey"
            columns: ["fulfilled_version_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_requests_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_requests_tmf_ref_id_fkey"
            columns: ["tmf_ref_id"]
            isOneToOne: false
            referencedRelation: "tmf_reference_model"
            referencedColumns: ["id"]
          },
        ]
      }
      eisf_document_versions: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          effective_date: string | null
          expiration_date: string | null
          file_format: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          storage_path: string | null
          uploaded_by: string | null
          version_label: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id: string
          effective_date?: string | null
          expiration_date?: string | null
          file_format?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          storage_path?: string | null
          uploaded_by?: string | null
          version_label?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          effective_date?: string | null
          expiration_date?: string | null
          file_format?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          storage_path?: string | null
          uploaded_by?: string | null
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "eisf_document_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "eisf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eisf_documents: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_version_id: string | null
          etmf_document_id: string | null
          expires_on: string | null
          folder_id: string
          id: string
          primary_site_contact_id: string | null
          primary_staff_member_id: string | null
          source_request_id: string | null
          status: Database["public"]["Enums"]["eisf_document_status"]
          study_id: string
          title: string
          tmf_ref_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          etmf_document_id?: string | null
          expires_on?: string | null
          folder_id: string
          id?: string
          primary_site_contact_id?: string | null
          primary_staff_member_id?: string | null
          source_request_id?: string | null
          status?: Database["public"]["Enums"]["eisf_document_status"]
          study_id: string
          title: string
          tmf_ref_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          etmf_document_id?: string | null
          expires_on?: string | null
          folder_id?: string
          id?: string
          primary_site_contact_id?: string | null
          primary_staff_member_id?: string | null
          source_request_id?: string | null
          status?: Database["public"]["Enums"]["eisf_document_status"]
          study_id?: string
          title?: string
          tmf_ref_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eisf_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_etmf_document_id_fkey"
            columns: ["etmf_document_id"]
            isOneToOne: false
            referencedRelation: "etmf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "eisf_site_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_primary_site_contact_id_fkey"
            columns: ["primary_site_contact_id"]
            isOneToOne: false
            referencedRelation: "site_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_primary_staff_member_id_fkey"
            columns: ["primary_staff_member_id"]
            isOneToOne: false
            referencedRelation: "study_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_source_request_fk"
            columns: ["source_request_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_documents_tmf_ref_id_fkey"
            columns: ["tmf_ref_id"]
            isOneToOne: false
            referencedRelation: "tmf_reference_model"
            referencedColumns: ["id"]
          },
        ]
      }
      eisf_required_document_rules: {
        Row: {
          active: boolean
          category_id: string | null
          company_id: string
          created_at: string
          id: string
          role_name: string | null
          rule_label: string
          study_id: string
          study_site_id: string | null
          tmf_ref_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          role_name?: string | null
          rule_label: string
          study_id: string
          study_site_id?: string | null
          tmf_ref_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          role_name?: string | null
          rule_label?: string
          study_id?: string
          study_site_id?: string | null
          tmf_ref_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eisf_required_document_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_required_document_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_required_document_rules_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_required_document_rules_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "eisf_required_document_rules_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_required_document_rules_tmf_ref_id_fkey"
            columns: ["tmf_ref_id"]
            isOneToOne: false
            referencedRelation: "tmf_reference_model"
            referencedColumns: ["id"]
          },
        ]
      }
      eisf_review_events: {
        Row: {
          comment: string | null
          company_id: string
          created_at: string
          decision: Database["public"]["Enums"]["eisf_review_decision"]
          document_id: string
          id: string
          reviewer_id: string | null
          version_id: string
        }
        Insert: {
          comment?: string | null
          company_id: string
          created_at?: string
          decision: Database["public"]["Enums"]["eisf_review_decision"]
          document_id: string
          id?: string
          reviewer_id?: string | null
          version_id: string
        }
        Update: {
          comment?: string | null
          company_id?: string
          created_at?: string
          decision?: Database["public"]["Enums"]["eisf_review_decision"]
          document_id?: string
          id?: string
          reviewer_id?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eisf_review_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_review_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "eisf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_review_events_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_review_events_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "eisf_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      eisf_site_folders: {
        Row: {
          company_id: string
          created_at: string
          display_name: string | null
          id: string
          study_country_id: string
          study_id: string
          study_site_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          study_country_id: string
          study_id: string
          study_site_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          study_country_id?: string
          study_id?: string
          study_site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eisf_site_folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_site_folders_study_country_id_fkey"
            columns: ["study_country_id"]
            isOneToOne: false
            referencedRelation: "study_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_site_folders_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eisf_site_folders_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: true
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "eisf_site_folders_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: true
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      etmf_audit_log: {
        Row: {
          action: string
          company_id: string
          etmf_document_id: string
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          company_id: string
          etmf_document_id: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          etmf_document_id?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etmf_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_audit_log_etmf_document_id_fkey"
            columns: ["etmf_document_id"]
            isOneToOne: false
            referencedRelation: "etmf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      etmf_documents: {
        Row: {
          approval_date: string | null
          company_id: string
          created_at: string
          document_date: string | null
          document_name: string
          document_signed_date: string | null
          document_status: Database["public"]["Enums"]["etmf_document_status"]
          expiration_date: string | null
          file_format: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          initial_submission_date: string | null
          language: string | null
          qc_review_date: string | null
          qc_reviewer_id: string | null
          rejection_reason: string | null
          site_id: string | null
          staff_member_id: string | null
          storage_path: string | null
          study_country_id: string | null
          study_id: string
          submitter_id: string | null
          tmf_ref_id: string | null
          updated_at: string
          version: string | null
          version_date: string | null
          version_type: string | null
        }
        Insert: {
          approval_date?: string | null
          company_id: string
          created_at?: string
          document_date?: string | null
          document_name: string
          document_signed_date?: string | null
          document_status?: Database["public"]["Enums"]["etmf_document_status"]
          expiration_date?: string | null
          file_format?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          initial_submission_date?: string | null
          language?: string | null
          qc_review_date?: string | null
          qc_reviewer_id?: string | null
          rejection_reason?: string | null
          site_id?: string | null
          staff_member_id?: string | null
          storage_path?: string | null
          study_country_id?: string | null
          study_id: string
          submitter_id?: string | null
          tmf_ref_id?: string | null
          updated_at?: string
          version?: string | null
          version_date?: string | null
          version_type?: string | null
        }
        Update: {
          approval_date?: string | null
          company_id?: string
          created_at?: string
          document_date?: string | null
          document_name?: string
          document_signed_date?: string | null
          document_status?: Database["public"]["Enums"]["etmf_document_status"]
          expiration_date?: string | null
          file_format?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          initial_submission_date?: string | null
          language?: string | null
          qc_review_date?: string | null
          qc_reviewer_id?: string | null
          rejection_reason?: string | null
          site_id?: string | null
          staff_member_id?: string | null
          storage_path?: string | null
          study_country_id?: string | null
          study_id?: string
          submitter_id?: string | null
          tmf_ref_id?: string | null
          updated_at?: string
          version?: string | null
          version_date?: string | null
          version_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etmf_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_documents_qc_reviewer_id_fkey"
            columns: ["qc_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "etmf_documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_documents_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "study_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_documents_study_country_id_fkey"
            columns: ["study_country_id"]
            isOneToOne: false
            referencedRelation: "study_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_documents_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_documents_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_documents_tmf_ref_id_fkey"
            columns: ["tmf_ref_id"]
            isOneToOne: false
            referencedRelation: "tmf_reference_model"
            referencedColumns: ["id"]
          },
        ]
      }
      etmf_expected_documents: {
        Row: {
          company_id: string
          country_level_yes: boolean
          created_at: string
          edl_yes: boolean
          id: string
          site_level_yes: boolean
          study_id: string
          tmf_ref_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          country_level_yes?: boolean
          created_at?: string
          edl_yes?: boolean
          id?: string
          site_level_yes?: boolean
          study_id: string
          tmf_ref_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          country_level_yes?: boolean
          created_at?: string
          edl_yes?: boolean
          id?: string
          site_level_yes?: boolean
          study_id?: string
          tmf_ref_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etmf_expected_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_expected_documents_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_expected_documents_tmf_ref_id_fkey"
            columns: ["tmf_ref_id"]
            isOneToOne: false
            referencedRelation: "tmf_reference_model"
            referencedColumns: ["id"]
          },
        ]
      }
      etmf_staff_expected_documents: {
        Row: {
          company_id: string
          created_at: string
          id: string
          required: boolean
          role_name: string
          site_id: string
          study_id: string
          tmf_ref_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          required?: boolean
          role_name: string
          site_id: string
          study_id: string
          tmf_ref_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          required?: boolean
          role_name?: string
          site_id?: string
          study_id?: string
          tmf_ref_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etmf_staff_expected_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_staff_expected_documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "etmf_staff_expected_documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_staff_expected_documents_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etmf_staff_expected_documents_tmf_ref_id_fkey"
            columns: ["tmf_ref_id"]
            isOneToOne: false
            referencedRelation: "tmf_reference_model"
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
            foreignKeyName: "finance_invoice_decisions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "report_invoices"
            referencedColumns: ["invoice_id"]
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
          external_invoice_id: string
          extracted_at: string | null
          extracted_data: Json | null
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
          external_invoice_id: string
          extracted_at?: string | null
          extracted_data?: Json | null
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
          external_invoice_id?: string
          extracted_at?: string | null
          extracted_data?: Json | null
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
            foreignKeyName: "finance_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "report_invoices"
            referencedColumns: ["invoice_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
            referencedRelation: "report_trip_reports"
            referencedColumns: ["trip_report_id"]
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
            foreignKeyName: "header_mappings_company_id_fkey"
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
            foreignKeyName: "invoice_budget_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "report_invoices"
            referencedColumns: ["invoice_id"]
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
            foreignKeyName: "ip_item_site_links_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ip_v_log_rows"
            referencedColumns: ["item_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
      ip_items: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          min_stock_threshold: number | null
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
          min_stock_threshold?: number | null
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
          min_stock_threshold?: number | null
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
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
            foreignKeyName: "ip_ledger_entries_ip_order_id_fkey"
            columns: ["ip_order_id"]
            isOneToOne: false
            referencedRelation: "ip_v_log_rows"
            referencedColumns: ["order_id"]
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
            referencedRelation: "report_subjects"
            referencedColumns: ["subject_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
            foreignKeyName: "ip_order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ip_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ip_v_log_rows"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ip_order_documents_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_order_documents_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "ip_orders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ip_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_orders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ip_v_log_rows"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "ip_orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "ip_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "ip_v_log_rows"
            referencedColumns: ["lot_id"]
          },
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "ip_orders_study_site_id_fkey"
            columns: ["study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
            foreignKeyName: "patient_uploads_company_id_fkey"
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
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
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean
          is_platform_admin: boolean
          last_name: string | null
          role: string
          subscription_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          is_platform_admin?: boolean
          last_name?: string | null
          role?: string
          subscription_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          is_platform_admin?: boolean
          last_name?: string | null
          role?: string
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
      report_definitions: {
        Row: {
          chart_config: Json
          company_id: string
          created_at: string
          created_by_profile_id: string
          dataset_key: string
          description: string | null
          filters: Json
          grouping: Json
          id: string
          is_active: boolean
          is_shared: boolean
          last_run_at: string | null
          name: string
          schedule_config: Json | null
          schema_version: number
          selected_fields: Json
          study_id: string | null
          summary_metrics: Json
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          chart_config?: Json
          company_id: string
          created_at?: string
          created_by_profile_id: string
          dataset_key: string
          description?: string | null
          filters?: Json
          grouping?: Json
          id?: string
          is_active?: boolean
          is_shared?: boolean
          last_run_at?: string | null
          name: string
          schedule_config?: Json | null
          schema_version?: number
          selected_fields?: Json
          study_id?: string | null
          summary_metrics?: Json
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          chart_config?: Json
          company_id?: string
          created_at?: string
          created_by_profile_id?: string
          dataset_key?: string
          description?: string | null
          filters?: Json
          grouping?: Json
          id?: string
          is_active?: boolean
          is_shared?: boolean
          last_run_at?: string | null
          name?: string
          schedule_config?: Json | null
          schema_version?: number
          selected_fields?: Json
          study_id?: string | null
          summary_metrics?: Json
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_definitions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_definitions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_definitions_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports_audit: {
        Row: {
          bytes_written: number | null
          company_id: string
          completed_at: string | null
          created_at: string
          dataset_key: string
          error_code: string | null
          error_message: string | null
          export_context: string
          export_format: string
          file_name: string
          id: string
          report_definition_id: string | null
          report_run_id: string | null
          requested_by_profile_id: string
          row_count: number | null
          started_at: string
          status: string
          storage_path: string | null
          study_id: string | null
          updated_at: string
        }
        Insert: {
          bytes_written?: number | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          dataset_key: string
          error_code?: string | null
          error_message?: string | null
          export_context?: string
          export_format: string
          file_name: string
          id?: string
          report_definition_id?: string | null
          report_run_id?: string | null
          requested_by_profile_id: string
          row_count?: number | null
          started_at?: string
          status?: string
          storage_path?: string | null
          study_id?: string | null
          updated_at?: string
        }
        Update: {
          bytes_written?: number | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          dataset_key?: string
          error_code?: string | null
          error_message?: string | null
          export_context?: string
          export_format?: string
          file_name?: string
          id?: string
          report_definition_id?: string | null
          report_run_id?: string | null
          requested_by_profile_id?: string
          row_count?: number | null
          started_at?: string
          status?: string
          storage_path?: string | null
          study_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_audit_report_definition_id_fkey"
            columns: ["report_definition_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_audit_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_audit_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_audit_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs_audit: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          dataset_key: string
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          executed_by_profile_id: string
          filters: Json
          grouping: Json
          id: string
          parameters: Json
          report_definition_id: string | null
          row_count: number | null
          run_context: string
          selected_fields: Json
          started_at: string
          status: string
          study_id: string | null
          summary_metrics: Json
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          dataset_key: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          executed_by_profile_id: string
          filters?: Json
          grouping?: Json
          id?: string
          parameters?: Json
          report_definition_id?: string | null
          row_count?: number | null
          run_context?: string
          selected_fields?: Json
          started_at?: string
          status?: string
          study_id?: string | null
          summary_metrics?: Json
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          dataset_key?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          executed_by_profile_id?: string
          filters?: Json
          grouping?: Json
          id?: string
          parameters?: Json
          report_definition_id?: string | null
          row_count?: number | null
          run_context?: string
          selected_fields?: Json
          started_at?: string
          status?: string
          study_id?: string | null
          summary_metrics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_audit_executed_by_profile_id_fkey"
            columns: ["executed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_audit_report_definition_id_fkey"
            columns: ["report_definition_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_audit_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
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
            foreignKeyName: "sdv_reports_sdv_upload_fk"
            columns: ["sdv_data_upload_id"]
            isOneToOne: false
            referencedRelation: "sdv_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdv_reports_site_upload_fk"
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
          processed_count: number
          profile_id: string
          progress: number
          record_count: number
          report_id: string | null
          status: string
          total_count: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          file_name: string
          file_type: string
          id?: string
          processed_count?: number
          profile_id: string
          progress?: number
          record_count?: number
          report_id?: string | null
          status?: string
          total_count?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_type?: string
          id?: string
          processed_count?: number
          profile_id?: string
          progress?: number
          record_count?: number
          report_id?: string | null
          status?: string
          total_count?: number
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
      site_budget_line_items: {
        Row: {
          cost_basis: string | null
          cost_with_overhead: number | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          notes: string | null
          overhead_amount: number | null
          overhead_rate: number | null
          paid_to: string
          quantity: number
          section: string
          site_budget_id: string
          sort_order: number
          source_line_id: string | null
          total_cost: number | null
          unit_cost: number
        }
        Insert: {
          cost_basis?: string | null
          cost_with_overhead?: number | null
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          notes?: string | null
          overhead_amount?: number | null
          overhead_rate?: number | null
          paid_to?: string
          quantity?: number
          section: string
          site_budget_id: string
          sort_order?: number
          source_line_id?: string | null
          total_cost?: number | null
          unit_cost?: number
        }
        Update: {
          cost_basis?: string | null
          cost_with_overhead?: number | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          overhead_amount?: number | null
          overhead_rate?: number | null
          paid_to?: string
          quantity?: number
          section?: string
          site_budget_id?: string
          sort_order?: number
          source_line_id?: string | null
          total_cost?: number | null
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
          {
            foreignKeyName: "site_budget_line_items_source_line_id_fkey"
            columns: ["source_line_id"]
            isOneToOne: false
            referencedRelation: "budget_line_items"
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
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
          {
            foreignKeyName: "site_budgets_supersedes_budget_id_fkey"
            columns: ["supersedes_budget_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
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
          study_name: string | null
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
          study_name?: string | null
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
          study_name?: string | null
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
      study_budget_sections: {
        Row: {
          budget_id: string
          created_at: string
          id: string
          indirect_rate: number | null
          name: string
          section_type: string
          sort_order: number
        }
        Insert: {
          budget_id: string
          created_at?: string
          id?: string
          indirect_rate?: number | null
          name: string
          section_type: string
          sort_order?: number
        }
        Update: {
          budget_id?: string
          created_at?: string
          id?: string
          indirect_rate?: number | null
          name?: string
          section_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_budget_sections_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "study_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      study_budget_templates: {
        Row: {
          cloned_from_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          default_indirect_rate: number | null
          description: string | null
          id: string
          name: string
          section_definitions: Json
          updated_at: string
          version: number
          visit_schedule: Json | null
        }
        Insert: {
          cloned_from_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          default_indirect_rate?: number | null
          description?: string | null
          id?: string
          name: string
          section_definitions?: Json
          updated_at?: string
          version?: number
          visit_schedule?: Json | null
        }
        Update: {
          cloned_from_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_indirect_rate?: number | null
          description?: string | null
          id?: string
          name?: string
          section_definitions?: Json
          updated_at?: string
          version?: number
          visit_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "study_budget_templates_cloned_from_id_fkey"
            columns: ["cloned_from_id"]
            isOneToOne: false
            referencedRelation: "study_budget_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_budget_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_budget_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          indirect_rate: number | null
          name: string
          planned_enrollment: number | null
          status: string
          study_duration_months: number | null
          study_id: string
          supersedes_budget_id: string | null
          template_id: string | null
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
          indirect_rate?: number | null
          name: string
          planned_enrollment?: number | null
          status?: string
          study_duration_months?: number | null
          study_id: string
          supersedes_budget_id?: string | null
          template_id?: string | null
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
          indirect_rate?: number | null
          name?: string
          planned_enrollment?: number | null
          status?: string
          study_duration_months?: number | null
          study_id?: string
          supersedes_budget_id?: string | null
          template_id?: string | null
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
          {
            foreignKeyName: "study_budgets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "study_budget_templates"
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
      study_procedure_visit_costs: {
        Row: {
          created_at: string
          id: string
          is_applicable: boolean
          procedure_name: string
          section_id: string
          sort_order: number
          unit_cost: number
          visit_definition_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_applicable?: boolean
          procedure_name: string
          section_id: string
          sort_order?: number
          unit_cost?: number
          visit_definition_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_applicable?: boolean
          procedure_name?: string
          section_id?: string
          sort_order?: number
          unit_cost?: number
          visit_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_procedure_visit_costs_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "study_budget_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_procedure_visit_costs_visit_definition_id_fkey"
            columns: ["visit_definition_id"]
            isOneToOne: false
            referencedRelation: "study_visit_definitions"
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
          geocode_status: string | null
          geocoded_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
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
          geocode_status?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
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
          geocode_status?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
      study_visit_definitions: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          study_id: string
          timepoint_days: number | null
          timepoint_label: string | null
          visit_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          study_id: string
          timepoint_days?: number | null
          timepoint_label?: string | null
          visit_name: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          study_id?: string
          timepoint_days?: number | null
          timepoint_label?: string | null
          visit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_visit_definitions_study_id_fkey"
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
            referencedRelation: "report_subjects"
            referencedColumns: ["subject_id"]
          },
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
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
            referencedRelation: "report_tasks"
            referencedColumns: ["task_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
          site_id: string | null
          sort_index: number
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
          site_id?: string | null
          sort_index?: number
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
          site_id?: string | null
          sort_index?: number
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
      tmf_reference_model: {
        Row: {
          artifact_name: string
          artifact_number: string
          core_or_recommended: string | null
          country_level_document: boolean | null
          country_level_milestone: string | null
          created_at: string
          dating_convention: string | null
          definition_purpose: string | null
          ich_code: boolean | null
          id: string
          iso_14155: boolean | null
          process_name: string | null
          process_number: number | null
          recommended_sub_artifact: string | null
          section_name: string
          section_number: string
          site_level_document: boolean | null
          trial_level_document: boolean | null
          trial_level_milestone: string | null
          zone_name: string
          zone_number: number
        }
        Insert: {
          artifact_name: string
          artifact_number: string
          core_or_recommended?: string | null
          country_level_document?: boolean | null
          country_level_milestone?: string | null
          created_at?: string
          dating_convention?: string | null
          definition_purpose?: string | null
          ich_code?: boolean | null
          id?: string
          iso_14155?: boolean | null
          process_name?: string | null
          process_number?: number | null
          recommended_sub_artifact?: string | null
          section_name: string
          section_number: string
          site_level_document?: boolean | null
          trial_level_document?: boolean | null
          trial_level_milestone?: string | null
          zone_name: string
          zone_number: number
        }
        Update: {
          artifact_name?: string
          artifact_number?: string
          core_or_recommended?: string | null
          country_level_document?: boolean | null
          country_level_milestone?: string | null
          created_at?: string
          dating_convention?: string | null
          definition_purpose?: string | null
          ich_code?: boolean | null
          id?: string
          iso_14155?: boolean | null
          process_name?: string | null
          process_number?: number | null
          recommended_sub_artifact?: string | null
          section_name?: string
          section_number?: string
          site_level_document?: boolean | null
          trial_level_document?: boolean | null
          trial_level_milestone?: string | null
          zone_name?: string
          zone_number?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number | null
          company_id: string | null
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          status: string | null
          stripe_customer_id: string | null
          stripe_event_id: string
          stripe_event_type: string
          stripe_invoice_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_event_id: string
          stripe_event_type: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string
          stripe_event_type?: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "report_trip_reports"
            referencedColumns: ["trip_report_id"]
          },
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
            referencedRelation: "report_trip_reports"
            referencedColumns: ["trip_report_id"]
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
            referencedRelation: "report_trip_reports"
            referencedColumns: ["trip_report_id"]
          },
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
            referencedRelation: "report_trip_reports"
            referencedColumns: ["trip_report_id"]
          },
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
            referencedRelation: "report_trip_reports"
            referencedColumns: ["trip_report_id"]
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
            referencedRelation: "report_trip_reports"
            referencedColumns: ["trip_report_id"]
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
            referencedRelation: "report_trip_reports"
            referencedColumns: ["trip_report_id"]
          },
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
          destroyed_container_fill_state: string | null
          dispensed_at: string | null
          dispensed_by_name: string | null
          dispensed_container_fill_state: string | null
          dispensed_subject_number: string | null
          disposition: string | null
          expiry_date: string | null
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
      report_inventory_transactions: {
        Row: {
          batch_number: string | null
          company_id: string | null
          entry_id: string | null
          entry_type: string | null
          from_site_name: string | null
          from_site_number: string | null
          from_study_site_id: string | null
          ip_order_id: string | null
          item_category: string | null
          item_id: string | null
          item_name: string | null
          item_unit: string | null
          lot_id: string | null
          lot_number: string | null
          metadata: Json | null
          performed_at: string | null
          performed_by_name: string | null
          performed_by_profile_id: string | null
          protocol_number: string | null
          quantity_delta: number | null
          serial_number: string | null
          study_id: string | null
          study_title: string | null
          subject_id: string | null
          subject_number: string | null
          to_site_name: string | null
          to_site_number: string | null
          to_study_site_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_ledger_entries_from_study_site_id_fkey"
            columns: ["from_study_site_id"]
            isOneToOne: false
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
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
            foreignKeyName: "ip_ledger_entries_ip_order_id_fkey"
            columns: ["ip_order_id"]
            isOneToOne: false
            referencedRelation: "ip_v_log_rows"
            referencedColumns: ["order_id"]
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
            referencedRelation: "report_subjects"
            referencedColumns: ["subject_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "ip_ledger_entries_to_study_site_id_fkey"
            columns: ["to_study_site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "studies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_invoices: {
        Row: {
          amount: number | null
          approval_step: number | null
          company_id: string | null
          created_at: string | null
          created_by_name: string | null
          created_by_profile_id: string | null
          currency: string | null
          due_at: string | null
          entity_type: string | null
          external_invoice_id: string | null
          institution_id: string | null
          institution_name: string | null
          invoice_id: string | null
          protocol_number: string | null
          received_at: string | null
          site_id: string | null
          site_name: string | null
          site_number: string | null
          status: string | null
          study_id: string | null
          study_title: string | null
          updated_at: string | null
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
            foreignKeyName: "finance_invoices_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
        ]
      }
      report_sites: {
        Row: {
          activation_date: string | null
          city: string | null
          company_id: string | null
          created_at: string | null
          pi_directory_contact_id: string | null
          pi_email: string | null
          pi_name: string | null
          postal_code: string | null
          protocol_number: string | null
          site_id: string | null
          site_name: string | null
          site_number: string | null
          state: string | null
          status: string | null
          study_id: string | null
          study_title: string | null
          target_enrollment: number | null
          updated_at: string | null
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
            foreignKeyName: "study_sites_pi_directory_contact_id_fkey"
            columns: ["pi_directory_contact_id"]
            isOneToOne: false
            referencedRelation: "directory_contacts"
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
      report_subjects: {
        Row: {
          company_id: string | null
          completion_date: string | null
          created_at: string | null
          protocol_number: string | null
          randomization_date: string | null
          randomization_number: string | null
          screening_date: string | null
          screening_number: string | null
          site_id: string | null
          site_name: string | null
          site_number: string | null
          status: string | null
          study_id: string | null
          study_title: string | null
          subject_id: string | null
          subject_number: string | null
          updated_at: string | null
          withdrawal_date: string | null
          withdrawal_reason: string | null
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
            foreignKeyName: "subjects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
          },
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
      report_tasks: {
        Row: {
          assigned_to_name: string | null
          assigned_to_profile_id: string | null
          company_id: string | null
          completed_date: string | null
          created_at: string | null
          created_by_name: string | null
          created_by_profile_id: string | null
          description: string | null
          due_date: string | null
          milestone_id: string | null
          milestone_name: string | null
          on_track_status: string | null
          planned_start_date: string | null
          priority: string | null
          protocol_number: string | null
          site_id: string | null
          site_name: string | null
          site_number: string | null
          status: string | null
          study_id: string | null
          study_title: string | null
          task_id: string | null
          title: string | null
          updated_at: string | null
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
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by_profile_id"]
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
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
      report_trip_reports: {
        Row: {
          approval_due_date: string | null
          approved_by: string | null
          approved_by_name: string | null
          approved_date: string | null
          company_id: string | null
          created_at: string | null
          created_by_name: string | null
          created_by_profile_id: string | null
          protocol_number: string | null
          report_status: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          site_id: string | null
          site_name: string | null
          site_number: string | null
          status: string | null
          study_id: string | null
          study_title: string | null
          submission_due_date: string | null
          submitted_date: string | null
          trip_report_id: string | null
          visit_actual_date: string | null
          visit_id: string | null
          visit_name: string | null
          visit_planned_date: string | null
          visit_status: string | null
          visit_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_visits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "report_sites"
            referencedColumns: ["site_id"]
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
          {
            foreignKeyName: "studies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reports_created_by_fkey"
            columns: ["created_by_profile_id"]
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
            foreignKeyName: "trip_reports_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "monitoring_visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      avatars_directory_contacts_company_id: {
        Args: { path: string }
        Returns: string
      }
      eisf_get_dashboard_stats: { Args: { p_study_id?: string }; Returns: Json }
      ensure_user_profile: { Args: never; Returns: Json }
      etmf_generate_placeholders: {
        Args: { p_site_id: string; p_study_id: string }
        Returns: number
      }
      etmf_generate_staff_placeholders: {
        Args: {
          p_site_id: string
          p_staff_member_id: string
          p_study_id: string
        }
        Returns: number
      }
      etmf_get_overview_stats: { Args: { p_study_id: string }; Returns: Json }
      etmf_get_tmf_tree: { Args: never; Returns: Json }
      etmf_initialize_study_edl: {
        Args: { p_study_id: string }
        Returns: number
      }
      expense_receipts_storage_company_id: {
        Args: { path: string }
        Returns: string
      }
      expense_report_record_decision: {
        Args: { p_comment: string; p_decision: string; p_report_id: string }
        Returns: Json
      }
      finance_invoice_record_decision: {
        Args: { p_comment: string; p_decision: string; p_invoice_id: string }
        Returns: Json
      }
      generate_company_id: { Args: never; Returns: string }
      get_my_company_id: { Args: never; Returns: string }
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
          sdv_data_only_count: number
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
          sdv_data_only_count: number
          sdv_percent: number
          site_data_only_count: number
          site_name: string
          total_items: number
          total_subjects: number
          verified_items: number
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
      ip_admin_reset_site_line_to_available: {
        Args: {
          p_lot_id: string
          p_reason?: string
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_admin_unverify_inventory_at_site: {
        Args: {
          p_lot_id: string
          p_reason?: string
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_archive_item: { Args: { p_item_id: string }; Returns: undefined }
      ip_archive_item_site_link: {
        Args: { p_item_id: string; p_study_id: string; p_study_site_id: string }
        Returns: undefined
      }
      ip_assert_item_not_archived: {
        Args: { p_item_id: string }
        Returns: undefined
      }
      ip_assert_lot_item_not_archived: {
        Args: { p_lot_id: string }
        Returns: undefined
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
          p_container_fill_state?: string
          p_lot_id: string
          p_notes?: string
          p_quantity: number
          p_study_id: string
          p_study_site_id: string
        }
        Returns: undefined
      }
      ip_dispense: {
        Args: {
          p_container_fill_state?: string
          p_lot_id: string
          p_quantity: number
          p_study_id: string
          p_study_site_id: string
          p_subject_id?: string
          p_subject_number_free_text?: string
        }
        Returns: undefined
      }
      ip_ensure_site_lot_receipt_mirror_if_missing: {
        Args: { p_lot_id: string; p_study_id: string; p_study_site_id: string }
        Returns: boolean
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
          p_inventory_trace_id?: string
          p_item_id: string
          p_lot_number?: string
          p_quantity: number
          p_receipt_metadata?: Json
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
          p_batch_number?: string
          p_expiry_date?: string
          p_inventory_trace_id?: string
          p_item_id: string
          p_lot_number?: string
          p_quantity: number
          p_serial_number?: string
          p_source_lot_id: string
          p_study_id: string
          p_study_site_id: string
        }
        Returns: string
      }
      ip_receive_at_site: {
        Args: {
          p_lot_id: string
          p_notes?: string
          p_quantity: number
          p_received_at?: string
          p_serial_number?: string
          p_study_id: string
          p_study_site_id: string
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
      ip_restore_item: { Args: { p_item_id: string }; Returns: undefined }
      ip_restore_item_site_link: {
        Args: { p_item_id: string; p_study_id: string; p_study_site_id: string }
        Returns: undefined
      }
      ip_return_to_global: {
        Args: {
          p_container_fill_state?: string
          p_lot_id: string
          p_notes?: string
          p_quantity: number
          p_study_id: string
          p_study_site_id: string
        }
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
          p_reason?: string
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
      ip_user_access_tier: {
        Args: { p_study_id: string }
        Returns: {
          site_ids: string[]
          tier: string
        }[]
      }
      ip_verify_lot: {
        Args: {
          p_comment?: string
          p_lot_id: string
          p_study_id: string
          p_study_site_id: string
          p_used_at?: string
        }
        Returns: undefined
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
          p_has_brandforge_access: boolean
          p_has_ctms_access: boolean
          p_has_eisf_access: boolean
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
        Args: { p_enabled: boolean; p_tracker_definition_id: string }
        Returns: undefined
      }
      timesheet_period_record_decision: {
        Args: { p_comment: string; p_decision: string; p_period_id: string }
        Returns: Json
      }
    }
    Enums: {
      eisf_document_status:
        | "missing"
        | "uploaded"
        | "under_review"
        | "approved"
        | "rejected"
        | "expired"
      eisf_request_priority: "low" | "normal" | "high"
      eisf_request_status:
        | "open"
        | "in_progress"
        | "fulfilled"
        | "cancelled"
        | "declined"
      eisf_review_decision: "approved" | "rejected" | "request_changes"
      etmf_document_status:
        | "placeholder"
        | "qc_review"
        | "rejected"
        | "approved"
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
      eisf_document_status: [
        "missing",
        "uploaded",
        "under_review",
        "approved",
        "rejected",
        "expired",
      ],
      eisf_request_priority: ["low", "normal", "high"],
      eisf_request_status: [
        "open",
        "in_progress",
        "fulfilled",
        "cancelled",
        "declined",
      ],
      eisf_review_decision: ["approved", "rejected", "request_changes"],
      etmf_document_status: [
        "placeholder",
        "qc_review",
        "rejected",
        "approved",
      ],
    },
  },
} as const
