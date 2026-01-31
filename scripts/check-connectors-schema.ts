import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cvlhkyqpyznjhrwiczae.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2bGhreXFweXpuamhyd2ljemFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU0OTk3MSwiZXhwIjoyMDgzMTI1OTcxfQ.JW9LDrZ4j215yBxV9VSc-xtoWDeO3AlakZNa2erkfas'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkSchema() {
  console.log('Checking connectors table schema...')

  // Try to insert a test connector with credentials field
  const { data, error } = await supabase
    .from('connectors')
    .insert({
      workspace_id: 'd8f95956-86a5-4bca-9d0a-cc7ed11366ea', // Mon Cabinet workspace
      type: 'email',
      name: 'Test Connector',
      status: 'inactive',
      config: { test: true },
      credentials: { username: 'test', password: 'test' }
    })
    .select()
    .single()

  if (error) {
    console.log('Error:', error.message)
    if (error.message.includes('credentials')) {
      console.log('')
      console.log('The credentials column does not exist.')
      console.log('Please run this SQL in Supabase Dashboard > SQL Editor:')
      console.log('')
      console.log('ALTER TABLE connectors ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT \'{}\';')
    }
  } else {
    console.log('Success! Credentials column exists.')
    console.log('Test connector created:', data.id)

    // Clean up test connector
    await supabase.from('connectors').delete().eq('id', data.id)
    console.log('Test connector deleted.')
  }
}

checkSchema()
