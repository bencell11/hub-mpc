import type { ToolDefinition, ToolResult, ToolContext, Citation } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ListMeetingsInputSchema = z.object({
  limit: z.number().min(1).max(20).optional().describe('Number of meetings to return (default 5)'),
  projectId: z.string().uuid().optional().describe('Filter by project ID'),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional().describe('Filter by status'),
})

const ListMeetingsOutputSchema = z.object({
  meetings: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    scheduledAt: z.string().nullable(),
    status: z.string(),
    hasSummary: z.boolean(),
    hasTranscription: z.boolean(),
    projectName: z.string().nullable(),
  })),
  total: z.number(),
})

type ListMeetingsInput = z.infer<typeof ListMeetingsInputSchema>
type ListMeetingsOutput = z.infer<typeof ListMeetingsOutputSchema>

export const listMeetingsTool: ToolDefinition<ListMeetingsInput, ListMeetingsOutput> = {
  name: 'list_meetings',
  description: 'Liste les réunions. Utile pour voir les réunions récentes, à venir ou passées.',
  inputSchema: ListMeetingsInputSchema,
  outputSchema: ListMeetingsOutputSchema,
  riskLevel: 'LOW',
  requiresConfirmation: false,
  scopes: ['workspace', 'project'],

  async execute(input: ListMeetingsInput, context: ToolContext): Promise<ToolResult<ListMeetingsOutput>> {
    const supabase = await createServiceClient()

    // Get meetings for the workspace
    let query = supabase
      .from('meetings')
      .select(`
        id,
        title,
        scheduled_at,
        status,
        transcription_final,
        project_id,
        projects!inner(workspace_id, name)
      `, { count: 'exact' })
      .eq('projects.workspace_id', context.workspaceId)
      .order('scheduled_at', { ascending: false })
      .limit(input.limit || 5)

    if (input.projectId) {
      query = query.eq('project_id', input.projectId)
    }

    if (input.status) {
      query = query.eq('status', input.status)
    }

    const { data: meetings, error, count } = await query

    if (error) {
      console.error('List meetings error:', error)
      return {
        success: false,
        error: `Failed to list meetings: ${error.message}`,
      }
    }

    // Check if each meeting has a summary
    const meetingIds = (meetings || []).map(m => m.id)
    const { data: summaries } = await supabase
      .from('summaries')
      .select('source_id')
      .eq('source_type', 'meeting')
      .in('source_id', meetingIds)

    const summarySet = new Set((summaries || []).map(s => s.source_id))

    const results = (meetings || []).map(meeting => {
      // Handle the projects relation which could be an object or array
      const projectData = meeting.projects as unknown
      let projectName: string | null = null
      if (projectData && typeof projectData === 'object') {
        if (Array.isArray(projectData) && projectData.length > 0) {
          projectName = (projectData[0] as { name?: string })?.name || null
        } else {
          projectName = (projectData as { name?: string })?.name || null
        }
      }
      return {
        id: meeting.id,
        title: meeting.title || '(Sans titre)',
        scheduledAt: meeting.scheduled_at,
        status: meeting.status || 'scheduled',
        hasSummary: summarySet.has(meeting.id),
        hasTranscription: !!meeting.transcription_final,
        projectName,
      }
    })

    // Build citations
    const citations: Citation[] = results.map(r => ({
      sourceType: 'meeting' as const,
      sourceId: r.id,
      title: r.title,
      excerpt: `Réunion ${r.status === 'completed' ? 'terminée' : r.status === 'in_progress' ? 'en cours' : 'prévue'}${r.scheduledAt ? ` le ${new Date(r.scheduledAt).toLocaleDateString('fr-FR')}` : ''}`,
      timestamp: r.scheduledAt || undefined,
      confidence: 1.0,
    }))

    return {
      success: true,
      data: {
        meetings: results,
        total: count || results.length,
      },
      citations,
    }
  },
}
