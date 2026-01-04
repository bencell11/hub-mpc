import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chat, type ChatMessage } from '@/lib/ai/chat'
import { registerBuiltinTools } from '@/lib/tools/builtin'

// Register tools on startup
registerBuiltinTools()

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const { data: membershipData } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    const membership = membershipData as { workspace_id: string } | null
    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const body = await request.json() as {
      messages: ChatMessage[]
      projectId?: string
    }

    const { messages, projectId } = body

    // Get project context if provided
    let projectContext: { id: string; name: string; description?: string } | undefined
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('id, name, description')
        .eq('id', projectId)
        .single()

      if (project) {
        const p = project as { id: string; name: string; description: string | null }
        projectContext = {
          id: p.id,
          name: p.name,
          description: p.description || undefined,
        }
      }
    }

    // Call chat function
    const response = await chat(messages, {
      userId: user.id,
      workspaceId: membership.workspace_id,
      projectId,
    }, {
      projectContext,
    })

    // Log the chat interaction
    await supabase.from('audit_logs').insert({
      workspace_id: membership.workspace_id,
      user_id: user.id,
      action: 'chat_message',
      resource_type: 'chat',
      details: {
        messageCount: messages.length,
        hasToolCalls: (response.toolCalls?.length || 0) > 0,
        hasCitations: (response.citations?.length || 0) > 0,
      },
    })

    return NextResponse.json({
      content: response.content,
      citations: response.citations,
      toolCalls: response.toolCalls,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
