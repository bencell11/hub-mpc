import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { toolExecutor, toolRegistry } from '@/lib/tools/registry'
import { registerBuiltinTools } from '@/lib/tools/builtin'
import type { ToolContext } from '@/types/tools'

// Ensure tools are registered
registerBuiltinTools()

// POST /api/tools/execute - Execute a tool directly
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // Get user's workspace
    const { data: membership } = await serviceClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const body = await request.json()
    const { toolName, input, confirmed = false, projectId } = body

    if (!toolName) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 })
    }

    // Get the tool
    const tool = toolRegistry.get(toolName)
    if (!tool) {
      return NextResponse.json({ error: `Tool "${toolName}" not found` }, { status: 404 })
    }

    // Build context
    const context: ToolContext = {
      userId: user.id,
      workspaceId: membership.workspace_id,
      projectId,
    }

    // If tool requires confirmation and not confirmed, return pending
    if (tool.requiresConfirmation && !confirmed) {
      // Validate input first
      const parseResult = tool.inputSchema.safeParse(input)
      if (!parseResult.success) {
        return NextResponse.json({
          error: `Invalid input: ${parseResult.error.message}`,
        }, { status: 400 })
      }

      return NextResponse.json({
        requiresConfirmation: true,
        toolName,
        input,
        message: `Cette action nécessite une confirmation: ${tool.description}`,
      })
    }

    // Execute the tool
    const result = await toolExecutor.execute(toolName, input, context)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      citations: result.citations,
    })
  } catch (error) {
    console.error('Tool execution error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// GET /api/tools/execute - List available tools
export async function GET() {
  try {
    const tools = toolRegistry.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      riskLevel: tool.riskLevel,
      requiresConfirmation: tool.requiresConfirmation,
      scopes: tool.scopes,
    }))

    return NextResponse.json(tools)
  } catch (error) {
    console.error('List tools error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
