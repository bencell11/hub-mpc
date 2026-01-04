import type { ToolDefinition, ToolResult, ToolContext } from '@/types/tools'
import { AddNoteInputSchema, NoteOutputSchema } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

type AddNoteInput = z.infer<typeof AddNoteInputSchema>
type NoteOutput = z.infer<typeof NoteOutputSchema>

export const addNoteTool: ToolDefinition<AddNoteInput, NoteOutput> = {
  name: 'add_note',
  description: 'Ajoute une note à un projet. Utilisez cet outil pour enregistrer des informations, observations ou réflexions liées au projet.',
  inputSchema: AddNoteInputSchema,
  outputSchema: NoteOutputSchema,
  riskLevel: 'LOW',
  requiresConfirmation: false,
  scopes: ['project'],

  async execute(input: AddNoteInput, context: ToolContext): Promise<ToolResult<NoteOutput>> {
    const supabase = await createServiceClient()

    // Verify project belongs to workspace
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', input.projectId)
      .single()

    if (projectError || !project) {
      return {
        success: false,
        error: 'Project not found',
      }
    }

    if (project.workspace_id !== context.workspaceId) {
      return {
        success: false,
        error: 'Project does not belong to the current workspace',
      }
    }

    // Create the note
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        project_id: input.projectId,
        title: input.title || null,
        content: input.content,
        tags: input.tags || [],
        created_by: context.userId,
      })
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Failed to create note: ${error.message}`,
      }
    }

    // Add to timeline
    await supabase.from('timeline_events').insert({
      project_id: input.projectId,
      event_type: 'note_added',
      title: input.title || 'Nouvelle note',
      description: input.content.substring(0, 200),
      event_date: new Date().toISOString(),
      source_type: 'note',
      source_id: note.id,
    })

    // Log audit
    await supabase.from('audit_logs').insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      action: 'create_note',
      resource_type: 'note',
      resource_id: note.id,
      details: { projectId: input.projectId, title: input.title },
    })

    return {
      success: true,
      data: {
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        createdAt: note.created_at,
      },
    }
  },
}
