export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string
          project_id: string
          status: "pending" | "running" | "completed" | "failed"
          organization_id: string
          commit_hash: string | null
          finished_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          status: "pending" | "running" | "completed" | "failed"
          organization_id: string
          commit_hash?: string | null
          finished_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          status?: "pending" | "running" | "completed" | "failed"
          organization_id?: string
          commit_hash?: string | null
          finished_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          repo_url: string
          organization_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          repo_url: string
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          repo_url?: string
          organization_id?: string
          created_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string | null
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          created_at?: string
        }
      }
      files: {
        Row: {
          id: string
          analysis_id: string
          path: string
          content_summary: string | null
          organization_id: string
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          path: string
          content_summary?: string | null
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          path?: string
          content_summary?: string | null
          organization_id?: string
          created_at?: string
        }
      }
      edges: {
        Row: {
          id: string
          analysis_id: string
          from_file_id: string
          to_file_id: string
          organization_id: string
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          from_file_id: string
          to_file_id: string
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          from_file_id?: string
          to_file_id?: string
          organization_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_clerk_org_event: {
        Args: {
          p_event_id: string
          p_organization_id: string
          p_event_type: string
          p_occurred_at: string
          p_actor_user_id?: string | null
          p_subject_user_id?: string | null
          p_membership_id?: string | null
          p_invitation_id?: string | null
          p_invited_email?: string | null
          p_role?: string | null
          p_name?: string | null
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
