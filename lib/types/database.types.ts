export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Helper types
export type Project = Database['public']['Tables']['projects']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Company = Database['public']['Tables']['companies']['Row'];

// Composite types
export type ProfileWithCompany = Profile & {
  companies: Company | null;
};

export type UserProjectWithDetails = Database['public']['Tables']['user_projects']['Row'] & {
  projects: Project;
};

export type UserModuleWithDetails = Database['public']['Tables']['user_modules']['Row'] & {
  modules: Database['public']['Tables']['modules']['Row'];
};

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
      ae_header_mappings: {
        Row: {
          id: string
          company_id: string
          original_header: string
          customized_header: string
          table_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          original_header: string
          customized_header: string
          table_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          original_header?: string
          customized_header?: string
          table_order?: number | null
          created_at?: string
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
      ae_uploads: {
        Row: {
          id: string
          company_id: string
          uploaded_by: string
          file_name: string
          row_count: number
          column_count: number
          filter_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          uploaded_by: string
          file_name: string
          row_count: number
          column_count: number
          filter_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          uploaded_by?: string
          file_name?: string
          row_count?: number
          column_count?: number
          filter_preferences?: Json
          created_at?: string
          updated_at?: string
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
      ae_records: {
        Row: {
          id: string
          upload_id: string
          site_name: string | null
          subject_id: string | null
          aedecod: string | null
          aeser: string | null
          aeout: string | null
          aesercat1: string | null
          extra_fields: Json
          created_at: string
        }
        Insert: {
          id?: string
          upload_id: string
          site_name?: string | null
          subject_id?: string | null
          aedecod?: string | null
          aeser?: string | null
          aeout?: string | null
          aesercat1?: string | null
          extra_fields?: Json
          created_at?: string
        }
        Update: {
          id?: string
          upload_id?: string
          site_name?: string | null
          subject_id?: string | null
          aedecod?: string | null
          aeser?: string | null
          aeout?: string | null
          aesercat1?: string | null
          extra_fields?: Json
          created_at?: string
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
      ae_column_configs: {
        Row: {
          id: string
          upload_id: string
          column_id: string
          label: string
          visible: boolean
          table_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          upload_id: string
          column_id: string
          label: string
          visible?: boolean
          table_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          upload_id?: string
          column_id?: string
          label?: string
          visible?: boolean
          table_order?: number | null
          created_at?: string
          updated_at?: string
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
      header_mappings: {
        Row: {
          created_at: string
          customized_header: string
          id: string
          original_header: string
          project_id: string
          table_order: number | null
          updated_at: string
          visit_group: string | null
        }
        Insert: {
          created_at?: string
          customized_header: string
          id?: string
          original_header: string
          project_id: string
          table_order?: number | null
          updated_at?: string
          visit_group?: string | null
        }
        Update: {
          created_at?: string
          customized_header?: string
          id?: string
          original_header?: string
          project_id?: string
          table_order?: number | null
          updated_at?: string
          visit_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "header_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "header_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            referencedRelation: "project_assignments"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      patient_uploads: {
        Row: {
          column_count: number
          created_at: string
          file_name: string
          filter_preferences: Json | null
          id: string
          project_id: string
          row_count: number
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          column_count: number
          created_at?: string
          file_name: string
          filter_preferences?: Json | null
          id?: string
          project_id: string
          row_count: number
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          column_count?: number
          created_at?: string
          file_name?: string
          filter_preferences?: Json | null
          id?: string
          project_id?: string
          row_count?: number
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "patient_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      generate_company_id: { Args: Record<string, never>; Returns: string }
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
  public: {
    Enums: {},
  },
} as const
