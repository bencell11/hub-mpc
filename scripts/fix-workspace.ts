import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cvlhkyqpyznjhrwiczae.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2bGhreXFweXpuamhyd2ljemFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU0OTk3MSwiZXhwIjoyMDgzMTI1OTcxfQ.JW9LDrZ4j215yBxV9VSc-xtoWDeO3AlakZNa2erkfas'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixWorkspaces() {
  console.log('🔍 Recherche des utilisateurs sans workspace...')

  // Get all users
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError)
    return
  }

  const users = usersData.users
  console.log(`📊 ${users.length} utilisateur(s) trouvé(s)`)

  for (const user of users) {
    console.log(`\n👤 Utilisateur: ${user.email} (${user.id})`)

    // Check if user has a workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(name)')
      .eq('user_id', user.id)
      .single()

    if (membership) {
      console.log(`  ✅ A déjà un workspace`)
      continue
    }

    console.log(`  ⚠️ Pas de workspace, création en cours...`)

    // Create workspace
    const workspaceName = user.email?.split('@')[0] || 'Mon Cabinet'
    const slug = `${workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 8)}`

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        slug,
      })
      .select()
      .single()

    if (wsError) {
      console.error(`  ❌ Erreur création workspace:`, wsError.message)
      continue
    }

    console.log(`  📁 Workspace créé: ${workspace.name} (${workspace.id})`)

    // Add user as owner
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) {
      console.error(`  ❌ Erreur ajout membre:`, memberError.message)
      // Cleanup workspace
      await supabase.from('workspaces').delete().eq('id', workspace.id)
      continue
    }

    console.log(`  ✅ Utilisateur ajouté comme owner`)
  }

  console.log('\n✨ Terminé!')
}

fixWorkspaces()
