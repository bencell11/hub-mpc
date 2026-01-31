import type { ToolDefinition, ToolResult, ToolContext, Citation } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ListEmailsInputSchema = z.object({
  limit: z.number().min(1).max(20).optional().describe('Number of emails to return (default 5)'),
  projectId: z.string().uuid().optional().describe('Filter by project ID'),
})

const ListEmailsOutputSchema = z.object({
  emails: z.array(z.object({
    id: z.string().uuid(),
    subject: z.string(),
    fromAddress: z.string(),
    fromName: z.string().nullable(),
    receivedAt: z.string(),
    preview: z.string(),
  })),
  total: z.number(),
})

type ListEmailsInput = z.infer<typeof ListEmailsInputSchema>
type ListEmailsOutput = z.infer<typeof ListEmailsOutputSchema>

export const listEmailsTool: ToolDefinition<ListEmailsInput, ListEmailsOutput> = {
  name: 'list_emails',
  description: 'Liste les derniers emails reçus. Utile pour voir les emails récents ou le dernier email.',
  inputSchema: ListEmailsInputSchema,
  outputSchema: ListEmailsOutputSchema,
  riskLevel: 'LOW',
  requiresConfirmation: false,
  scopes: ['workspace', 'project'],

  async execute(input: ListEmailsInput, context: ToolContext): Promise<ToolResult<ListEmailsOutput>> {
    const supabase = await createServiceClient()

    // Get emails for the workspace - join with projects to filter by workspace
    let query = supabase
      .from('emails')
      .select(`
        id,
        subject,
        from_address,
        from_name,
        body_text,
        received_at,
        project_id,
        projects!inner(workspace_id)
      `, { count: 'exact' })
      .eq('projects.workspace_id', context.workspaceId)
      .order('received_at', { ascending: false })
      .limit(input.limit || 5)

    if (input.projectId) {
      query = query.eq('project_id', input.projectId)
    }

    const { data: emails, error, count } = await query

    if (error) {
      console.error('List emails error:', error)
      return {
        success: false,
        error: `Failed to list emails: ${error.message}`,
      }
    }

    const results = (emails || []).map(email => ({
      id: email.id,
      subject: email.subject || '(Sans sujet)',
      fromAddress: email.from_address,
      fromName: email.from_name,
      receivedAt: email.received_at,
      preview: (email.body_text || '').substring(0, 150) + ((email.body_text || '').length > 150 ? '...' : ''),
    }))

    // Build citations
    const citations: Citation[] = results.map(r => ({
      sourceType: 'email' as const,
      sourceId: r.id,
      title: r.subject,
      excerpt: r.preview,
      timestamp: r.receivedAt,
      confidence: 1.0,
    }))

    return {
      success: true,
      data: {
        emails: results,
        total: count || results.length,
      },
      citations,
    }
  },
}
