import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/meetings - Liste des réunions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status') // 'upcoming' | 'completed'

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    let query = supabase
      .from('meetings')
      .select(`
        *,
        project:projects(id, name),
        summary:summaries(content, format)
      `)
      .order('date', { ascending: status === 'upcoming' })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const now = new Date().toISOString()
    if (status === 'upcoming') {
      query = query.gte('date', now)
    } else if (status === 'completed') {
      query = query.lt('date', now)
    }

    const { data: meetings, error } = await query

    if (error) {
      console.error('Meetings fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data
    const transformedMeetings = meetings?.map(m => ({
      id: m.id,
      title: m.title,
      date: m.date,
      durationSeconds: m.duration_seconds,
      audioPath: m.audio_path,
      hasRecording: !!m.audio_path,
      hasTranscription: !!m.transcription_final,
      transcription: m.transcription_final,
      speakers: m.speakers || [],
      project: m.project,
      summary: m.summary?.[0]?.content,
      metadata: m.metadata,
      createdAt: m.created_at,
      status: new Date(m.date) > new Date() ? 'upcoming' : 'completed',
    })) || []

    return NextResponse.json(transformedMeetings)
  } catch (error) {
    console.error('Meetings API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// POST /api/meetings - Créer une réunion
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, date, projectId, durationMinutes, type, location, attendees } = body

    if (!title || !date || !projectId) {
      return NextResponse.json(
        { error: 'Title, date and projectId are required' },
        { status: 400 }
      )
    }

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        project_id: projectId,
        title,
        date: new Date(date).toISOString(),
        duration_seconds: durationMinutes ? durationMinutes * 60 : null,
        metadata: { type, location, attendees },
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Meeting create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add timeline event
    await supabase.from('timeline_events').insert({
      project_id: projectId,
      event_type: 'meeting_scheduled',
      title: `Réunion planifiée : ${title}`,
      event_date: new Date(date).toISOString(),
      source_type: 'meeting',
      source_id: meeting.id,
    })

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error('Meetings API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
