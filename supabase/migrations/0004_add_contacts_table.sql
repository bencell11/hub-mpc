-- Add contacts table for managing meeting participants and other contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    role TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_contacts_workspace ON contacts(workspace_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_name ON contacts(name);

-- Add meeting participants junction table
CREATE TABLE meeting_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'participant',
    attended BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_contact ON meeting_participants(contact_id);

-- Add scheduled_at and status columns to meetings if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'scheduled_at') THEN
        ALTER TABLE meetings ADD COLUMN scheduled_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'status') THEN
        ALTER TABLE meetings ADD COLUMN status TEXT DEFAULT 'scheduled';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'meeting_type') THEN
        ALTER TABLE meetings ADD COLUMN meeting_type TEXT DEFAULT 'on-site';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'location') THEN
        ALTER TABLE meetings ADD COLUMN location TEXT;
    END IF;
END $$;

-- Add generated_by column to summaries if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'summaries' AND column_name = 'generated_by') THEN
        ALTER TABLE summaries ADD COLUMN generated_by TEXT;
    END IF;
END $$;

-- Add meeting_id column to decisions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'decisions' AND column_name = 'meeting_id') THEN
        ALTER TABLE decisions ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update decisions table: make source columns optional and add content column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'decisions' AND column_name = 'content') THEN
        ALTER TABLE decisions ADD COLUMN content TEXT;
    END IF;
END $$;

-- Make source_type and source_id nullable in decisions
ALTER TABLE decisions ALTER COLUMN source_type DROP NOT NULL;
ALTER TABLE decisions ALTER COLUMN source_id DROP NOT NULL;

-- Make title nullable in decisions (since we use content now)
ALTER TABLE decisions ALTER COLUMN title DROP NOT NULL;
ALTER TABLE decisions ALTER COLUMN description DROP NOT NULL;

-- RLS Policies for contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts in their workspace"
    ON contacts FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create contacts in their workspace"
    ON contacts FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update contacts in their workspace"
    ON contacts FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete contacts in their workspace"
    ON contacts FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for meeting_participants
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting participants"
    ON meeting_participants FOR SELECT
    USING (
        meeting_id IN (
            SELECT m.id FROM meetings m
            JOIN projects p ON m.project_id = p.id
            JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage meeting participants"
    ON meeting_participants FOR ALL
    USING (
        meeting_id IN (
            SELECT m.id FROM meetings m
            JOIN projects p ON m.project_id = p.id
            JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );
