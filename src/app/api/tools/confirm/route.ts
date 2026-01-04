import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toolExecutor } from '@/lib/tools/registry'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { toolCallId: string }
    const { toolCallId } = body

    if (!toolCallId) {
      return NextResponse.json({ error: 'Tool call ID required' }, { status: 400 })
    }

    // Execute the confirmed tool
    const result = await toolExecutor.confirmAndExecute(toolCallId, user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Tool confirm API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
