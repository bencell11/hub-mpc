import type { ToolDefinition, ToolResult, ToolContext } from '@/types/tools'
import { SendEmailInputSchema } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import nodemailer from 'nodemailer'

type SendEmailInput = z.infer<typeof SendEmailInputSchema>

const SendEmailOutputSchema = z.object({
  messageId: z.string(),
  to: z.string(),
  subject: z.string(),
  sentAt: z.string(),
})

type SendEmailOutput = z.infer<typeof SendEmailOutputSchema>

export const sendEmailTool: ToolDefinition<SendEmailInput, SendEmailOutput> = {
  name: 'send_email',
  description: 'Envoie un email. Utile pour envoyer des comptes rendus de réunion ou des rapports. ATTENTION: Cette action envoie un email réel et nécessite une confirmation préalable.',
  inputSchema: SendEmailInputSchema,
  outputSchema: SendEmailOutputSchema,
  riskLevel: 'HIGH',
  requiresConfirmation: true,
  scopes: ['workspace'],

  async execute(input: SendEmailInput, context: ToolContext): Promise<ToolResult<SendEmailOutput>> {
    const supabase = await createServiceClient()

    // Get email connector for workspace (IMAP connector also has SMTP settings)
    const { data: connector, error: connectorError } = await supabase
      .from('connectors')
      .select('*')
      .eq('workspace_id', context.workspaceId)
      .eq('type', 'EMAIL')
      .eq('status', 'active')
      .single()

    if (connectorError || !connector) {
      return {
        success: false,
        error: 'No active email connector found for this workspace. Please configure an email connector first.',
      }
    }

    // Parse credentials
    let credentials: {
      email: string
      password: string
      imapHost: string
      smtpHost?: string
      smtpPort?: number
    }

    try {
      credentials = JSON.parse(connector.credentials_encrypted) as typeof credentials
    } catch {
      return {
        success: false,
        error: 'Invalid email connector credentials format',
      }
    }

    // Determine SMTP settings
    const smtpHost = credentials.smtpHost || inferSmtpHost(credentials.imapHost)
    const smtpPort = credentials.smtpPort || 587

    if (!smtpHost) {
      return {
        success: false,
        error: 'Could not determine SMTP server. Please configure SMTP settings in your email connector.',
      }
    }

    try {
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: credentials.email,
          pass: credentials.password,
        },
      })

      // Send email
      const info = await transporter.sendMail({
        from: credentials.email,
        to: input.to,
        replyTo: input.replyTo || credentials.email,
        subject: input.subject,
        html: input.body,
        text: stripHtml(input.body),
      })

      const sentAt = new Date().toISOString()

      // Log audit
      await supabase.from('audit_logs').insert({
        workspace_id: context.workspaceId,
        user_id: context.userId,
        action: 'send_email',
        resource_type: 'connector',
        resource_id: connector.id,
        details: {
          to: input.to,
          subject: input.subject,
          messageId: info.messageId,
        },
      })

      // Add to timeline if project context
      if (context.projectId) {
        await supabase.from('timeline_events').insert({
          project_id: context.projectId,
          event_type: 'email_sent',
          title: 'Email envoyé',
          description: `À: ${input.to} - Sujet: ${input.subject}`,
          event_date: sentAt,
          metadata: {
            to: input.to,
            subject: input.subject,
            messageId: info.messageId,
          },
        })
      }

      return {
        success: true,
        data: {
          messageId: info.messageId || `${Date.now()}`,
          to: input.to,
          subject: input.subject,
          sentAt,
        },
      }
    } catch (error) {
      console.error('Send email error:', error)
      return {
        success: false,
        error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
}

// Infer SMTP host from IMAP host
function inferSmtpHost(imapHost: string): string | null {
  const mappings: Record<string, string> = {
    'imap.gmail.com': 'smtp.gmail.com',
    'imap.mail.yahoo.com': 'smtp.mail.yahoo.com',
    'outlook.office365.com': 'smtp.office365.com',
    'imap-mail.outlook.com': 'smtp-mail.outlook.com',
    'imap.free.fr': 'smtp.free.fr',
    'imap.orange.fr': 'smtp.orange.fr',
    'imap.sfr.fr': 'smtp.sfr.fr',
  }

  if (mappings[imapHost]) {
    return mappings[imapHost]
  }

  // Try to infer by replacing imap with smtp
  if (imapHost.startsWith('imap.')) {
    return imapHost.replace('imap.', 'smtp.')
  }

  return null
}

// Simple HTML to text conversion
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}
