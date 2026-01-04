import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

// Job types
export type JobType =
  | 'process-document'
  | 'process-audio'
  | 'sync-connector'
  | 'generate-embeddings'
  | 'generate-summary'

export interface ProcessDocumentData {
  documentId: string
  projectId: string
  workspaceId: string
  storagePath: string
  mimeType: string
}

export interface ProcessAudioData {
  meetingId: string
  projectId: string
  workspaceId: string
  audioPath: string
}

export interface SyncConnectorData {
  connectorId: string
  workspaceId: string
  projectId?: string
}

export interface GenerateEmbeddingsData {
  sourceType: 'document' | 'email' | 'meeting' | 'note'
  sourceId: string
  content: string
  projectId: string
}

export interface GenerateSummaryData {
  sourceType: 'meeting' | 'document' | 'email'
  sourceId: string
  content: string
}

type JobData =
  | ProcessDocumentData
  | ProcessAudioData
  | SyncConnectorData
  | GenerateEmbeddingsData
  | GenerateSummaryData

// Create queues
export const ingestionQueue = new Queue<JobData>('ingestion', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
})

// Add job to queue
export async function addJob(
  type: JobType,
  data: JobData,
  options?: { priority?: number; delay?: number }
): Promise<Job<JobData>> {
  return ingestionQueue.add(type, data, {
    priority: options?.priority,
    delay: options?.delay,
  })
}

// Get queue stats
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    ingestionQueue.getWaitingCount(),
    ingestionQueue.getActiveCount(),
    ingestionQueue.getCompletedCount(),
    ingestionQueue.getFailedCount(),
  ])

  return { waiting, active, completed, failed }
}

// Create worker (to be run in a separate process)
export function createWorker(processor: (job: Job<JobData>) => Promise<void>) {
  return new Worker<JobData>('ingestion', processor, {
    connection,
    concurrency: 5,
  })
}

export { connection }
