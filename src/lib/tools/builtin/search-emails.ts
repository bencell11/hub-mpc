import type { ToolDefinition, ToolResult, ToolContext, Citation } from '@/types/tools'
import { SearchEmailsInputSchema, EmailSearchResultSchema } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

type SearchEmailsInput = z.infer<typeof SearchEmailsInputSchema>
type EmailSearchResult = z.infer<typeof EmailSearchResultSchema>

export const searchEmailsTool: ToolDefinition<SearchEmailsInput, EmailSearchResult> = {
  name: 'search_emails',
  description: 'Recherche dans les emails du projet. Permet de retrouver des informations, dates, décisions mentionnées dans les échanges.',
  inputSchema: SearchEmailsInputSchema,
  outputSchema: EmailSearchResultSchema,
  riskLevel: 'LOW',
  requiresConfirmation: false,
  scopes: ['workspace', 'project'],

  async execute(input: SearchEmailsInput, context: ToolContext): Promise<ToolResult<EmailSearchResult>> {
    const supabase = await createServiceClient()

    // Build the query
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
      `)
      .eq('projects.workspace_id', context.workspaceId)

    // Filter by project if specified
    if (input.projectId) {
      query = query.eq('project_id', input.projectId)
    }

    // Filter by date range
    if (input.dateFrom) {
      query = query.gte('received_at', input.dateFrom)
    }
    if (input.dateTo) {
      query = query.lte('received_at', input.dateTo)
    }

    // Filter by sender
    if (input.sender) {
      query = query.or(`from_address.ilike.%${input.sender}%,from_name.ilike.%${input.sender}%`)
    }

    // Full-text search on subject and body
    // Using PostgreSQL text search
    query = query.or(`subject.ilike.%${input.query}%,body_text.ilike.%${input.query}%`)

    // Apply limit
    query = query.limit(input.limit || 10)

    // Order by relevance (most recent first for now)
    query = query.order('received_at', { ascending: false })

    const { data: emails, error, count } = await supabase
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
      .or(`subject.ilike.%${input.query}%,body_text.ilike.%${input.query}%`)
      .limit(input.limit || 10)
      .order('received_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: `Failed to search emails: ${error.message}`,
      }
    }

    // Generate excerpts around the query term
    const results = (emails || []).map(email => {
      let excerpt = ''
      const bodyText = email.body_text || ''
      const queryLower = input.query.toLowerCase()
      const index = bodyText.toLowerCase().indexOf(queryLower)

      if (index !== -1) {
        const start = Math.max(0, index - 100)
        const end = Math.min(bodyText.length, index + input.query.length + 100)
        excerpt = (start > 0 ? '...' : '') +
          bodyText.substring(start, end) +
          (end < bodyText.length ? '...' : '')
      } else {
        excerpt = bodyText.substring(0, 200) + (bodyText.length > 200 ? '...' : '')
      }

      return {
        id: email.id,
        subject: email.subject,
        fromAddress: email.from_address,
        fromName: email.from_name,
        receivedAt: email.received_at,
        excerpt,
      }
    })

    // Build citations
    const citations: Citation[] = results.map(r => ({
      sourceType: 'email' as const,
      sourceId: r.id,
      title: r.subject,
      excerpt: r.excerpt,
      timestamp: r.receivedAt,
      confidence: 0.8,
    }))

    // Log audit
    await supabase.from('audit_logs').insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      action: 'search_emails',
      resource_type: 'email',
      details: { query: input.query, resultsCount: results.length },
    })

    return {
      success: true,
      data: {
        results,
        total: count || results.length,
      },
      citations,
    }
  },
}
