import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

    // Build meetings query - don't join summaries directly (no FK relation)
    let query = serviceClient
      .from('meetings')
      .select(`
        *,
        project:projects(id, name)
      `)
      .order('scheduled_at', { ascending: status === 'upcoming', nullsFirst: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const now = new Date().toISOString()
    if (status === 'upcoming') {
      query = query.gte('scheduled_at', now)
    } else if (status === 'completed') {
      query = query.lt('scheduled_at', now)
    }

    const { data: meetings, error } = await query

    if (error) {
      console.error('Meetings fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get summaries separately
    const meetingIds = (meetings || []).map(m => m.id)
    const { data: summaries } = meetingIds.length > 0
      ? await serviceClient
          .from('summaries')
          .select('source_id, content')
          .eq('source_type', 'meeting')
          .in('source_id', meetingIds)
      : { data: [] }

    const summaryMap = new Map((summaries || []).map(s => [s.source_id, s.content]))

    // Transform data to match frontend interface
    const transformedMeetings = (meetings || []).map(m => {
      const scheduledAt = m.scheduled_at || m.date
      const meetingDate = scheduledAt ? new Date(scheduledAt) : new Date()
      const meetingStatus = m.status || (meetingDate > new Date() ? 'upcoming' : 'completed')

      // Parse metadata for attendees, type, location
      const metadata = m.metadata || {}
      const attendees = metadata.attendees || []
      const meetingType = m.meeting_type || metadata.type || 'on-site'
      const location = m.location || metadata.location || null

      return {
        id: m.id,
        title: m.title,
        date: meetingDate.toISOString().split('T')[0],
        time: meetingDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duration: m.duration_seconds ? Math.round(m.duration_seconds / 60) : 60,
        type: meetingType,
        location,
        project: m.project,
        attendees: attendees.map((a: { name: string; role?: string }) => ({
          name: a.name || 'Participant',
          role: a.role || 'Participant',
        })),
        hasRecording: !!m.audio_path,
        hasTranscription: !!m.transcription_final,
        hasSummary: summaryMap.has(m.id),
        status: meetingStatus === 'completed' ? 'completed' : 'upcoming',
        summary: summaryMap.get(m.id)?.substring(0, 200),
      }
    })

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

    // Combine date and time if provided
    let scheduledAt: string
    if (body.time) {
      scheduledAt = new Date(`${date}T${body.time}`).toISOString()
    } else {
      scheduledAt = new Date(date).toISOString()
    }

    // Create meeting
    const { data: meeting, error } = await serviceClient
      .from('meetings')
      .insert({
        project_id: projectId,
        title,
        date: scheduledAt,
        scheduled_at: scheduledAt,
        duration_seconds: (body.duration || durationMinutes || 60) * 60,
        meeting_type: type || 'video',
        location: location || null,
        status: 'scheduled',
        metadata: { attendees: attendees || [] },
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Meeting create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add timeline event
    await serviceClient.from('timeline_events').insert({
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
