import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Default summary template
const DEFAULT_TEMPLATE = `## Résumé
{résumé en 2-3 phrases}

## Points clés
- {point 1}
- {point 2}
- ...

## Décisions prises
- {décision 1}
- {décision 2}
- ...

## Actions à suivre
- [ ] {action 1} - Responsable: {nom}
- [ ] {action 2} - Responsable: {nom}
- ...

## Dates importantes
- {date 1}: {événement}
- {date 2}: {événement}

## Questions en suspens
- {question 1}
- {question 2}`

// POST /api/meetings/[id]/summary - Generate summary for a meeting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get meeting with transcription
    const { data: meeting } = await serviceClient
      .from('meetings')
      .select('id, title, transcription_final, metadata, project_id')
      .eq('id', id)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (!meeting.transcription_final) {
      return NextResponse.json({ error: 'No transcription available' }, { status: 400 })
    }

    // Get custom template from request or meeting metadata
    const body = await request.json().catch(() => ({}))
    const template = body.template || meeting.metadata?.summaryTemplate || DEFAULT_TEMPLATE
    const context = body.context || meeting.metadata?.context || ''

    // Build the prompt
    const systemPrompt = `Tu es un assistant spécialisé dans la rédaction de comptes rendus de réunion professionnels.
Tu dois analyser la transcription et produire un compte rendu structuré et actionnable.

Règles importantes:
1. Sois précis et concis
2. Identifie clairement les décisions prises
3. Liste toutes les actions avec leurs responsables si mentionnés
4. Note les dates et deadlines importantes
5. Conserve le contexte métier (architecture, construction, etc.)
6. Utilise un ton professionnel`

    const userPrompt = `${context ? `Contexte de la réunion: ${context}\n\n` : ''}Voici la transcription de la réunion "${meeting.title}":

---
${meeting.transcription_final}
---

Génère un compte rendu structuré en suivant ce modèle:

${template}

Important:
- Remplis chaque section avec les informations pertinentes de la transcription
- Si une section n'a pas d'information, indique "Aucun élément mentionné"
- Pour les actions, essaie d'identifier qui est responsable`

    // Call GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    })

    const summaryContent = completion.choices[0].message.content || ''

    // Store summary
    const { data: summary, error: summaryError } = await serviceClient
      .from('summaries')
      .insert({
        source_type: 'meeting',
        source_id: id,
        content: summaryContent,
        format: 'markdown',
        generated_by: 'gpt-4o',
      })
      .select()
      .single()

    if (summaryError) {
      console.error('Summary storage error:', summaryError)
    }

    // Extract and store decisions
    const decisions = extractDecisions(summaryContent)
    if (decisions.length > 0) {
      await serviceClient.from('decisions').insert(
        decisions.map(d => ({
          project_id: meeting.project_id,
          meeting_id: id,
          content: d,
          status: 'ACTIVE',
          decided_at: new Date().toISOString(),
        }))
      )
    }

    // Extract and store tasks
    const tasks = extractTasks(summaryContent)
    if (tasks.length > 0) {
      await serviceClient.from('tasks').insert(
        tasks.map(t => ({
          project_id: meeting.project_id,
          title: t.title,
          description: `Extrait de la réunion: ${meeting.title}`,
          status: 'TODO',
          priority: 'medium',
          source_type: 'meeting',
          source_id: id,
          metadata: { assignee: t.assignee },
        }))
      )
    }

    // Add timeline event
    await serviceClient.from('timeline_events').insert({
      project_id: meeting.project_id,
      event_type: 'summary_generated',
      title: 'Compte rendu généré',
      event_date: new Date().toISOString(),
      source_type: 'meeting',
      source_id: id,
      metadata: {
        decisionsCount: decisions.length,
        tasksCount: tasks.length,
      },
    })

    return NextResponse.json({
      success: true,
      summary: summaryContent,
      summaryId: summary?.id,
      decisions,
      tasks,
    })
  } catch (error) {
    console.error('Summary API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// Helper: Extract decisions from summary
function extractDecisions(summary: string): string[] {
  const decisions: string[] = []
  const decisionSection = summary.match(/## Décisions prises\n([\s\S]*?)(?=\n##|$)/i)

  if (decisionSection) {
    const lines = decisionSection[1].split('\n')
    for (const line of lines) {
      const match = line.match(/^[-*]\s+(.+)/)
      if (match && !match[1].toLowerCase().includes('aucun')) {
        decisions.push(match[1].trim())
      }
    }
  }

  return decisions
}

// Helper: Extract tasks from summary
function extractTasks(summary: string): Array<{ title: string; assignee?: string }> {
  const tasks: Array<{ title: string; assignee?: string }> = []
  const actionSection = summary.match(/## Actions à suivre\n([\s\S]*?)(?=\n##|$)/i)

  if (actionSection) {
    const lines = actionSection[1].split('\n')
    for (const line of lines) {
      const match = line.match(/^[-*]\s*\[[ x]?\]\s*(.+?)(?:\s*[-–]\s*Responsable\s*:\s*(.+))?$/i)
      if (match && !match[1].toLowerCase().includes('aucun')) {
        tasks.push({
          title: match[1].trim(),
          assignee: match[2]?.trim(),
        })
      }
    }
  }

  return tasks
}

// GET /api/meetings/[id]/summary - Get existing summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // Get latest summary for meeting
    const { data: summary, error } = await serviceClient
      .from('summaries')
      .select('*')
      .eq('source_type', 'meeting')
      .eq('source_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !summary) {
      return NextResponse.json({ error: 'No summary found' }, { status: 404 })
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Summary GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
