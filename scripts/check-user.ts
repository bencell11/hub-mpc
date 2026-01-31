import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cvlhkyqpyznjhrwiczae.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2bGhreXFweXpuamhyd2ljemFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU0OTk3MSwiZXhwIjoyMDgzMTI1OTcxfQ.JW9LDrZ4j215yBxV9VSc-xtoWDeO3AlakZNa2erkfas'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkUser() {
  const userId = '8f1ae0d9-f493-4dfe-91d6-fa73add3b0d0'

  console.log('🔍 Vérification de l\'utilisateur:', userId)

  // Get user
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  console.log('\n📧 User:', userData?.user?.email)

  // Get workspace membership
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('*, workspaces(*)')
    .eq('user_id', userId)

  console.log('\n📊 Memberships:', JSON.stringify(membership, null, 2))
  if (membershipError) {
    console.log('❌ Error:', membershipError.message)
  }

  // List all workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')

  console.log('\n📁 All workspaces:', JSON.stringify(workspaces, null, 2))

  // List all workspace_members
  const { data: allMembers } = await supabase
    .from('workspace_members')
    .select('*')

  console.log('\n👥 All members:', JSON.stringify(allMembers, null, 2))
}

checkUser()
