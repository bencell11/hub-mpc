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

    // Get meeting with all related data
    const { data: meeting, error } = await serviceClient
      .from('meetings')
      .select(`
        *,
        project:projects(id, name, workspace_id),
        summaries(id, content, format, created_at),
        decisions(id, content, status, created_at),
        tasks(id, title, status, priority, due_date, assignee_id)
      `)
      .eq('id', id)
      .single()

    if (error || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Verify workspace access
    if (meeting.project?.workspace_id !== membership.workspace_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get ingestion job status if processing
    const { data: ingestionJob } = await serviceClient
      .from('ingestion_jobs')
      .select('id, status, error_message, created_at, updated_at')
      .eq('source_type', 'meeting')
      .eq('source_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      durationSeconds: meeting.duration_seconds,
      audioPath: meeting.audio_path,
      hasRecording: !!meeting.audio_path,
      transcriptionRaw: meeting.transcription_raw,
      transcription: meeting.transcription_final,
      hasTranscription: !!meeting.transcription_final,
      speakers: meeting.speakers || [],
      metadata: meeting.metadata || {},
      project: meeting.project ? { id: meeting.project.id, name: meeting.project.name } : null,
      summary: meeting.summaries?.[0]?.content || null,
      decisions: meeting.decisions || [],
      tasks: meeting.tasks || [],
      processingStatus: ingestionJob?.status || null,
      processingError: ingestionJob?.error_message || null,
      createdAt: meeting.created_at,
      updatedAt: meeting.updated_at,
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
