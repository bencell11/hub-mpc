import { BaseConnector, type ConnectorConfig, type ConnectorCredentials, type SyncResult, connectorRegistry } from './base'
import type { ConnectorType } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/server'

interface EmailConfig extends ConnectorConfig {
  provider: 'gmail' | 'imap'
  imapHost?: string
  imapPort?: number
  folders?: string[]
  syncDays?: number
}

interface EmailCredentials extends ConnectorCredentials {
  // For Gmail OAuth
  accessToken?: string
  refreshToken?: string
  // For IMAP
  username?: string
  password?: string
}

interface ParsedEmail {
  id: string
  from: { address: string; name?: string }
  to: Array<{ address: string; name?: string }>
  cc?: Array<{ address: string; name?: string }>
  subject: string
  bodyText?: string
  bodyHtml?: string
  date: Date
  attachments?: Array<{
    filename: string
    contentType: string
    size: number
  }>
}

export class EmailConnector extends BaseConnector {
  get type(): ConnectorType {
    return 'EMAIL'
  }

  get emailConfig(): EmailConfig {
    return this.config as EmailConfig
  }

  get emailCredentials(): EmailCredentials {
    return this.credentials as EmailCredentials
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.emailConfig.provider === 'gmail') {
        return this.testGmailConnection()
      } else {
        return this.testImapConnection()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async testGmailConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.emailCredentials.accessToken) {
      return { success: false, error: 'No access token provided' }
    }

    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          Authorization: `Bearer ${this.emailCredentials.accessToken}`,
        },
      })

      if (!response.ok) {
        return { success: false, error: 'Gmail authentication failed' }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gmail connection failed',
      }
    }
  }

  private async testImapConnection(): Promise<{ success: boolean; error?: string }> {
    // IMAP connection would require a server-side implementation
    // For now, we'll validate the configuration
    if (!this.emailConfig.imapHost || !this.emailConfig.imapPort) {
      return { success: false, error: 'IMAP host and port required' }
    }
    if (!this.emailCredentials.username || !this.emailCredentials.password) {
      return { success: false, error: 'IMAP credentials required' }
    }

    // In production, implement actual IMAP connection test
    return { success: true }
  }

  async sync(projectId?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: [],
    }

    if (!projectId) {
      result.errors.push('Project ID required for email sync')
      return result
    }

    try {
      const emails = await this.fetchEmails()
      result.itemsProcessed = emails.length

      const supabase = await createServiceClient()

      for (const email of emails) {
        try {
          // Check if email already exists
          const { data: existing } = await supabase
            .from('emails')
            .select('id')
            .eq('connector_id', this.id)
            .eq('external_id', email.id)
            .single()

          if (existing) {
            // Update existing email
            await supabase
              .from('emails')
              .update({
                subject: email.subject,
                body_text: email.bodyText,
                body_html: email.bodyHtml,
                attachments: email.attachments,
              })
              .eq('id', existing.id)

            result.itemsUpdated++
          } else {
            // Insert new email
            await supabase.from('emails').insert({
              project_id: projectId,
              connector_id: this.id,
              external_id: email.id,
              from_address: email.from.address,
              from_name: email.from.name,
              to_addresses: email.to.map(t => t.address),
              cc_addresses: email.cc?.map(c => c.address) || [],
              subject: email.subject,
              body_text: email.bodyText,
              body_html: email.bodyHtml,
              received_at: email.date.toISOString(),
              attachments: email.attachments,
            })

            result.itemsCreated++
          }
        } catch (error) {
          result.errors.push(`Failed to process email ${email.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Update connector last sync time
      await supabase
        .from('connectors')
        .update({
          last_sync_at: new Date().toISOString(),
          status: 'active',
          error_message: null,
        })
        .eq('id', this.id)

      result.success = result.errors.length === 0
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Sync failed')
    }

    return result
  }

  private async fetchEmails(): Promise<ParsedEmail[]> {
    if (this.emailConfig.provider === 'gmail') {
      return this.fetchGmailEmails()
    } else {
      return this.fetchImapEmails()
    }
  }

  private async fetchGmailEmails(): Promise<ParsedEmail[]> {
    const emails: ParsedEmail[] = []
    const accessToken = this.emailCredentials.accessToken

    if (!accessToken) {
      throw new Error('No access token for Gmail')
    }

    // Calculate date range
    const syncDays = this.emailConfig.syncDays || 30
    const afterDate = new Date()
    afterDate.setDate(afterDate.getDate() - syncDays)
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000)

    // List messages
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${afterTimestamp}&maxResults=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!listResponse.ok) {
      throw new Error('Failed to list Gmail messages')
    }

    const listData = await listResponse.json() as { messages?: Array<{ id: string }> }
    const messageIds = listData.messages || []

    // Fetch each message
    for (const { id } of messageIds.slice(0, 50)) { // Limit to 50 for now
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!msgResponse.ok) continue

      const msgData = await msgResponse.json() as {
        id: string
        payload: {
          headers: Array<{ name: string; value: string }>
          parts?: Array<{ mimeType: string; body?: { data?: string } }>
          body?: { data?: string }
        }
        internalDate: string
      }

      const headers = msgData.payload.headers
      const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value

      const fromHeader = getHeader('From') || ''
      const fromMatch = fromHeader.match(/(?:"?([^"]*)"?\s)?<?([^>]+)>?/)

      emails.push({
        id: msgData.id,
        from: {
          address: fromMatch?.[2] || fromHeader,
          name: fromMatch?.[1],
        },
        to: (getHeader('To') || '').split(',').map(addr => {
          const match = addr.trim().match(/(?:"?([^"]*)"?\s)?<?([^>]+)>?/)
          return { address: match?.[2] || addr.trim(), name: match?.[1] }
        }),
        subject: getHeader('Subject') || '(No subject)',
        bodyText: this.extractGmailBody(msgData.payload),
        date: new Date(parseInt(msgData.internalDate)),
      })
    }

    return emails
  }

  private extractGmailBody(payload: { parts?: Array<{ mimeType: string; body?: { data?: string } }>; body?: { data?: string } }): string {
    // Look for text/plain part
    if (payload.parts) {
      const textPart = payload.parts.find(p => p.mimeType === 'text/plain')
      if (textPart?.body?.data) {
        return Buffer.from(textPart.body.data, 'base64').toString('utf-8')
      }
    }

    // Fall back to body
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }

    return ''
  }

  private async fetchImapEmails(): Promise<ParsedEmail[]> {
    // IMAP implementation would require node-imap or similar
    // This is a placeholder for the actual implementation
    console.log('IMAP sync not yet implemented')
    return []
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

    const { count } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('connector_id', this.id)

    return {
      connected: connector.status === 'active',
      lastSync: connector.last_sync_at || undefined,
      itemCount: count || 0,
      error: connector.error_message || undefined,
    }
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.emailConfig.provider) {
      errors.push('Provider is required (gmail or imap)')
    }

    if (this.emailConfig.provider === 'imap') {
      if (!this.emailConfig.imapHost) errors.push('IMAP host is required')
      if (!this.emailConfig.imapPort) errors.push('IMAP port is required')
    }

    return { valid: errors.length === 0, errors }
  }

  validateCredentials(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (this.emailConfig.provider === 'gmail') {
      if (!this.emailCredentials.accessToken) {
        errors.push('Gmail access token is required')
      }
    } else {
      if (!this.emailCredentials.username) errors.push('IMAP username is required')
      if (!this.emailCredentials.password) errors.push('IMAP password is required')
    }

    return { valid: errors.length === 0, errors }
  }
}

// Register the connector
connectorRegistry.register('EMAIL', (id, workspaceId, config, credentials) =>
  new EmailConnector(id, workspaceId, config, credentials)
)
