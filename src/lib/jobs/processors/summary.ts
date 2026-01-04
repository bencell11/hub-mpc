import type { Job } from 'bullmq'
import type { GenerateSummaryData } from '../queue'
import { createServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SUMMARY_PROMPT = `Tu es un assistant qui génère des résumés structurés de réunions professionnelles.

Analyse la transcription suivante et génère un résumé au format markdown avec les sections suivantes:

## Résumé
[2-3 phrases résumant la réunion]

## Points clés
- [Liste des points importants discutés]

## Décisions prises
- [Liste des décisions avec contexte]

## Actions à suivre
- [ ] [Action] - Responsable: [Nom si mentionné]

## Dates mentionnées
- [Date]: [Contexte]

## Questions en suspens
- [Questions non résolues]

Sois concis et factuel. Cite les extraits pertinents entre guillemets quand c'est utile.`

export async function generateSummary(job: Job<GenerateSummaryData>): Promise<void> {
  const { sourceType, sourceId, content } = job.data
  const supabase = await createServiceClient()

  try {
    // Generate summary using GPT-4
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: `Voici la transcription de la réunion:\n\n${content}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const summaryContent = response.choices[0].message.content || ''

    // Extract structured data from summary
    const citations = extractCitations(content, summaryContent)
    const decisions = extractDecisions(summaryContent)
    const actions = extractActions(summaryContent)

    // Store summary
    await supabase.from('summaries').insert({
      source_type: sourceType,
      source_id: sourceId,
      format: 'markdown',
      content: summaryContent,
      citations,
    })

    // Extract and store decisions
    if (decisions.length > 0 && sourceType === 'meeting') {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('project_id')
        .eq('id', sourceId)
        .single()

      if (meeting) {
        for (const decision of decisions) {
          await supabase.from('decisions').insert({
            project_id: meeting.project_id,
            title: decision.title,
            description: decision.description,
            source_type: 'meeting',
            source_id: sourceId,
            decided_at: new Date().toISOString(),
          })
        }

        // Create tasks from actions
        const { data: { user } } = await supabase.auth.getUser()
        for (const action of actions) {
          await supabase.from('tasks').insert({
            project_id: meeting.project_id,
            title: action.title,
            description: action.assignee ? `Responsable: ${action.assignee}` : null,
            status: 'TODO',
            source_type: 'meeting',
            source_id: sourceId,
            created_by: user?.id || sourceId,
          })
        }
      }
    }

    console.log(`Generated summary for ${sourceType}:${sourceId}`)

  } catch (error) {
    console.error(`Failed to generate summary for ${sourceType}:${sourceId}:`, error)
    throw error
  }
}

function extractCitations(originalContent: string, summary: string): Array<{ text: string; position: number }> {
  // Find quoted text in summary and locate in original
  const citations: Array<{ text: string; position: number }> = []
  const quoteRegex = /«([^»]+)»|"([^"]+)"/g
  let match

  while ((match = quoteRegex.exec(summary)) !== null) {
    const quote = match[1] || match[2]
    const position = originalContent.toLowerCase().indexOf(quote.toLowerCase())
    if (position !== -1) {
      citations.push({ text: quote, position })
    }
  }

  return citations
}

function extractDecisions(summary: string): Array<{ title: string; description: string }> {
  const decisions: Array<{ title: string; description: string }> = []

  // Find the "Décisions prises" section
  const decisionsMatch = summary.match(/## Décisions prises\n([\s\S]*?)(?=\n##|$)/)
  if (decisionsMatch) {
    const lines = decisionsMatch[1].split('\n').filter(line => line.trim().startsWith('-'))
    for (const line of lines) {
      const text = line.replace(/^-\s*/, '').trim()
      if (text.length > 0) {
        decisions.push({
          title: text.substring(0, 100),
          description: text,
        })
      }
    }
  }

  return decisions
}

function extractActions(summary: string): Array<{ title: string; assignee?: string }> {
  const actions: Array<{ title: string; assignee?: string }> = []

  // Find the "Actions à suivre" section
  const actionsMatch = summary.match(/## Actions à suivre\n([\s\S]*?)(?=\n##|$)/)
  if (actionsMatch) {
    const lines = actionsMatch[1].split('\n').filter(line => line.trim().startsWith('-'))
    for (const line of lines) {
      const text = line.replace(/^-\s*\[[ x]\]\s*/, '').trim()
      const assigneeMatch = text.match(/Responsable:\s*(.+)$/i)

      if (text.length > 0) {
        actions.push({
          title: assigneeMatch ? text.replace(assigneeMatch[0], '').trim() : text,
          assignee: assigneeMatch?.[1]?.trim(),
        })
      }
    }
  }

  return actions
}
