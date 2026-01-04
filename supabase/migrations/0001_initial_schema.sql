-- Hub MCP - Initial Database Schema
-- Multi-tenant architecture with Row Level Security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enums
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');
CREATE TYPE ingestion_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE connector_type AS ENUM ('EMAIL', 'TELEGRAM', 'CALENDAR', 'STORAGE', 'EXCEL', 'NOTION', 'SLACK');
CREATE TYPE document_type AS ENUM ('PDF', 'IMAGE', 'AUDIO', 'VIDEO', 'TEXT', 'SPREADSHEET', 'OTHER');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');
CREATE TYPE connector_status AS ENUM ('active', 'inactive', 'error');
CREATE TYPE tool_call_status AS ENUM ('pending', 'confirmed', 'executed', 'failed', 'cancelled');
CREATE TYPE summary_source AS ENUM ('meeting', 'document', 'email', 'note');
CREATE TYPE summary_format AS ENUM ('text', 'markdown', 'html', 'json');
CREATE TYPE impact_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');

-- =====================
-- CORE TABLES
-- =====================

-- Workspaces (Organizations)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role member_role DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CONTENT TABLES
-- =====================

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type document_type NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    version INT DEFAULT 1,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emails
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    connector_id UUID NOT NULL,
    external_id TEXT NOT NULL,
    from_address TEXT NOT NULL,
    from_name TEXT,
    to_addresses TEXT[] DEFAULT '{}',
    cc_addresses TEXT[] DEFAULT '{}',
    subject TEXT NOT NULL,
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMPTZ NOT NULL,
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connector_id, external_id)
);

-- Meetings
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    duration_seconds INT,
    audio_path TEXT,
    transcription_raw TEXT,
    transcription_final TEXT,
    speakers JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Summaries
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type summary_source NOT NULL,
    source_id UUID NOT NULL,
    format summary_format DEFAULT 'markdown',
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    source_type TEXT,
    source_id UUID,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL,
    decided_by TEXT,
    impact impact_level DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'TODO',
    priority priority_level DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    assignee_id UUID REFERENCES auth.users(id),
    source_type TEXT,
    source_id UUID,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline Events
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    source_type TEXT,
    source_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CONNECTORS & TOOLS
-- =====================

-- Connectors
CREATE TABLE connectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type connector_type NOT NULL,
    name TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    credentials_encrypted TEXT,
    status connector_status DEFAULT 'inactive',
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tool Registry
CREATE TABLE tool_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    risk_level risk_level DEFAULT 'LOW',
    requires_confirmation BOOLEAN DEFAULT FALSE,
    scopes TEXT[] DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tool Calls
CREATE TABLE tool_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID NOT NULL REFERENCES tool_registry(id),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    input JSONB NOT NULL,
    output JSONB,
    status tool_call_status DEFAULT 'pending',
    error_message TEXT,
    confirmed_by UUID REFERENCES auth.users(id),
    confirmed_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- AUDIT & JOBS
-- =====================

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingestion Jobs
CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id UUID,
    status ingestion_status DEFAULT 'PENDING',
    progress INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- EMBEDDINGS (Vector Search)
-- =====================

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX embeddings_embedding_idx ON embeddings
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================
-- CHAT
-- =====================

-- Chat Sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role chat_role NOT NULL,
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    tool_calls JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- FUNCTIONS
-- =====================

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    filter_source_type TEXT DEFAULT NULL,
    filter_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source_type TEXT,
    source_id UUID,
    content TEXT,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.source_type,
        e.source_id,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.metadata
    FROM embeddings e
    WHERE
        (filter_source_type IS NULL OR e.source_type = filter_source_type)
        AND (filter_project_id IS NULL OR e.metadata->>'project_id' = filter_project_id::TEXT)
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check workspace membership
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id AND user_id = auth.uid()
    );
$$;

-- Helper function to check if user can write in workspace
CREATE OR REPLACE FUNCTION can_write_workspace(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    );
$$;

-- Workspace policies
CREATE POLICY "Users can view workspaces they are members of"
    ON workspaces FOR SELECT
    USING (is_workspace_member(id));

CREATE POLICY "Owners and admins can update workspaces"
    ON workspaces FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Workspace members policies
CREATE POLICY "Members can view workspace members"
    ON workspace_members FOR SELECT
    USING (is_workspace_member(workspace_id));

CREATE POLICY "Owners and admins can manage members"
    ON workspace_members FOR ALL
    USING (EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    ));

-- Projects policies
CREATE POLICY "Members can view projects"
    ON projects FOR SELECT
    USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create projects"
    ON projects FOR INSERT
    WITH CHECK (can_write_workspace(workspace_id));

CREATE POLICY "Members can update projects"
    ON projects FOR UPDATE
    USING (can_write_workspace(workspace_id));

