import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/meetings/[id] - Get a single meeting with full details
export async function GET(
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

    // Get meeting with project info
    const { data: meeting, error } = await serviceClient
      .from('meetings')
      .select(`
        *,
        project:projects(id, name, workspace_id)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Meeting fetch error:', error)
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Verify workspace access
    const projectData = meeting.project as { id: string; name: string; workspace_id: string } | null
    if (projectData?.workspace_id !== membership.workspace_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch related data separately (no FK relations)
    const [summaryResult, decisionsResult, tasksResult, ingestionResult] = await Promise.all([
      // Get summary
      serviceClient
        .from('summaries')
        .select('id, content, format, created_at, generated_by')
        .eq('source_type', 'meeting')
        .eq('source_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Get decisions
      serviceClient
        .from('decisions')
        .select('id, content, title, status, created_at')
        .eq('meeting_id', id),
      // Get tasks
      serviceClient
        .from('tasks')
        .select('id, title, status, priority, due_date, metadata')
        .eq('source_type', 'meeting')
        .eq('source_id', id),
      // Get ingestion job status
      serviceClient
        .from('ingestion_jobs')
        .select('id, status, error_message, created_at, updated_at')
        .eq('source_type', 'meeting')
        .eq('source_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    return NextResponse.json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        scheduled_at: meeting.scheduled_at || meeting.date,
        duration: meeting.duration_seconds ? Math.round(meeting.duration_seconds / 60) : null,
        audio_path: meeting.audio_path,
        transcription_raw: meeting.transcription_raw,
        transcription_final: meeting.transcription_final,
        status: meeting.status || 'scheduled',
        meeting_type: meeting.meeting_type,
        location: meeting.location,
        metadata: meeting.metadata || {},
        project: projectData ? { id: projectData.id, name: projectData.name } : null,
      },
      summary: summaryResult.data,
      decisions: decisionsResult.data || [],
      tasks: tasksResult.data || [],
      processingStatus: ingestionResult.data?.status || null,
      processingError: ingestionResult.data?.error_message || null,
    })
  } catch (error) {
    console.error('Meeting API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// PATCH /api/meetings/[id] - Update meeting
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

    const body = await request.json()
    const { title, date, durationMinutes, metadata, transcription, context } = body

    // Build update object
    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (date !== undefined) updates.date = new Date(date).toISOString()
    if (durationMinutes !== undefined) updates.duration_seconds = durationMinutes * 60
    if (metadata !== undefined) updates.metadata = metadata
    if (transcription !== undefined) updates.transcription_final = transcription
    if (context !== undefined) {
      // Store meeting context in metadata
      const currentMetadata = (await serviceClient
        .from('meetings')
        .select('metadata')
        .eq('id', id)
        .single()).data?.metadata || {}
      updates.metadata = { ...currentMetadata, context }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data: meeting, error } = await serviceClient
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Meeting update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error('Meeting API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
