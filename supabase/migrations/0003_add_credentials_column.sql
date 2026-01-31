-- Add credentials column to connectors table
-- This stores credentials as JSONB (should be encrypted in production)

ALTER TABLE connectors ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN connectors.credentials IS 'Connector credentials (IMAP password, API tokens, etc.). Should be encrypted in production.';
