import type { ToolDefinition, ToolResult, ToolContext, Citation } from '@/types/tools'
import { SemanticSearchInputSchema, SemanticSearchResultSchema } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { getEmbedding } from '@/lib/ai/embeddings'
import { z } from 'zod'

type SemanticSearchInput = z.infer<typeof SemanticSearchInputSchema>
type SemanticSearchResult = z.infer<typeof SemanticSearchResultSchema>

export const semanticSearchTool: ToolDefinition<SemanticSearchInput, SemanticSearchResult> = {
  name: 'semantic_search',
  description: 'Recherche sémantique dans tous les contenus indexés (documents, emails, transcriptions, notes). Trouve des informations pertinentes même si les mots exacts ne correspondent pas.',
  inputSchema: SemanticSearchInputSchema,
  outputSchema: SemanticSearchResultSchema,
  riskLevel: 'LOW',
  requiresConfirmation: false,
  scopes: ['workspace', 'project'],

  async execute(input: SemanticSearchInput, context: ToolContext): Promise<ToolResult<SemanticSearchResult>> {
    const supabase = await createServiceClient()

    // Generate embedding for the query
    let queryEmbedding: number[]
    try {
      queryEmbedding = await getEmbedding(input.query)
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }

    // Search using pgvector
    const { data: matches, error } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: input.threshold || 0.7,
      match_count: input.limit || 10,
      filter_source_type: input.sourceTypes?.[0] || null,
      filter_project_id: input.projectId || null,
    })

    if (error) {
      return {
        success: false,
        error: `Semantic search failed: ${error.message}`,
      }
    }

    interface MatchResult {
      source_type: string
      source_id: string
      content: string
      similarity: number
      metadata: Record<string, unknown>
    }
    const results = ((matches || []) as MatchResult[]).map((match) => ({
      sourceType: match.source_type,
      sourceId: match.source_id,
      content: match.content,
      similarity: match.similarity,
      metadata: match.metadata as Record<string, unknown>,
    }))

    // Fetch source details for citations
    const citations: Citation[] = await Promise.all(
      results.map(async (r) => {
        let title = 'Unknown source'
        let url: string | undefined

        switch (r.sourceType) {
          case 'document': {
            const { data } = await supabase
              .from('documents')
              .select('name')
              .eq('id', r.sourceId)
              .single()
            title = data?.name || 'Document'
            url = `/dashboard/documents/${r.sourceId}`
            break
          }
          case 'email': {
            const { data } = await supabase
              .from('emails')
              .select('subject')
              .eq('id', r.sourceId)
              .single()
            title = data?.subject || 'Email'
            url = `/dashboard/emails/${r.sourceId}`
            break
          }
          case 'meeting': {
            const { data } = await supabase
              .from('meetings')
              .select('title')
              .eq('id', r.sourceId)
              .single()
            title = data?.title || 'Meeting'
            url = `/dashboard/meetings/${r.sourceId}`
            break
          }
          case 'note': {
            const { data } = await supabase
              .from('notes')
              .select('title, content')
              .eq('id', r.sourceId)
              .single()
            title = data?.title || data?.content?.substring(0, 50) || 'Note'
            url = `/dashboard/notes/${r.sourceId}`
            break
          }
        }

        return {
          sourceType: r.sourceType as Citation['sourceType'],
          sourceId: r.sourceId,
          title,
          excerpt: r.content.substring(0, 300),
          confidence: r.similarity,
          url,
        }
      })
    )

    // Log audit
    await supabase.from('audit_logs').insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      action: 'semantic_search',
      resource_type: 'embedding',
      details: {
        query: input.query,
        resultsCount: results.length,
        threshold: input.threshold || 0.7,
      },
    })

    return {
      success: true,
      data: { results },
      citations,
    }
  },
}
