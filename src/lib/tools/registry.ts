import type { ToolDefinition, ToolContext, ToolResult, RiskLevel } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { zodToJsonSchema } from 'zod-to-json-schema'

// Tool registry - singleton pattern
class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()

  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`)
    }
    this.tools.set(tool.name, tool as ToolDefinition)
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  getByRiskLevel(level: RiskLevel): ToolDefinition[] {
    return this.getAll().filter(tool => tool.riskLevel === level)
  }

  getRequiringConfirmation(): ToolDefinition[] {
    return this.getAll().filter(tool => tool.requiresConfirmation)
  }

  // Get tools available for a given scope
  getForScope(scope: 'workspace' | 'project'): ToolDefinition[] {
    return this.getAll().filter(tool => tool.scopes.includes(scope))
  }

  // Convert to OpenAI function calling format
  toOpenAIFunctions(): Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }> {
    return this.getAll().map(tool => {
      // Use zod-to-json-schema for proper conversion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonSchema = zodToJsonSchema(tool.inputSchema as any, { target: 'openApi3' })

      // Remove $schema and other OpenAPI-specific fields that OpenAI doesn't need
      const { $schema, ...parameters } = jsonSchema as Record<string, unknown>

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters,
        },
      }
    })
  }
}

// Global registry instance
export const toolRegistry = new ToolRegistry()

// Tool executor with policy checks
export class ToolExecutor {
  async execute(
    toolName: string,
    input: unknown,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = toolRegistry.get(toolName)
    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolName}" not found`,
      }
    }

    // Validate input
    const parseResult = tool.inputSchema.safeParse(input)
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid input: ${parseResult.error.message}`,
      }
    }

    // Log the tool call
    const supabase = await createServiceClient()
    const toolRecord = await this.logToolCall(supabase, tool, input, context)

    // Check if confirmation is required
    if (tool.requiresConfirmation) {
      return {
        success: true,
        data: {
          requiresConfirmation: true,
          toolCallId: toolRecord?.id,
          message: `This action requires confirmation. Tool: ${toolName}`,
        },
      }
    }

    // Execute the tool
    try {
      const result = await tool.execute(parseResult.data, context)

      // Update the tool call record
      if (toolRecord) {
        await supabase
          .from('tool_calls')
          .update({
            status: result.success ? 'executed' : 'failed',
            output: result.data as Record<string, unknown>,
            error_message: result.error,
            executed_at: new Date().toISOString(),
          })
          .eq('id', toolRecord.id)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (toolRecord) {
        await supabase
          .from('tool_calls')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', toolRecord.id)
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async confirmAndExecute(
    toolCallId: string,
    userId: string
  ): Promise<ToolResult> {
    const supabase = await createServiceClient()

    // Get the tool call
    const { data: toolCall, error } = await supabase
      .from('tool_calls')
      .select('*, tool_registry!inner(*)')
      .eq('id', toolCallId)
      .single()

    if (error || !toolCall) {
      return {
        success: false,
        error: 'Tool call not found',
      }
    }

    if (toolCall.status !== 'pending') {
      return {
        success: false,
        error: `Tool call is not pending. Current status: ${toolCall.status}`,
      }
    }

    // Mark as confirmed
    await supabase
      .from('tool_calls')
      .update({
        status: 'confirmed',
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', toolCallId)

    // Execute the tool
    const tool = toolRegistry.get((toolCall.tool_registry as { name: string }).name)
    if (!tool) {
      return {
        success: false,
        error: 'Tool not found in registry',
      }
    }

    const context: ToolContext = {
      userId: toolCall.user_id,
      workspaceId: toolCall.workspace_id,
      projectId: toolCall.project_id || undefined,
    }

    try {
      const result = await tool.execute(toolCall.input, context)

      await supabase
        .from('tool_calls')
        .update({
          status: result.success ? 'executed' : 'failed',
          output: result.data as Record<string, unknown>,
          error_message: result.error,
          executed_at: new Date().toISOString(),
        })
        .eq('id', toolCallId)

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await supabase
        .from('tool_calls')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', toolCallId)

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  private async logToolCall(
    supabase: Awaited<ReturnType<typeof createServiceClient>>,
    tool: ToolDefinition,
    input: unknown,
    context: ToolContext
  ) {
    // Get tool ID from registry table
    const { data: toolRecord } = await supabase
      .from('tool_registry')
      .select('id')
      .eq('name', tool.name)
      .single()

    if (!toolRecord) {
      console.warn(`Tool "${tool.name}" not found in database registry`)
      return null
    }

    const { data, error } = await supabase
      .from('tool_calls')
      .insert({
        tool_id: toolRecord.id,
        workspace_id: context.workspaceId,
        project_id: context.projectId,
        user_id: context.userId,
        input: input as Record<string, unknown>,
        status: tool.requiresConfirmation ? 'pending' : 'executed',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to log tool call:', error)
      return null
    }

    return data
  }
}

export const toolExecutor = new ToolExecutor()
