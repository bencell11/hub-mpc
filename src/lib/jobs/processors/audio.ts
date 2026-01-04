import type { Job } from 'bullmq'
import type { ProcessAudioData, GenerateEmbeddingsData, GenerateSummaryData } from '../queue'
import { createServiceClient } from '@/lib/supabase/server'
import { addJob } from '../queue'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface TranscriptionResult {
  text: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
  duration?: number
}

async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<TranscriptionResult> {
  // Create a Blob then File from the buffer for OpenAI API
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' })
  const file = new File([blob], filename, { type: 'audio/webm' })

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  })

  return {
    text: transcription.text,
    segments: transcription.segments?.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
    })),
    duration: transcription.duration,
  }
}

export async function processAudio(job: Job<ProcessAudioData>): Promise<void> {
  const { meetingId, projectId, workspaceId, audioPath } = job.data
  const supabase = await createServiceClient()

  try {
    // Update job status
    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'PROCESSING',
        started_at: new Date().toISOString(),
        progress: 10,
      })
      .eq('source_id', meetingId)

    // Download audio file from storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('audio')
      .download(audioPath)

    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`)
    }

    const buffer = Buffer.from(await audioData.arrayBuffer())

    // Update progress
    await supabase
      .from('ingestion_jobs')
      .update({ progress: 20 })
      .eq('source_id', meetingId)

    // Transcribe audio
    const filename = audioPath.split('/').pop() || 'audio.webm'
    const transcription = await transcribeAudio(buffer, filename)

    // Update progress
    await supabase
      .from('ingestion_jobs')
      .update({ progress: 70 })
      .eq('source_id', meetingId)

    // Update meeting with transcription
    await supabase
      .from('meetings')
      .update({
        transcription_raw: transcription.text,
        transcription_final: transcription.text, // Same for now, could be edited later
        duration_seconds: transcription.duration ? Math.round(transcription.duration) : null,
        metadata: {
          segments: transcription.segments,
          transcribedAt: new Date().toISOString(),
        },
      })
      .eq('id', meetingId)

    // Queue embedding generation
    if (transcription.text.length > 0) {
      await addJob('generate-embeddings', {
        sourceType: 'meeting',
        sourceId: meetingId,
        content: transcription.text,
        projectId,
      } as GenerateEmbeddingsData)

      // Queue summary generation
      await addJob('generate-summary', {
        sourceType: 'meeting',
        sourceId: meetingId,
        content: transcription.text,
      } as GenerateSummaryData)
    }

    // Update job status to completed
    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        progress: 100,
      })
      .eq('source_id', meetingId)

    // Add timeline event
    await supabase.from('timeline_events').insert({
      project_id: projectId,
      event_type: 'meeting_transcribed',
      title: 'Réunion transcrite',
      description: `Transcription terminée (${transcription.duration ? Math.round(transcription.duration / 60) : '?'} min)`,
      event_date: new Date().toISOString(),
      source_type: 'meeting',
      source_id: meetingId,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'FAILED',
        error_message: errorMessage,
      })
      .eq('source_id', meetingId)

    throw error
  }
}
