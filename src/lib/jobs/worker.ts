import { Job } from 'bullmq'
import { createWorker, type JobType } from './queue'
import type { ProcessDocumentData, ProcessAudioData, SyncConnectorData, GenerateEmbeddingsData, GenerateSummaryData } from './queue'
import { processDocument } from './processors/document'
import { processAudio } from './processors/audio'
import { generateEmbeddings } from './processors/embeddings'
import { generateSummary } from './processors/summary'

type JobData = ProcessDocumentData | ProcessAudioData | SyncConnectorData | GenerateEmbeddingsData | GenerateSummaryData

async function processJob(job: Job<JobData>): Promise<void> {
  console.log(`Processing job ${job.id} of type ${job.name}`)

  const jobType = job.name as JobType

  switch (jobType) {
    case 'process-document':
      await processDocument(job as Job<ProcessDocumentData>)
      break

    case 'process-audio':
      await processAudio(job as Job<ProcessAudioData>)
      break

    case 'sync-connector':
      // Connector sync is handled separately
      console.log('Connector sync job:', job.data)
      break

    case 'generate-embeddings':
      await generateEmbeddings(job as Job<GenerateEmbeddingsData>)
      break

    case 'generate-summary':
      await generateSummary(job as Job<GenerateSummaryData>)
      break

    default:
      console.warn(`Unknown job type: ${jobType}`)
  }
}

// Start worker
const worker = createWorker(processJob)

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error)
})

worker.on('error', (error) => {
  console.error('Worker error:', error)
})

console.log('Worker started and listening for jobs...')

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...')
  await worker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Shutting down worker...')
  await worker.close()
  process.exit(0)
})

export { worker }
