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

    // Use service client to bypass RLS
    const serviceClient = await createServiceClient()

    // Get user's workspace
    const { data: membership } = await serviceClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    let query = serviceClient
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

    if (!type || !name) {
      return NextResponse.json(
        { error: 'Type and name are required' },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS
    const serviceClient = await createServiceClient()

    // Get user's workspace
    const { data: membership } = await serviceClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    // Store credentials inside config (as _credentials) since the credentials column may not exist yet
    const fullConfig = {
      ...(config || {}),
      _credentials: credentials || {},
    }

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
