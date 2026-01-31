import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects - Liste des projets
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace - RLS policy "Users can view their own memberships" allows this
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      console.error('Workspace membership error:', membershipError)
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    // Get projects with counts - RLS policy "Members can view projects" allows this via is_workspace_member()
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        documents:documents(count),
        emails:emails(count),
        meetings:meetings(count),
        tasks:tasks(count)
      `)
      .eq('workspace_id', membership.workspace_id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Projects fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data
    const transformedProjects = projects?.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      metadata: p.metadata,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      documentsCount: p.documents?.[0]?.count || 0,
      emailsCount: p.emails?.[0]?.count || 0,
      meetingsCount: p.meetings?.[0]?.count || 0,
      tasksCount: p.tasks?.[0]?.count || 0,
    })) || []

    return NextResponse.json(transformedProjects)
  } catch (error) {
    console.error('Projects API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Créer un projet
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace - RLS policy allows viewing own memberships
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      console.error('Workspace membership error:', membershipError)
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, client } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: membership.workspace_id,
        name,
        description: description || null,
        status: 'active',
        metadata: { client: client || null },
      })
      .select()
      .single()

    if (error) {
      console.error('Project create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log action
    await supabase.from('audit_logs').insert({
      workspace_id: membership.workspace_id,
      user_id: user.id,
      action: 'create_project',
      resource_type: 'project',
      resource_id: project.id,
      details: { name },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Projects API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
