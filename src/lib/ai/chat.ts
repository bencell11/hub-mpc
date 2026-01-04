import OpenAI from 'openai'
import { toolRegistry } from '@/lib/tools/registry'
import type { Citation, ToolContext } from '@/types/tools'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  citations?: Citation[]
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
    result?: unknown
  }>
}

export interface ChatOptions {
  projectContext?: {
    id: string
    name: string
    description?: string
  }
  systemPrompt?: string
}

const DEFAULT_SYSTEM_PROMPT = `Tu es un assistant intelligent intégré dans un hub de gestion de projet.
Tu as accès à des outils pour rechercher dans les documents, emails, réunions et notes du projet.
Tu dois TOUJOURS fournir des réponses sourcées avec des citations précises.

Règles importantes:
1. Cite TOUJOURS tes sources avec le format [Source: type, titre]
2. Indique le niveau de confiance de tes réponses
3. Si tu ne trouves pas l'information, dis-le clairement
4. Propose des actions concrètes quand c'est pertinent
5. Respecte la confidentialité des données`

export async function chat(
  messages: ChatMessage[],
  context: ToolContext,
  options: ChatOptions = {}
): Promise<ChatMessage> {
  const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT

  // Add project context if available
  let contextualPrompt = systemPrompt
  if (options.projectContext) {
    contextualPrompt += `\n\nContexte du projet actuel:
- Nom: ${options.projectContext.name}
- ID: ${options.projectContext.id}
${options.projectContext.description ? `- Description: ${options.projectContext.description}` : ''}`
  }

  // Convert messages to OpenAI format
  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: contextualPrompt },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
  ]

  // Get available tools
  const tools = toolRegistry.toOpenAIFunctions()

  // Initial completion
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: openaiMessages,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? 'auto' : undefined,
    temperature: 0.7,
    max_tokens: 2000,
  })

  const choice = response.choices[0]
  const message = choice.message

  // Handle tool calls if present
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolResults: Array<{
      name: string
      arguments: Record<string, unknown>
      result: unknown
    }> = []

    const allCitations: Citation[] = []

    for (const toolCall of message.tool_calls) {
      // Handle both standard and custom tool call types
      const tc = toolCall as { id: string; function?: { name: string; arguments: string }; type?: string }
      if (!tc.function) continue
      const toolName = tc.function.name
      const toolArgs = JSON.parse(tc.function.arguments) as Record<string, unknown>

      // Execute the tool
      const { toolExecutor } = await import('@/lib/tools/registry')
      const result = await toolExecutor.execute(toolName, toolArgs, context)

      toolResults.push({
        name: toolName,
        arguments: toolArgs,
        result: result.data,
      })

      if (result.citations) {
        allCitations.push(...result.citations)
      }
    }

    // Continue conversation with tool results
    const toolResultMessages: OpenAI.ChatCompletionMessageParam[] = [
      ...openaiMessages,
      message as OpenAI.ChatCompletionMessageParam,
      ...message.tool_calls.map((tc, i) => {
        const toolCall = tc as { id: string; function?: { name: string; arguments: string } }
        return {
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResults[i]?.result || {}),
        }
      }),
    ]

    const followUp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: toolResultMessages,
      temperature: 0.7,
      max_tokens: 2000,
    })

    const finalContent = followUp.choices[0].message.content || ''

    return {
      role: 'assistant',
      content: finalContent,
      citations: allCitations,
      toolCalls: toolResults,
    }
  }

  return {
    role: 'assistant',
    content: message.content || '',
    citations: [],
  }
}

// Stream chat response
export async function* streamChat(
  messages: ChatMessage[],
  context: ToolContext,
  options: ChatOptions = {}
): AsyncGenerator<{ type: 'content' | 'citation' | 'done'; data: string | Citation }> {
  const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT

  let contextualPrompt = systemPrompt
  if (options.projectContext) {
    contextualPrompt += `\n\nContexte du projet actuel:
- Nom: ${options.projectContext.name}
- ID: ${options.projectContext.id}
${options.projectContext.description ? `- Description: ${options.projectContext.description}` : ''}`
  }

  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: contextualPrompt },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
  ]

  const tools = toolRegistry.toOpenAIFunctions()

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: openaiMessages,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? 'auto' : undefined,
    temperature: 0.7,
    max_tokens: 2000,
    stream: true,
  })

  let toolCalls: Array<{
    id: string
    name: string
    arguments: string
  }> = []

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta

    if (delta?.content) {
      yield { type: 'content', data: delta.content }
    }

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        if (tc.index !== undefined) {
          if (!toolCalls[tc.index]) {
            toolCalls[tc.index] = { id: tc.id || '', name: tc.function?.name || '', arguments: '' }
          }
          if (tc.function?.arguments) {
            toolCalls[tc.index].arguments += tc.function.arguments
          }
        }
      }
    }
  }

  // Execute tool calls if any
  if (toolCalls.length > 0) {
    const { toolExecutor } = await import('@/lib/tools/registry')

    for (const tc of toolCalls) {
      try {
        const args = JSON.parse(tc.arguments) as Record<string, unknown>
        const result = await toolExecutor.execute(tc.name, args, context)

        if (result.citations) {
          for (const citation of result.citations) {
            yield { type: 'citation', data: citation }
          }
        }
      } catch (error) {
        console.error('Tool execution error:', error)
      }
    }
  }

  yield { type: 'done', data: '' }
}
