import type { ToolDefinition, ToolResult, ToolContext } from '@/types/tools'
import { CreateTaskInputSchema, TaskOutputSchema } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>
type TaskOutput = z.infer<typeof TaskOutputSchema>

export const createTaskTool: ToolDefinition<CreateTaskInput, TaskOutput> = {
  name: 'create_task',
  description: 'Crée une nouvelle tâche dans un projet. Utilisez cet outil pour ajouter des actions à réaliser avec une date d\'échéance optionnelle.',
  inputSchema: CreateTaskInputSchema,
  outputSchema: TaskOutputSchema,
  riskLevel: 'LOW',
  requiresConfirmation: false,
  scopes: ['project'],

  async execute(input: CreateTaskInput, context: ToolContext): Promise<ToolResult<TaskOutput>> {
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

    // Verify assignee if provided
    if (input.assigneeId) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', context.workspaceId)
        .eq('user_id', input.assigneeId)
        .single()

      if (!member) {
        return {
          success: false,
          error: 'Assignee is not a member of the workspace',
        }
      }
    }

    // Create the task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        project_id: input.projectId,
        title: input.title,
        description: input.description || null,
        priority: input.priority || 'medium',
        due_date: input.dueDate || null,
        assignee_id: input.assigneeId || null,
        status: 'TODO',
        created_by: context.userId,
      })
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Failed to create task: ${error.message}`,
      }
    }

    // Add to timeline
    await supabase.from('timeline_events').insert({
      project_id: input.projectId,
      event_type: 'task_created',
      title: `Tâche: ${input.title}`,
      description: input.description?.substring(0, 200),
      event_date: new Date().toISOString(),
      source_type: 'task',
      source_id: task.id,
      metadata: {
        priority: input.priority,
        dueDate: input.dueDate,
      },
    })

    // Log audit
    await supabase.from('audit_logs').insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      action: 'create_task',
      resource_type: 'task',
      resource_id: task.id,
      details: { projectId: input.projectId, title: input.title },
    })

    return {
      success: true,
      data: {
        id: task.id,
        title: task.title,
        status: task.status,
        createdAt: task.created_at,
      },
    }
  },
}
