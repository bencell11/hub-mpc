import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// DELETE /api/connectors/[id] - Delete a connector
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Verify the connector belongs to user's workspace before deleting
    const { data: connector } = await serviceClient
      .from('connectors')
      .select('id, workspace_id')
      .eq('id', id)
      .single()

    if (!connector) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 })
    }

    if (connector.workspace_id !== membership.workspace_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the connector
    const { error } = await serviceClient
      .from('connectors')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Connector delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Connector API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// PATCH /api/connectors/[id] - Update a connector
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Verify the connector belongs to user's workspace
    const { data: connector } = await serviceClient
      .from('connectors')
      .select('id, workspace_id')
      .eq('id', id)
      .single()

    if (!connector) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 })
    }

    if (connector.workspace_id !== membership.workspace_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, status, config } = body

    // Build update object
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (status !== undefined) updates.status = status
    if (config !== undefined) updates.config = config

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data: updated, error } = await serviceClient
      .from('connectors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Connector update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: updated.id,
      type: updated.type,
      name: updated.name,
      status: updated.status,
      lastSyncAt: updated.last_sync_at,
    })
  } catch (error) {
    console.error('Connector API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
