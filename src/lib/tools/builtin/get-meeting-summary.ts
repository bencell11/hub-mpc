import type { ToolDefinition, ToolResult, ToolContext, Citation } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const GetMeetingSummaryInputSchema = z.object({
  meetingId: z.string().uuid().describe('ID of the meeting'),
})

const GetMeetingSummaryOutputSchema = z.object({
  meeting: z.object({
    id: z.string().uuid(),
    title: z.string(),
    scheduledAt: z.string().nullable(),
    status: z.string(),
  }),
  summary: z.object({
    id: z.string().uuid(),
    content: z.string(),
    generatedAt: z.string(),
    generatedBy: z.string(),
  }).nullable(),
  decisions: z.array(z.object({
    id: z.string().uuid(),
    content: z.string(),
  })),
  tasks: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    assignee: z.string().nullable(),
  })),
})

type GetMeetingSummaryInput = z.infer<typeof GetMeetingSummaryInputSchema>
type GetMeetingSummaryOutput = z.infer<typeof GetMeetingSummaryOutputSchema>

export const getMeetingSummaryTool: ToolDefinition<GetMeetingSummaryInput, GetMeetingSummaryOutput> = {
  name: 'get_meeting_summary',
  description: 'Récupère le compte rendu d\'une réunion avec les décisions et actions associées.',
  inputSchema: GetMeetingSummaryInputSchema,
  outputSchema: GetMeetingSummaryOutputSchema,
  riskLevel: 'LOW',
  requiresConfirmation: false,
  scopes: ['workspace', 'project'],

  async execute(input: GetMeetingSummaryInput, context: ToolContext): Promise<ToolResult<GetMeetingSummaryOutput>> {
    const supabase = await createServiceClient()

    // Get meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        id,
        title,
        scheduled_at,
        status,
        project_id,
        projects!inner(workspace_id)
      `)
      .eq('id', input.meetingId)
      .eq('projects.workspace_id', context.workspaceId)
      .single()

    if (meetingError || !meeting) {
      return {
        success: false,
        error: 'Meeting not found or access denied',
      }
    }

    // Get summary
    const { data: summary } = await supabase
      .from('summaries')
      .select('*')
      .eq('source_type', 'meeting')
      .eq('source_id', input.meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get decisions
    const { data: decisions } = await supabase
      .from('decisions')
      .select('id, content')
      .eq('meeting_id', input.meetingId)

    // Get tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, metadata')
      .eq('source_type', 'meeting')
      .eq('source_id', input.meetingId)

    const result: GetMeetingSummaryOutput = {
      meeting: {
        id: meeting.id,
        title: meeting.title || '(Sans titre)',
        scheduledAt: meeting.scheduled_at,
        status: meeting.status || 'scheduled',
      },
      summary: summary ? {
        id: summary.id,
        content: summary.content,
        generatedAt: summary.created_at,
        generatedBy: summary.generated_by || 'gpt-4o',
      } : null,
      decisions: (decisions || []).map(d => ({
        id: d.id,
        content: d.content,
      })),
      tasks: (tasks || []).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignee: (t.metadata as { assignee?: string } | null)?.assignee || null,
      })),
    }

    // Build citations
    const citations: Citation[] = []

    if (summary) {
      citations.push({
        sourceType: 'meeting',
        sourceId: meeting.id,
        title: `Compte rendu: ${meeting.title}`,
        excerpt: summary.content.substring(0, 300) + (summary.content.length > 300 ? '...' : ''),
        timestamp: summary.created_at,
        confidence: 1.0,
      })
    }

    return {
      success: true,
      data: result,
      citations,
    }
  },
}
