import { BaseConnector, type ConnectorConfig, type ConnectorCredentials, type SyncResult, connectorRegistry } from './base'
import type { ConnectorType } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/server'

interface TelegramConfig extends ConnectorConfig {
  // Default channel/chat for notifications
  defaultChannel?: string
  // Allowed channels for sending messages
  allowedChannels?: string[]
}

interface TelegramCredentials extends ConnectorCredentials {
  botToken: string
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; first_name: string; last_name?: string; username?: string }
    chat: { id: number; type: string; title?: string }
    date: number
    text?: string
  }
}

export class TelegramConnector extends BaseConnector {
  get type(): ConnectorType {
    return 'TELEGRAM'
  }

  get telegramConfig(): TelegramConfig {
    return this.config as TelegramConfig
  }

  get telegramCredentials(): TelegramCredentials {
    return this.credentials as TelegramCredentials
  }

  private get apiBase(): string {
    return `https://api.telegram.org/bot${this.telegramCredentials.botToken}`
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiBase}/getMe`)
      const data = await response.json() as { ok: boolean; result?: { username: string }; description?: string }

      if (!data.ok) {
        return { success: false, error: data.description || 'Bot verification failed' }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }

  async sync(): Promise<SyncResult> {
    // Telegram connector doesn't sync in the traditional sense
    // It's primarily used for sending messages
    // However, we can fetch recent updates if needed

    const result: SyncResult = {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: [],
    }

    try {
      // Update connector status
      const supabase = await createServiceClient()
      await supabase
        .from('connectors')
        .update({
          last_sync_at: new Date().toISOString(),
          status: 'active',
          error_message: null,
        })
        .eq('id', this.id)

      result.success = true
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Status update failed')
      result.success = false
    }

    return result
  }

  async sendMessage(chatId: string, text: string, options?: {
    parseMode?: 'Markdown' | 'HTML'
    disableNotification?: boolean
    replyToMessageId?: number
  }): Promise<{ success: boolean; messageId?: number; error?: string }> {
    // Check if channel is allowed
    if (this.telegramConfig.allowedChannels &&
        this.telegramConfig.allowedChannels.length > 0 &&
        !this.telegramConfig.allowedChannels.includes(chatId)) {
      return { success: false, error: 'Channel not in allowed list' }
    }

    try {
      const response = await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parseMode || 'Markdown',
          disable_notification: options?.disableNotification,
          reply_to_message_id: options?.replyToMessageId,
        }),
      })

      const data = await response.json() as {
        ok: boolean
        result?: { message_id: number }
        description?: string
      }

      if (!data.ok) {
        return { success: false, error: data.description || 'Send failed' }
      }

      return { success: true, messageId: data.result?.message_id }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Send failed',
      }
    }
  }

  async getUpdates(offset?: number): Promise<TelegramUpdate[]> {
    try {
      const url = new URL(`${this.apiBase}/getUpdates`)
      if (offset) url.searchParams.set('offset', String(offset))
      url.searchParams.set('limit', '100')

      const response = await fetch(url.toString())
      const data = await response.json() as { ok: boolean; result?: TelegramUpdate[] }

      if (!data.ok) {
        return []
      }

      return data.result || []
    } catch {
      return []
    }
  }

  async getChat(chatId: string): Promise<{
    id: number
    type: string
    title?: string
    username?: string
  } | null> {
    try {
      const response = await fetch(`${this.apiBase}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId }),
      })

      const data = await response.json() as {
        ok: boolean
        result?: { id: number; type: string; title?: string; username?: string }
      }

      if (!data.ok) {
        return null
      }

      return data.result || null
    } catch {
      return null
    }
  }

  async getStatus(): Promise<{
    connected: boolean
    lastSync?: string
    itemCount?: number
    error?: string
  }> {
    const supabase = await createServiceClient()

    const { data: connector } = await supabase
      .from('connectors')
      .select('status, last_sync_at, error_message')
      .eq('id', this.id)
      .single()

    if (!connector) {
      return { connected: false, error: 'Connector not found' }
    }

    // Test the connection
    const testResult = await this.testConnection()

    return {
      connected: testResult.success && connector.status === 'active',
      lastSync: connector.last_sync_at || undefined,
      error: testResult.error || connector.error_message || undefined,
    }
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    // Config is optional for Telegram
    return { valid: errors.length === 0, errors }
  }

  validateCredentials(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.telegramCredentials.botToken) {
      errors.push('Bot token is required')
    } else if (!this.telegramCredentials.botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      errors.push('Bot token format is invalid')
    }

    return { valid: errors.length === 0, errors }
  }
}

// Register the connector
connectorRegistry.register('TELEGRAM', (id, workspaceId, config, credentials) =>
  new TelegramConnector(id, workspaceId, config, credentials)
)
