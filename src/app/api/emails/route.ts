import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/emails - Liste des emails
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Use service client for all queries to avoid RLS issues
    const serviceClient = await createServiceClient()

    // Get user's workspace
    const { data: membership, error: membershipError } = await serviceClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      console.error('Workspace membership error:', membershipError)
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    // Build email query
    let query = serviceClient
      .from('emails')
      .select(`
        *,
        project:projects(id, name)
      `)
      .order('received_at', { ascending: false })
      .limit(limit)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,body_text.ilike.%${search}%,from_address.ilike.%${search}%`)
    }

    const { data: emails, error } = await query

    if (error) {
      console.error('Emails fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data
    const transformedEmails = emails?.map(e => ({
      id: e.id,
      from: {
        email: e.from_address,
        name: e.from_name,
      },
      to: e.to_addresses,
      cc: e.cc_addresses,
      subject: e.subject,
      preview: e.body_text?.substring(0, 150) || '',
      bodyText: e.body_text,
      bodyHtml: e.body_html,
      receivedAt: e.received_at,
      attachments: e.attachments || [],
      project: e.project,
      metadata: e.metadata,
    })) || []

    return NextResponse.json(transformedEmails)
  } catch (error) {
    console.error('Emails API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// POST /api/emails/sync - Synchroniser les emails
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service client for all queries
    const serviceClient = await createServiceClient()

    // Get user's workspace
    const { data: membership, error: membershipError } = await serviceClient
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      console.error('Workspace membership error:', membershipError)
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const body = await request.json()
    const { connectorId, projectId } = body

    if (!connectorId) {
      return NextResponse.json({ error: 'Connector ID is required' }, { status: 400 })
    }

    // Get connector
    const { data: connector, error: connectorError } = await serviceClient
      .from('connectors')
      .select('*')
      .eq('id', connectorId)
      .single()

    if (connectorError || !connector) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 })
    }

    // Verify connector belongs to user's workspace
    if (connector.workspace_id !== membership.workspace_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update status to syncing
    await serviceClient
      .from('connectors')
      .update({ status: 'syncing' })
      .eq('id', connectorId)

    try {
      // Import and use the EmailConnector
      const { EmailConnector } = await import('@/lib/connectors/email')

      // Extract credentials from config._credentials (workaround until credentials column exists)
      const config = connector.config || {}
      const credentials = config._credentials || connector.credentials || {}

      const emailConnector = new EmailConnector(
        connector.id,
        connector.workspace_id,
        config,
        credentials
      )

      // Run sync
      const result = await emailConnector.sync(projectId)

      // Update connector status
      await serviceClient
        .from('connectors')
        .update({
          last_sync_at: new Date().toISOString(),
          status: result.success ? 'active' : 'error',
          error_message: result.errors.length > 0 ? result.errors.join(', ') : null,
        })
        .eq('id', connectorId)

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Sync completed' : 'Sync completed with errors',
        itemsProcessed: result.itemsProcessed,
        itemsCreated: result.itemsCreated,
        itemsUpdated: result.itemsUpdated,
        errors: result.errors,
      })
    } catch (syncError) {
      // Update connector with error status
      await serviceClient
        .from('connectors')
        .update({
          status: 'error',
          error_message: syncError instanceof Error ? syncError.message : 'Sync failed',
        })
        .eq('id', connectorId)

      throw syncError
    }
  } catch (error) {
    console.error('Email sync API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
