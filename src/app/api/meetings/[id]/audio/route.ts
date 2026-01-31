import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/meetings/[id]/audio - Upload audio recording for a meeting
export async function POST(
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

    // Get meeting to verify access
    const { data: meeting } = await serviceClient
      .from('meetings')
      .select('id, project_id, projects!inner(workspace_id)')
      .eq('id', id)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const durationSeconds = formData.get('duration') as string

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Generate storage path
    const timestamp = Date.now()
    const extension = audioFile.name.split('.').pop() || 'webm'
    const storagePath = `meetings/${id}/${timestamp}.${extension}`

    // Upload to Supabase Storage
    const { error: uploadError } = await serviceClient.storage
      .from('audio')
      .upload(storagePath, audioFile, {
        contentType: audioFile.type || 'audio/webm',
        upsert: true,
      })

    if (uploadError) {
      console.error('Audio upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
    }

    // Update meeting with audio path and duration
    const updates: Record<string, unknown> = {
      audio_path: storagePath,
    }
    if (durationSeconds) {
      updates.duration_seconds = parseInt(durationSeconds, 10)
    }

    const { error: updateError } = await serviceClient
      .from('meetings')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      console.error('Meeting update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create ingestion job for transcription
    const { data: ingestionJob, error: jobError } = await serviceClient
      .from('ingestion_jobs')
      .insert({
        workspace_id: membership.workspace_id,
        source_type: 'meeting',
        source_id: id,
        status: 'PENDING',
        metadata: {
          audioPath: storagePath,
          mimeType: audioFile.type,
          size: audioFile.size,
        },
      })
      .select()
      .single()

    if (jobError) {
      console.error('Ingestion job creation error:', jobError)
      // Don't fail the request, audio is uploaded successfully
    }

    // Add timeline event
    await serviceClient.from('timeline_events').insert({
      project_id: meeting.project_id,
      event_type: 'meeting_recorded',
      title: 'Enregistrement audio ajouté',
      event_date: new Date().toISOString(),
      source_type: 'meeting',
      source_id: id,
      metadata: {
        audioPath: storagePath,
        durationSeconds: durationSeconds ? parseInt(durationSeconds, 10) : null,
      },
    })

    return NextResponse.json({
      success: true,
      audioPath: storagePath,
      ingestionJobId: ingestionJob?.id,
      message: 'Audio uploaded successfully. Transcription will begin shortly.',
    })
  } catch (error) {
    console.error('Audio upload API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// GET /api/meetings/[id]/audio - Get audio URL
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

    // Get meeting
    const { data: meeting } = await serviceClient
      .from('meetings')
      .select('audio_path')
      .eq('id', id)
      .single()

    if (!meeting?.audio_path) {
      return NextResponse.json({ error: 'No audio recording found' }, { status: 404 })
    }

    // Generate signed URL for audio playback
    const { data: signedUrl, error } = await serviceClient.storage
      .from('audio')
      .createSignedUrl(meeting.audio_path, 3600) // 1 hour expiry

    if (error) {
      return NextResponse.json({ error: 'Could not generate audio URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signedUrl.signedUrl })
  } catch (error) {
    console.error('Audio URL API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
