import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

// Helper to wait for user to appear in auth.users
async function waitForUser(supabase: Awaited<ReturnType<typeof createServiceClient>>, userId: string, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase.auth.admin.getUserById(userId)
    if (data?.user) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      email: string
      password: string
      workspaceName: string
    }

    const { email, password, workspaceName } = body

    if (!email || !password || !workspaceName) {
      return NextResponse.json(
        { error: 'Email, password et nom du workspace requis' },
        { status: 400 }
      )
    }

    // Use service role client for everything (bypasses RLS)
    const supabase = await createServiceClient()

    // Create user with admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for local dev
    })

    if (authError) {
      // If user already exists, try to sign in
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erreur création utilisateur' }, { status: 400 })
    }

    // Create workspace with unique slug
    const baseSlug = workspaceName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Add random suffix to ensure uniqueness
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        slug,
      })
      .select()
      .single()

    if (wsError) {
      console.error('Workspace creation error:', wsError)
      // Cleanup: delete the user if workspace creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Erreur création workspace: ' + wsError.message },
        { status: 500 }
      )
    }

    // Add user as owner
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: authData.user.id,
        role: 'owner',
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
      // Cleanup: delete workspace and user
      await supabase.from('workspaces').delete().eq('id', workspace.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Erreur ajout membre: ' + memberError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: { id: authData.user.id, email: authData.user.email },
      workspace: { id: workspace.id, name: workspace.name },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