-- Documents policies
CREATE POLICY "Members can view documents"
    ON documents FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = documents.project_id AND is_workspace_member(p.workspace_id)
    ));

CREATE POLICY "Members can manage documents"
    ON documents FOR ALL
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = documents.project_id AND can_write_workspace(p.workspace_id)
    ));

-- Similar policies for other content tables (emails, meetings, notes, etc.)
CREATE POLICY "Members can view emails"
    ON emails FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = emails.project_id AND is_workspace_member(p.workspace_id)
    ));

CREATE POLICY "Members can view meetings"
    ON meetings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = meetings.project_id AND is_workspace_member(p.workspace_id)
    ));

CREATE POLICY "Members can manage meetings"
    ON meetings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = meetings.project_id AND can_write_workspace(p.workspace_id)
    ));

CREATE POLICY "Members can view notes"
    ON notes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = notes.project_id AND is_workspace_member(p.workspace_id)
    ));

CREATE POLICY "Members can manage notes"
    ON notes FOR ALL
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = notes.project_id AND can_write_workspace(p.workspace_id)
    ));

CREATE POLICY "Members can view decisions"
    ON decisions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = decisions.project_id AND is_workspace_member(p.workspace_id)
    ));

CREATE POLICY "Members can view tasks"
    ON tasks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = tasks.project_id AND is_workspace_member(p.workspace_id)
    ));

CREATE POLICY "Members can manage tasks"
    ON tasks FOR ALL
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = tasks.project_id AND can_write_workspace(p.workspace_id)
    ));

CREATE POLICY "Members can view timeline"
    ON timeline_events FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = timeline_events.project_id AND is_workspace_member(p.workspace_id)
    ));

-- Connectors policies
CREATE POLICY "Members can view connectors"
    ON connectors FOR SELECT
    USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can manage connectors"
    ON connectors FOR ALL
    USING (EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = connectors.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ));

-- Tool registry is public read
CREATE POLICY "Anyone can view tools"
    ON tool_registry FOR SELECT
    USING (true);

-- Tool calls policies
CREATE POLICY "Members can view tool calls"
    ON tool_calls FOR SELECT
    USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create tool calls"
    ON tool_calls FOR INSERT
    WITH CHECK (can_write_workspace(workspace_id));

-- Audit logs
CREATE POLICY "Members can view audit logs"
    ON audit_logs FOR SELECT
    USING (is_workspace_member(workspace_id));

-- Ingestion jobs
CREATE POLICY "Members can view ingestion jobs"
    ON ingestion_jobs FOR SELECT
    USING (is_workspace_member(workspace_id));

-- Chat policies
CREATE POLICY "Users can view their chat sessions"
    ON chat_sessions FOR SELECT
    USING (user_id = auth.uid() OR is_workspace_member(workspace_id));

CREATE POLICY "Users can create chat sessions"
    ON chat_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_workspace_member(workspace_id));

CREATE POLICY "Users can view messages in their sessions"
    ON chat_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.id = chat_messages.session_id
        AND (cs.user_id = auth.uid() OR is_workspace_member(cs.workspace_id))
    ));

-- Embeddings (read-only for members, write via service role)
CREATE POLICY "Members can search embeddings"
    ON embeddings FOR SELECT
    USING (true); -- Embeddings are filtered by project in the search function

-- =====================
-- INDEXES
-- =====================

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_emails_project ON emails(project_id);
CREATE INDEX idx_emails_received ON emails(received_at);
CREATE INDEX idx_meetings_project ON meetings(project_id);
CREATE INDEX idx_meetings_date ON meetings(date);
CREATE INDEX idx_notes_project ON notes(project_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_timeline_project ON timeline_events(project_id);
CREATE INDEX idx_timeline_date ON timeline_events(event_date);
CREATE INDEX idx_connectors_workspace ON connectors(workspace_id);
CREATE INDEX idx_tool_calls_workspace ON tool_calls(workspace_id);
CREATE INDEX idx_tool_calls_status ON tool_calls(status);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_ingestion_jobs_status ON ingestion_jobs(status);
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);

-- Full-text search indexes
CREATE INDEX idx_emails_subject_fts ON emails USING GIN(to_tsvector('french', subject));
CREATE INDEX idx_emails_body_fts ON emails USING GIN(to_tsvector('french', COALESCE(body_text, '')));
CREATE INDEX idx_notes_content_fts ON notes USING GIN(to_tsvector('french', content));
CREATE INDEX idx_meetings_transcription_fts ON meetings USING GIN(to_tsvector('french', COALESCE(transcription_final, '')));

-- =====================
-- TRIGGERS
-- =====================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_connectors_updated_at
    BEFORE UPDATE ON connectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
