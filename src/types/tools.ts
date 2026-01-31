import { z } from 'zod'

// Risk levels for tools
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

// Tool execution result
export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  citations?: Citation[]
}

// Citation for sourced responses
export interface Citation {
  sourceType: 'document' | 'email' | 'meeting' | 'note' | 'decision'
  sourceId: string
  title: string
  excerpt: string
  timestamp?: string
  confidence: number
  url?: string
}

// Base tool definition
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string
  description: string
  inputSchema: z.ZodSchema<TInput>
  outputSchema: z.ZodSchema<TOutput>
  riskLevel: RiskLevel
  requiresConfirmation: boolean
  scopes: ('workspace' | 'project')[]
  execute: (input: TInput, context: ToolContext) => Promise<ToolResult<TOutput>>
}

// Context passed to tool execution
export interface ToolContext {
  userId: string
  workspaceId: string
  projectId?: string
  sessionId?: string
}

// Tool call record
export interface ToolCallRecord {
  id: string
  toolName: string
  input: unknown
  output?: unknown
  status: 'pending' | 'confirmed' | 'executed' | 'failed' | 'cancelled'
  errorMessage?: string
  confirmedBy?: string
  confirmedAt?: string
  executedAt?: string
  createdAt: string
}

// Policy configuration
export interface PolicyConfig {
  // Read permissions
  allowedReadSources: string[]

  // Write permissions
  allowedWriteOperations: string[]

  // External communications require confirmation
  externalCommunicationRequiresConfirmation: boolean

  // File operations
  allowedFilePaths: string[]
  blockedFilePaths: string[]

  // Web access
  allowedDomains: string[]
  blockedDomains: string[]

  // Quotas
  quotas: {
    llmTokensPerDay: number
    audioMinutesPerMonth: number
    storageGb: number
  }

  // PII handling
  redactPII: boolean
}

// Default policy for new workspaces
export const defaultPolicy: PolicyConfig = {
  allowedReadSources: ['*'],
  allowedWriteOperations: ['note', 'task', 'decision'],
  externalCommunicationRequiresConfirmation: true,
  allowedFilePaths: [],
  blockedFilePaths: ['/etc', '/var', '/usr', '/bin', '/sbin'],
  allowedDomains: [],
  blockedDomains: [],
  quotas: {
    llmTokensPerDay: 100000,
    audioMinutesPerMonth: 600,
    storageGb: 10,
  },
  redactPII: false,
}

// Input schemas for built-in tools
export const AddNoteInputSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().optional(),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
})

export const CreateTaskInputSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
})

export const SearchEmailsInputSchema = z.object({
  query: z.string().min(1),
  projectId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sender: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
})

export const SearchDocumentsInputSchema = z.object({
  query: z.string().min(1),
  projectId: z.string().uuid().optional(),
  types: z.array(z.enum(['PDF', 'IMAGE', 'AUDIO', 'VIDEO', 'TEXT', 'SPREADSHEET', 'OTHER'])).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(50).optional(),
})

export const SendTelegramInputSchema = z.object({
  channel: z.string().min(1),
  message: z.string().min(1).max(4096),
})

export const SendEmailInputSchema = z.object({
  to: z.string().email().describe('Email address of the recipient'),
  subject: z.string().min(1).max(200).describe('Email subject'),
  body: z.string().min(1).describe('Email body content (supports HTML)'),
  replyTo: z.string().email().optional().describe('Reply-to email address'),
})

export const ExportSummaryInputSchema = z.object({
  meetingId: z.string().uuid(),
  format: z.enum(['pdf', 'markdown', 'html']),
})

export const SemanticSearchInputSchema = z.object({
  query: z.string().min(1),
  projectId: z.string().uuid().optional(),
  sourceTypes: z.array(z.string()).optional(),
  limit: z.number().min(1).max(20).optional(),
  threshold: z.number().min(0).max(1).optional(),
})

// Output schemas
export const NoteOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  content: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
})

export const TaskOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']),
  createdAt: z.string(),
})

export const EmailSearchResultSchema = z.object({
  results: z.array(z.object({
    id: z.string().uuid(),
    subject: z.string(),
    fromAddress: z.string(),
    fromName: z.string().nullable(),
    receivedAt: z.string(),
    excerpt: z.string(),
  })),
  total: z.number(),
})

export const SemanticSearchResultSchema = z.object({
  results: z.array(z.object({
    sourceType: z.string(),
    sourceId: z.string().uuid(),
    content: z.string(),
    similarity: z.number(),
    metadata: z.record(z.string(), z.unknown()),
  })),
})

// Type exports
export type AddNoteInput = z.infer<typeof AddNoteInputSchema>
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>
export type SearchEmailsInput = z.infer<typeof SearchEmailsInputSchema>
export type SearchDocumentsInput = z.infer<typeof SearchDocumentsInputSchema>
export type SendTelegramInput = z.infer<typeof SendTelegramInputSchema>
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>
export type ExportSummaryInput = z.infer<typeof ExportSummaryInputSchema>
export type SemanticSearchInput = z.infer<typeof SemanticSearchInputSchema>
