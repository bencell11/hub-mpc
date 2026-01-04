// Types pour la base de données Supabase
// Générés à partir du schéma PostgreSQL

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
export type IngestionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type ConnectorType = 'EMAIL' | 'TELEGRAM' | 'CALENDAR' | 'STORAGE' | 'EXCEL' | 'NOTION' | 'SLACK'
export type DocumentType = 'PDF' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'TEXT' | 'SPREADSHEET' | 'OTHER'

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          status: 'active' | 'archived' | 'completed'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          status?: 'active' | 'archived' | 'completed'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'archived' | 'completed'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          project_id: string
          name: string
          type: DocumentType
          mime_type: string
          size_bytes: number
          storage_path: string
          metadata: Json
          tags: string[]
          version: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          type: DocumentType
          mime_type: string
          size_bytes: number
          storage_path: string
          metadata?: Json
          tags?: string[]
          version?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          type?: DocumentType
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          metadata?: Json
          tags?: string[]
          version?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      emails: {
        Row: {
          id: string
          project_id: string
          connector_id: string
          external_id: string
          from_address: string
          from_name: string | null
          to_addresses: string[]
          cc_addresses: string[]
          subject: string
          body_text: string | null
          body_html: string | null
          received_at: string
          attachments: Json
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          connector_id: string
          external_id: string
          from_address: string
          from_name?: string | null
          to_addresses?: string[]
          cc_addresses?: string[]
          subject: string
          body_text?: string | null
          body_html?: string | null
          received_at: string
          attachments?: Json
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          connector_id?: string
          external_id?: string
          from_address?: string
          from_name?: string | null
          to_addresses?: string[]
          cc_addresses?: string[]
          subject?: string
          body_text?: string | null
          body_html?: string | null
          received_at?: string
          attachments?: Json
          metadata?: Json
          created_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          project_id: string
          title: string
          date: string
          duration_seconds: number | null
          audio_path: string | null
          transcription_raw: string | null
          transcription_final: string | null
          speakers: Json
          metadata: Json
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          date: string
          duration_seconds?: number | null
          audio_path?: string | null
          transcription_raw?: string | null
          transcription_final?: string | null
          speakers?: Json
          metadata?: Json
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          date?: string
          duration_seconds?: number | null
          audio_path?: string | null
          transcription_raw?: string | null
          transcription_final?: string | null
          speakers?: Json
          metadata?: Json
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      summaries: {
        Row: {
          id: string
          source_type: 'meeting' | 'document' | 'email' | 'note'
          source_id: string
          format: 'text' | 'markdown' | 'html' | 'json'
          content: string
          citations: Json
          created_at: string
        }
        Insert: {
          id?: string
          source_type: 'meeting' | 'document' | 'email' | 'note'
          source_id: string
          format?: 'text' | 'markdown' | 'html' | 'json'
          content: string
          citations?: Json
          created_at?: string
        }
        Update: {
          id?: string
          source_type?: 'meeting' | 'document' | 'email' | 'note'
          source_id?: string
          format?: 'text' | 'markdown' | 'html' | 'json'
          content?: string
          citations?: Json
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          project_id: string
          title: string | null
          content: string
          tags: string[]
          source_type: string | null
          source_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title?: string | null
          content: string
          tags?: string[]
          source_type?: string | null
          source_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string | null
          content?: string
          tags?: string[]
          source_type?: string | null
          source_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      decisions: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string
          source_type: string
          source_id: string
          decided_at: string
          decided_by: string | null
          impact: 'low' | 'medium' | 'high'
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description: string
          source_type: string
          source_id: string
          decided_at: string
          decided_by?: string | null
          impact?: 'low' | 'medium' | 'high'
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string
          source_type?: string
          source_id?: string
          decided_at?: string
          decided_by?: string | null
          impact?: 'low' | 'medium' | 'high'
          tags?: string[]
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: TaskStatus
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          assignee_id: string | null
          source_type: string | null
          source_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: TaskStatus
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          assignee_id?: string | null
          source_type?: string | null
          source_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: TaskStatus
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          assignee_id?: string | null
          source_type?: string | null
          source_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      timeline_events: {
        Row: {
          id: string
          project_id: string
          event_type: string
          title: string
          description: string | null
          event_date: string
          source_type: string | null
          source_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          event_type: string
          title: string
          description?: string | null
          event_date: string
          source_type?: string | null
          source_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          event_type?: string
          title?: string
          description?: string | null
          event_date?: string
          source_type?: string | null
          source_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      connectors: {
        Row: {
          id: string
          workspace_id: string
          type: ConnectorType
          name: string
          config: Json
          credentials_encrypted: string | null
          status: 'active' | 'inactive' | 'error'
          last_sync_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          type: ConnectorType
          name: string
          config?: Json
          credentials_encrypted?: string | null
          status?: 'active' | 'inactive' | 'error'
          last_sync_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          type?: ConnectorType
          name?: string
          config?: Json
          credentials_encrypted?: string | null
          status?: 'active' | 'inactive' | 'error'
          last_sync_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tool_registry: {
        Row: {
          id: string
          name: string
          description: string
          input_schema: Json
          output_schema: Json
          risk_level: RiskLevel
          requires_confirmation: boolean
          scopes: string[]
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          input_schema: Json
          output_schema: Json
          risk_level?: RiskLevel
          requires_confirmation?: boolean
          scopes?: string[]
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          input_schema?: Json
          output_schema?: Json
          risk_level?: RiskLevel
          requires_confirmation?: boolean
          scopes?: string[]
          enabled?: boolean
          created_at?: string
        }
      }
      tool_calls: {
        Row: {
          id: string
          tool_id: string
          workspace_id: string
          project_id: string | null
          user_id: string
          input: Json
          output: Json | null
          status: 'pending' | 'confirmed' | 'executed' | 'failed' | 'cancelled'
          error_message: string | null
          confirmed_by: string | null
          confirmed_at: string | null
          executed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tool_id: string
          workspace_id: string
          project_id?: string | null
          user_id: string
          input: Json
          output?: Json | null
          status?: 'pending' | 'confirmed' | 'executed' | 'failed' | 'cancelled'
          error_message?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          executed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tool_id?: string
          workspace_id?: string
          project_id?: string | null
          user_id?: string
          input?: Json
          output?: Json | null
          status?: 'pending' | 'confirmed' | 'executed' | 'failed' | 'cancelled'
          error_message?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          executed_at?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string | null
          details: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      ingestion_jobs: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          source_type: string
          source_id: string | null
          status: IngestionStatus
          progress: number
          metadata: Json
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          source_type: string
          source_id?: string | null
          status?: IngestionStatus
          progress?: number
          metadata?: Json
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          source_type?: string
          source_id?: string | null
          status?: IngestionStatus
          progress?: number
          metadata?: Json
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      embeddings: {
        Row: {
          id: string
          source_type: string
          source_id: string
          chunk_index: number
          content: string
          embedding: number[]
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          source_type: string
          source_id: string
          chunk_index: number
          content: string
          embedding: number[]
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          source_type?: string
          source_id?: string
          chunk_index?: number
          content?: string
          embedding?: number[]
          metadata?: Json
          created_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          user_id: string
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          user_id: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          user_id?: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          citations: Json
          tool_calls: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          citations?: Json
          tool_calls?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          citations?: Json
          tool_calls?: Json
          created_at?: string
        }
      }
    }
    Functions: {
      match_embeddings: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
          filter_source_type?: string
          filter_project_id?: string
        }
        Returns: {
          id: string
          source_type: string
          source_id: string
          content: string
          similarity: number
          metadata: Json
        }[]
      }
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience exports
export type Workspace = Tables<'workspaces'>
export type Project = Tables<'projects'>
export type Document = Tables<'documents'>
export type Email = Tables<'emails'>
export type Meeting = Tables<'meetings'>
export type Summary = Tables<'summaries'>
export type Note = Tables<'notes'>
export type Decision = Tables<'decisions'>
export type Task = Tables<'tasks'>
export type TimelineEvent = Tables<'timeline_events'>
export type Connector = Tables<'connectors'>
export type ToolRegistry = Tables<'tool_registry'>
export type ToolCall = Tables<'tool_calls'>
export type AuditLog = Tables<'audit_logs'>
export type IngestionJob = Tables<'ingestion_jobs'>
export type Embedding = Tables<'embeddings'>
export type ChatSession = Tables<'chat_sessions'>
export type ChatMessage = Tables<'chat_messages'>
