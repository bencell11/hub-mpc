import type { Job } from 'bullmq'
import type { ProcessDocumentData, GenerateEmbeddingsData } from '../queue'
import { createServiceClient } from '@/lib/supabase/server'
import { addJob } from '../queue'

// PDF text extraction would use pdf-parse or similar
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Placeholder - in production, use pdf-parse
  // const pdfParse = require('pdf-parse')
  // const data = await pdfParse(buffer)
  // return data.text
  return `[PDF content placeholder - ${buffer.length} bytes]`
}

// Image text extraction would use Tesseract or cloud OCR
async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  // Placeholder - in production, use Tesseract.js or cloud OCR
  return `[Image content placeholder - ${mimeType}, ${buffer.length} bytes]`
}

// Plain text extraction
function extractTextFromText(buffer: Buffer): string {
  return buffer.toString('utf-8')
}

export async function processDocument(job: Job<ProcessDocumentData>): Promise<void> {
  const { documentId, projectId, workspaceId, storagePath, mimeType } = job.data
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
      .eq('source_id', documentId)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`)
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())

    // Update progress
    await supabase
      .from('ingestion_jobs')
      .update({ progress: 30 })
      .eq('source_id', documentId)

    // Extract text based on mime type
    let extractedText = ''

    if (mimeType === 'application/pdf') {
      extractedText = await extractTextFromPdf(buffer)
    } else if (mimeType.startsWith('image/')) {
      extractedText = await extractTextFromImage(buffer, mimeType)
    } else if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      extractedText = extractTextFromText(buffer)
    } else {
      throw new Error(`Unsupported mime type: ${mimeType}`)
    }

    // Update progress
    await supabase
      .from('ingestion_jobs')
      .update({ progress: 60 })
      .eq('source_id', documentId)

    // Update document with extracted text (stored in metadata)
    await supabase
      .from('documents')
      .update({
        metadata: {
          extractedText: extractedText.substring(0, 10000), // Limit stored text
          extractedAt: new Date().toISOString(),
          textLength: extractedText.length,
        },
      })
      .eq('id', documentId)

    // Queue embedding generation
    if (extractedText.length > 0) {
      await addJob('generate-embeddings', {
        sourceType: 'document',
        sourceId: documentId,
        content: extractedText,
        projectId,
      } as GenerateEmbeddingsData)
    }

    // Update job status to completed
    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        progress: 100,
      })
      .eq('source_id', documentId)

    // Add timeline event
    await supabase.from('timeline_events').insert({
      project_id: projectId,
      event_type: 'document_processed',
      title: 'Document traité',
      description: `Texte extrait (${extractedText.length} caractères)`,
      event_date: new Date().toISOString(),
      source_type: 'document',
      source_id: documentId,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'FAILED',
        error_message: errorMessage,
      })
      .eq('source_id', documentId)

    throw error
  }
}
