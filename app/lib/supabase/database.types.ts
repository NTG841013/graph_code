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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          commit_hash: string | null
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          organization_id: string
          project_id: string
          status: "pending" | "running" | "completed" | "failed"
        }
        Insert: {
          commit_hash?: string | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          organization_id: string
          project_id: string
          status: "pending" | "running" | "completed" | "failed"
        }
        Update: {
          commit_hash?: string | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          status?: "pending" | "running" | "completed" | "failed"
        }
        Relationships: [
          {
            foreignKeyName: "analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_organizations: {
        Row: {
          deleted_at: string
          deletion_event_id: string
          organization_id: string
        }
        Insert: {
          deleted_at: string
          deletion_event_id: string
          organization_id: string
        }
        Update: {
          deleted_at?: string
          deletion_event_id?: string
          organization_id?: string
        }
        Relationships: []
      }
      edges: {
        Row: {
          analysis_id: string
          created_at: string
          from_file_id: string
          id: string
          organization_id: string
          to_file_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          from_file_id: string
          id?: string
          organization_id: string
          to_file_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          from_file_id?: string
          id?: string
          organization_id?: string
          to_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edges_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_to_file_id_fkey"
            columns: ["to_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      explanations: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          organization_id: string
          target_id: string
          text: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          organization_id: string
          target_id: string
          text: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          target_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "explanations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explanations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      file_roles: {
        Row: {
          analysis_id: string
          created_at: string
          file_id: string
          id: string
          organization_id: string
          role: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          file_id: string
          id?: string
          organization_id: string
          role: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          file_id?: string
          id?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_roles_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_roles_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          analysis_id: string
          content_summary: string | null
          created_at: string
          id: string
          organization_id: string
          path: string
        }
        Insert: {
          analysis_id: string
          content_summary?: string | null
          created_at?: string
          id?: string
          organization_id: string
          path: string
        }
        Update: {
          analysis_id?: string
          content_summary?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          organization_id: string
          text: string
          type: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          organization_id: string
          text: string
          type: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          text?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_audit_events: {
        Row: {
          actor_user_id: string | null
          event_id: string
          event_type: string
          invitation_id: string | null
          invited_email: string | null
          membership_id: string | null
          occurred_at: string
          organization_id: string
          received_at: string
          role: string | null
          subject_user_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          event_id: string
          event_type: string
          invitation_id?: string | null
          invited_email?: string | null
          membership_id?: string | null
          occurred_at: string
          organization_id: string
          received_at?: string
          role?: string | null
          subject_user_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          event_id?: string
          event_type?: string
          invitation_id?: string | null
          invited_email?: string | null
          membership_id?: string | null
          occurred_at?: string
          organization_id?: string
          received_at?: string
          role?: string | null
          subject_user_id?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          repo_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          repo_url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          repo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          analysis_id: string
          created_at: string
          handler_file_id: string | null
          id: string
          method: string
          organization_id: string
          path: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          handler_file_id?: string | null
          id?: string
          method: string
          organization_id: string
          path: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          handler_file_id?: string | null
          id?: string
          method?: string
          organization_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_handler_file_id_fkey"
            columns: ["handler_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_clerk_org_event:
        | {
            Args: {
              p_actor_user_id?: string | null
              p_event_id: string
              p_event_type: string
              p_invitation_id?: string | null
              p_invited_email?: string | null
              p_membership_id?: string | null
              p_occurred_at: string
              p_organization_id: string
              p_role?: string | null
              p_subject_user_id?: string | null
            }
            Returns: undefined
          }
        | {
            Args: {
              p_actor_user_id?: string | null
              p_event_id: string
              p_event_type: string
              p_invitation_id?: string | null
              p_invited_email?: string | null
              p_membership_id?: string | null
              p_name?: string | null
              p_occurred_at: string
              p_organization_id: string
              p_role?: string | null
              p_subject_user_id?: string | null
            }
            Returns: undefined
          }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
