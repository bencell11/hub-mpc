import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// POST /api/meetings/[id]/transcribe - Trigger transcription for a meeting
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

    // Get meeting with audio path
    const { data: meeting } = await serviceClient
      .from('meetings')
      .select('id, title, audio_path, project_id, metadata')
      .eq('id', id)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (!meeting.audio_path) {
      return NextResponse.json({ error: 'No audio recording to transcribe' }, { status: 400 })
    }

    // Download audio from storage
    const { data: audioData, error: downloadError } = await serviceClient.storage
      .from('audio')
      .download(meeting.audio_path)

    if (downloadError || !audioData) {
      return NextResponse.json({ error: 'Could not download audio file' }, { status: 500 })
    }

    // Convert to File object for OpenAI
    const audioFile = new File([audioData], 'audio.webm', { type: 'audio/webm' })

    // Update status to processing
    await serviceClient
      .from('ingestion_jobs')
      .update({ status: 'PROCESSING' })
      .eq('source_type', 'meeting')
      .eq('source_id', id)

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'fr',
      response_format: 'verbose_json',
    })

    // Extract segments and full text
    const transcriptionText = transcription.text
    const segments = (transcription as { segments?: Array<{ start: number; end: number; text: string }> }).segments || []
    const duration = (transcription as { duration?: number }).duration

    // Update meeting with transcription
    await serviceClient
      .from('meetings')
      .update({
        transcription_raw: JSON.stringify({ segments, duration }),
        transcription_final: transcriptionText,
        duration_seconds: duration ? Math.round(duration) : undefined,
      })
      .eq('id', id)

    // Update ingestion job
    await serviceClient
      .from('ingestion_jobs')
      .update({
        status: 'COMPLETED',
        metadata: {
          segments: segments.length,
          duration,
          completedAt: new Date().toISOString(),
        },
      })
      .eq('source_type', 'meeting')
      .eq('source_id', id)

    // Add timeline event
    await serviceClient.from('timeline_events').insert({
      project_id: meeting.project_id,
      event_type: 'meeting_transcribed',
      title: 'Transcription terminée',
      event_date: new Date().toISOString(),
      source_type: 'meeting',
      source_id: id,
    })

    return NextResponse.json({
      success: true,
      transcription: transcriptionText,
      duration,
      segmentsCount: segments.length,
    })
  } catch (error) {
    console.error('Transcription API error:', error)

    // Update ingestion job with error
    const serviceClient = await createServiceClient()
    const { id } = await params
    await serviceClient
      .from('ingestion_jobs')
      .update({
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Transcription failed',
      })
      .eq('source_type', 'meeting')
      .eq('source_id', id)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
