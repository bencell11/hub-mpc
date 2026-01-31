import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/auth/fix-workspace - Répare le workspace manquant pour un utilisateur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }

    // Check if user already has a workspace
    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (existingMembership) {
      return NextResponse.json({
        success: true,
        message: 'Workspace déjà existant',
        workspaceId: existingMembership.workspace_id,
      })
    }

    // Use service client to create workspace (bypasses RLS)
    const serviceClient = await createServiceClient()

    // Get workspace name from request or use default
    const body = await request.json().catch(() => ({}))
    const workspaceName = body.workspaceName || 'Mon Workspace'

    // Create workspace with unique slug
    const baseSlug = workspaceName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`

    const { data: workspace, error: wsError } = await serviceClient
      .from('workspaces')
      .insert({
        name: workspaceName,
        slug,
      })
      .select()
      .single()

    if (wsError) {
      console.error('Workspace creation error:', wsError)
      return NextResponse.json(
        { error: 'Erreur création workspace: ' + wsError.message },
        { status: 500 }
      )
    }

    // Add user as owner
    const { error: memberError } = await serviceClient
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
      // Cleanup
      await serviceClient.from('workspaces').delete().eq('id', workspace.id)
      return NextResponse.json(
        { error: 'Erreur ajout membre: ' + memberError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Workspace créé avec succès',
      workspace: { id: workspace.id, name: workspace.name },
    })
  } catch (error) {
    console.error('Fix workspace error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
