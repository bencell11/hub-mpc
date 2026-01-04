import type { Job } from 'bullmq'
import type { GenerateEmbeddingsData } from '../queue'
import { createServiceClient } from '@/lib/supabase/server'
import { getEmbeddings, chunkText } from '@/lib/ai/embeddings'

export async function generateEmbeddings(job: Job<GenerateEmbeddingsData>): Promise<void> {
  const { sourceType, sourceId, content, projectId } = job.data
  const supabase = await createServiceClient()

  try {
    // Chunk the content
    const chunks = chunkText(content, 1000, 200)

    if (chunks.length === 0) {
      console.log(`No chunks generated for ${sourceType}:${sourceId}`)
      return
    }

    // Generate embeddings for all chunks
    const embeddings = await getEmbeddings(chunks)

    // Delete existing embeddings for this source
    await supabase
      .from('embeddings')
      .delete()
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)

    // Insert new embeddings
    const embeddingRecords = chunks.map((chunk, index) => ({
      source_type: sourceType,
      source_id: sourceId,
      chunk_index: index,
      content: chunk,
      embedding: embeddings[index],
      metadata: {
        project_id: projectId,
        chunk_length: chunk.length,
      },
    }))

    // Insert in batches of 100
    const batchSize = 100
    for (let i = 0; i < embeddingRecords.length; i += batchSize) {
      const batch = embeddingRecords.slice(i, i + batchSize)
      const { error } = await supabase.from('embeddings').insert(batch)

      if (error) {
        throw new Error(`Failed to insert embeddings batch: ${error.message}`)
      }
    }

    console.log(`Generated ${embeddings.length} embeddings for ${sourceType}:${sourceId}`)

  } catch (error) {
    console.error(`Failed to generate embeddings for ${sourceType}:${sourceId}:`, error)
    throw error
  }
}
