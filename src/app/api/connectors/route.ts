import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/connectors - Liste des connecteurs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

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

    // Query connectors - RLS policy "Members can view connectors" allows this
    let query = supabase
      .from('connectors')
      .select('*')
      .eq('workspace_id', membership.workspace_id)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    const { data: connectors, error } = await query

    if (error) {
      console.error('Connectors fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform for frontend
    const transformed = connectors?.map(c => ({
      id: c.id,
      type: c.type,
      name: c.name,
      status: c.status,
      lastSyncAt: c.last_sync_at,
      config: c.config,
    })) || []

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Connectors API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// POST /api/connectors - Créer un connecteur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, name, config, credentials } = body

    console.log('Connector creation request:', { type, name, configKeys: Object.keys(config || {}), hasCredentials: !!credentials })

    if (!type || !name) {
      console.log('Validation failed:', { type, name })
      return NextResponse.json(
        { error: 'Type and name are required' },
        { status: 400 }
      )
    }

    // Validate connector type matches PostgreSQL enum
    const validTypes = ['EMAIL', 'TELEGRAM', 'CALENDAR', 'STORAGE', 'EXCEL', 'NOTION', 'SLACK']
    if (!validTypes.includes(type.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid connector type: ${type}. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Use service client for workspace lookup to avoid RLS issues
    const serviceClient = await createServiceClient()

    const { data: membership, error: membershipError } = await serviceClient
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      console.error('Workspace membership error:', membershipError)
      return NextResponse.json({ error: `No workspace found: ${membershipError?.message || 'No membership'}` }, { status: 400 })
    }

    console.log('User membership:', { workspaceId: membership.workspace_id, role: membership.role })

    // Store credentials inside config (as _credentials) since the credentials column may not exist yet
    const fullConfig = {
      ...(config || {}),
      _credentials: credentials || {},
    }

    // Create connector using service client (already created above)
    const { data: connector, error } = await serviceClient
      .from('connectors')
      .insert({
        workspace_id: membership.workspace_id,
        type,
        name,
        status: 'inactive',
        config: fullConfig,
      })
      .select()
      .single()

    if (error) {
      console.error('Connector create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: connector.id,
      type: connector.type,
      name: connector.name,
      status: connector.status,
      lastSyncAt: connector.last_sync_at,
    }, { status: 201 })
  } catch (error) {
    console.error('Connectors API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
