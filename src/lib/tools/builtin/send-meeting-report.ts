import type { ToolDefinition, ToolResult, ToolContext } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import nodemailer from 'nodemailer'

const SendMeetingReportInputSchema = z.object({
  meetingId: z.string().uuid().describe('ID of the meeting'),
  recipients: z.array(z.string().email()).min(1).describe('Email addresses of recipients'),
  includeDecisions: z.boolean().optional().describe('Include decisions in the report (default: true)'),
  includeTasks: z.boolean().optional().describe('Include tasks in the report (default: true)'),
  customMessage: z.string().optional().describe('Custom message to add at the beginning of the email'),
})

const SendMeetingReportOutputSchema = z.object({
  messageId: z.string(),
  recipientCount: z.number(),
  meetingTitle: z.string(),
  sentAt: z.string(),
})

type SendMeetingReportInput = z.infer<typeof SendMeetingReportInputSchema>
type SendMeetingReportOutput = z.infer<typeof SendMeetingReportOutputSchema>

export const sendMeetingReportTool: ToolDefinition<SendMeetingReportInput, SendMeetingReportOutput> = {
  name: 'send_meeting_report',
  description: 'Envoie le compte rendu d\'une réunion par email aux destinataires spécifiés. Inclut le résumé, les décisions et les actions à suivre.',
  inputSchema: SendMeetingReportInputSchema,
  outputSchema: SendMeetingReportOutputSchema,
  riskLevel: 'HIGH',
  requiresConfirmation: true,
  scopes: ['workspace', 'project'],

  async execute(input: SendMeetingReportInput, context: ToolContext): Promise<ToolResult<SendMeetingReportOutput>> {
    const supabase = await createServiceClient()

    // Get meeting with summary
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        id,
        title,
        scheduled_at,
        project_id,
        projects!inner(workspace_id, name)
      `)
      .eq('id', input.meetingId)
      .eq('projects.workspace_id', context.workspaceId)
      .single()

    if (meetingError || !meeting) {
      return {
        success: false,
        error: 'Meeting not found or access denied',
      }
    }

    // Get summary
    const { data: summary } = await supabase
      .from('summaries')
      .select('content')
      .eq('source_type', 'meeting')
      .eq('source_id', input.meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!summary) {
      return {
        success: false,
        error: 'No summary found for this meeting. Please generate a summary first.',
      }
    }

    // Get decisions if requested
    let decisions: Array<{ content: string }> = []
    if (input.includeDecisions !== false) {
      const { data } = await supabase
        .from('decisions')
        .select('content')
        .eq('meeting_id', input.meetingId)
      decisions = data || []
    }

    // Get tasks if requested
    let tasks: Array<{ title: string; metadata: { assignee?: string } | null }> = []
    if (input.includeTasks !== false) {
      const { data } = await supabase
        .from('tasks')
        .select('title, metadata')
        .eq('source_type', 'meeting')
        .eq('source_id', input.meetingId)
      tasks = data || []
    }

    // Get email connector
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
        error: 'No active email connector found. Please configure an email connector first.',
      }
    }

    // Parse credentials from config._credentials (where they are stored)
    let credentials: {
      email: string
      password: string
      imapHost: string
      smtpHost?: string
      smtpPort?: number
    }

    try {
      // Credentials are stored in config._credentials
      const config = connector.config as { _credentials?: typeof credentials }
      if (!config?._credentials) {
        return {
          success: false,
          error: 'No email credentials found. Please reconfigure the email connector.',
        }
      }
      credentials = config._credentials
    } catch {
      return {
        success: false,
        error: 'Invalid email connector credentials',
      }
    }

    // Build HTML email
    const meetingDate = meeting.scheduled_at
      ? new Date(meeting.scheduled_at).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Date non spécifiée'

    // Handle the projects relation which could be an object or array
    const projectData = meeting.projects as unknown
    let projectName = 'Projet'
    if (projectData && typeof projectData === 'object') {
      if (Array.isArray(projectData) && projectData.length > 0) {
        projectName = (projectData[0] as { name?: string })?.name || 'Projet'
      } else {
        projectName = (projectData as { name?: string })?.name || 'Projet'
      }
    }

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .meta { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .meta p { margin: 5px 0; }
    .summary { background: #fff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; }
    .decisions { background: #fef3c7; padding: 15px; border-radius: 8px; }
    .tasks { background: #dcfce7; padding: 15px; border-radius: 8px; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.9em; }
    .custom-message { background: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-style: italic; }
  </style>
</head>
<body>
  <h1>📋 Compte Rendu de Réunion</h1>

  <div class="meta">
    <p><strong>Réunion:</strong> ${meeting.title || '(Sans titre)'}</p>
    <p><strong>Projet:</strong> ${projectName}</p>
    <p><strong>Date:</strong> ${meetingDate}</p>
  </div>
`

    if (input.customMessage) {
      htmlContent += `
  <div class="custom-message">
    ${input.customMessage}
  </div>
`
    }

    // Convert markdown summary to HTML (basic conversion)
    const summaryHtml = convertMarkdownToHtml(summary.content)
    htmlContent += `
  <div class="summary">
    ${summaryHtml}
  </div>
`

    if (decisions.length > 0 && input.includeDecisions !== false) {
      htmlContent += `
  <div class="decisions">
    <h2>⚖️ Décisions prises</h2>
    <ul>
      ${decisions.map(d => `<li>${d.content}</li>`).join('\n      ')}
    </ul>
  </div>
`
    }

    if (tasks.length > 0 && input.includeTasks !== false) {
      htmlContent += `
  <div class="tasks">
    <h2>✅ Actions à suivre</h2>
    <ul>
      ${tasks.map(t => {
        const assignee = (t.metadata as { assignee?: string } | null)?.assignee
        return `<li>${t.title}${assignee ? ` - <strong>${assignee}</strong>` : ''}</li>`
      }).join('\n      ')}
    </ul>
  </div>
`
    }

    htmlContent += `
  <div class="footer">
    <p>Ce compte rendu a été généré automatiquement par Hub MCP.</p>
  </div>
</body>
</html>
`

    // Determine SMTP settings
    const smtpHost = credentials.smtpHost || inferSmtpHost(credentials.imapHost)
    const smtpPort = credentials.smtpPort || 587

    console.log('SMTP Configuration:', {
      smtpHost,
      smtpPort,
      fromEmail: credentials.email,
      imapHost: credentials.imapHost,
      hasPassword: !!credentials.password,
      passwordLength: credentials.password?.length || 0,
    })

    if (!smtpHost) {
      return {
        success: false,
        error: 'Could not determine SMTP server',
      }
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: credentials.email,
          pass: credentials.password,
        },
        debug: true,
        logger: true,
      })

      // Verify connection first
      console.log('Verifying SMTP connection...')
      await transporter.verify()
      console.log('SMTP connection verified successfully')

      console.log('Sending email to:', input.recipients.join(', '))
      const info = await transporter.sendMail({
        from: credentials.email,
        to: input.recipients.join(', '),
        subject: `📋 Compte rendu: ${meeting.title || 'Réunion'} - ${projectName}`,
        html: htmlContent,
        text: stripHtml(htmlContent),
      })
      console.log('Email sent successfully:', info)

      const sentAt = new Date().toISOString()

      // Log audit
      await supabase.from('audit_logs').insert({
        workspace_id: context.workspaceId,
        user_id: context.userId,
        action: 'send_meeting_report',
        resource_type: 'meeting',
        resource_id: input.meetingId,
        details: {
          recipients: input.recipients,
          messageId: info.messageId,
        },
      })

      // Add timeline event
      await supabase.from('timeline_events').insert({
        project_id: meeting.project_id,
        event_type: 'report_sent',
        title: 'Compte rendu envoyé',
        description: `Envoyé à ${input.recipients.length} destinataire(s)`,
        event_date: sentAt,
        source_type: 'meeting',
        source_id: input.meetingId,
        metadata: {
          recipients: input.recipients,
          messageId: info.messageId,
        },
      })

      return {
        success: true,
        data: {
          messageId: info.messageId || `${Date.now()}`,
          recipientCount: input.recipients.length,
          meetingTitle: meeting.title || '(Sans titre)',
          sentAt,
        },
      }
    } catch (error) {
      console.error('Send meeting report error:', error)
      return {
        success: false,
        error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
}

// Basic markdown to HTML conversion
function convertMarkdownToHtml(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Checkboxes
    .replace(/- \[ \] (.+)/g, '<li>☐ $1</li>')
    .replace(/- \[x\] (.+)/gi, '<li>☑ $1</li>')
    // List items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive li in ul
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Wrap in paragraph
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<h') || match.startsWith('<ul') || match.startsWith('<li')) {
        return match
      }
      return `<p>${match}</p>`
    })
}

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

  if (imapHost.startsWith('imap.')) {
    return imapHost.replace('imap.', 'smtp.')
  }

  return null
}

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
