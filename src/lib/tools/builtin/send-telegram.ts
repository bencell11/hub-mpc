import type { ToolDefinition, ToolResult, ToolContext } from '@/types/tools'
import { SendTelegramInputSchema } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

type SendTelegramInput = z.infer<typeof SendTelegramInputSchema>

const SendTelegramOutputSchema = z.object({
  messageId: z.string(),
  channel: z.string(),
  sentAt: z.string(),
})

type SendTelegramOutput = z.infer<typeof SendTelegramOutputSchema>

export const sendTelegramTool: ToolDefinition<SendTelegramInput, SendTelegramOutput> = {
  name: 'send_telegram',
  description: 'Envoie un message via Telegram. ATTENTION: Cette action envoie un message réel et nécessite une confirmation préalable.',
  inputSchema: SendTelegramInputSchema,
  outputSchema: SendTelegramOutputSchema,
  riskLevel: 'HIGH',
  requiresConfirmation: true,
  scopes: ['workspace'],

  async execute(input: SendTelegramInput, context: ToolContext): Promise<ToolResult<SendTelegramOutput>> {
    const supabase = await createServiceClient()

    // Get Telegram connector for workspace
    const { data: connector, error: connectorError } = await supabase
      .from('connectors')
      .select('*')
      .eq('workspace_id', context.workspaceId)
      .eq('type', 'TELEGRAM')
      .eq('status', 'active')
      .single()

    if (connectorError || !connector) {
      return {
        success: false,
        error: 'No active Telegram connector found for this workspace',
      }
    }

    // Decrypt credentials and get bot token
    const credentials = connector.credentials_encrypted
    if (!credentials) {
      return {
        success: false,
        error: 'Telegram connector credentials not configured',
      }
    }

    // In production, decrypt the credentials
    // For now, we'll assume it's stored as JSON
    let botToken: string
    try {
      const creds = JSON.parse(credentials) as { botToken: string }
      botToken = creds.botToken
    } catch {
      return {
        success: false,
        error: 'Invalid Telegram credentials format',
      }
    }

    // Send message via Telegram API
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: input.channel,
            text: input.message,
            parse_mode: 'Markdown',
          }),
        }
      )

      const result = await response.json() as {
        ok: boolean
        result?: { message_id: number }
        description?: string
      }

      if (!result.ok) {
        return {
          success: false,
          error: `Telegram API error: ${result.description || 'Unknown error'}`,
        }
      }

      const sentAt = new Date().toISOString()
      const messageId = String(result.result?.message_id || Date.now())

      // Log audit
      await supabase.from('audit_logs').insert({
        workspace_id: context.workspaceId,
        user_id: context.userId,
        action: 'send_telegram',
        resource_type: 'connector',
        resource_id: connector.id,
        details: {
          channel: input.channel,
          messageLength: input.message.length,
          messageId,
        },
      })

      // Add to timeline if project context
      if (context.projectId) {
        await supabase.from('timeline_events').insert({
          project_id: context.projectId,
          event_type: 'telegram_sent',
          title: 'Message Telegram envoyé',
          description: input.message.substring(0, 200),
          event_date: sentAt,
          metadata: { channel: input.channel, messageId },
        })
      }

      return {
        success: true,
        data: {
          messageId,
          channel: input.channel,
          sentAt,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to send Telegram message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
}
