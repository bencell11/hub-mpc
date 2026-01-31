import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cvlhkyqpyznjhrwiczae.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2bGhreXFweXpuamhyd2ljemFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU0OTk3MSwiZXhwIjoyMDgzMTI1OTcxfQ.JW9LDrZ4j215yBxV9VSc-xtoWDeO3AlakZNa2erkfas'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function applyMigration() {
  console.log('Applying migration: Add credentials column to connectors...')

  // Check if column exists first
  const { data: columns, error: checkError } = await supabase
    .rpc('get_table_columns', { table_name: 'connectors' })
    .select('*')

  // If RPC doesn't exist, try direct SQL
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE connectors ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT '{}';
      COMMENT ON COLUMN connectors.credentials IS 'Connector credentials (IMAP password, API tokens, etc.).';
    `
  })

  if (error) {
    // Try using raw SQL through Supabase dashboard or CLI
    console.log('Note: Direct SQL execution not available via API.')
    console.log('Please run this SQL in Supabase Dashboard > SQL Editor:')
    console.log('')
    console.log(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT '{}';`)
    console.log('')
    console.log('Or use: npx supabase db push')
    return
  }

  console.log('Migration applied successfully!')
}

applyMigration()
