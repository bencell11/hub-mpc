import type { PolicyConfig, RiskLevel, ToolContext } from '@/types/tools'
import { createServiceClient } from '@/lib/supabase/server'

export class PolicyEngine {
  private policy: PolicyConfig

  constructor(policy: PolicyConfig) {
    this.policy = policy
  }

  // Check if a tool can be executed
  canExecuteTool(
    toolName: string,
    riskLevel: RiskLevel,
    requiresConfirmation: boolean,
    context: ToolContext
  ): { allowed: boolean; reason?: string; requiresConfirmation?: boolean } {
    // HIGH risk tools always require confirmation
    if (riskLevel === 'HIGH') {
      return {
        allowed: true,
        requiresConfirmation: true,
        reason: 'High-risk operations require confirmation',
      }
    }

    // External communications
    if (
      this.isExternalCommunication(toolName) &&
      this.policy.externalCommunicationRequiresConfirmation
    ) {
      return {
        allowed: true,
        requiresConfirmation: true,
        reason: 'External communications require confirmation',
      }
    }

    // Check if tool is in allowed write operations
    if (this.isWriteOperation(toolName)) {
      const operationType = this.extractOperationType(toolName)
      if (!this.policy.allowedWriteOperations.includes(operationType) &&
          !this.policy.allowedWriteOperations.includes('*')) {
        return {
          allowed: false,
          reason: `Write operation "${operationType}" is not allowed`,
        }
      }
    }

    return {
      allowed: true,
      requiresConfirmation,
    }
  }

  // Check if a file path is allowed
  canAccessPath(path: string): { allowed: boolean; reason?: string } {
    // Check blocked paths first
    for (const blocked of this.policy.blockedFilePaths) {
      if (path.startsWith(blocked)) {
        return {
          allowed: false,
          reason: `Path "${path}" is blocked by policy`,
        }
      }
    }

    // If allowedFilePaths is empty, allow all non-blocked paths
    if (this.policy.allowedFilePaths.length === 0) {
      return { allowed: true }
    }

    // Check if path is in allowed list
    for (const allowed of this.policy.allowedFilePaths) {
      if (path.startsWith(allowed)) {
        return { allowed: true }
      }
    }

    return {
      allowed: false,
      reason: `Path "${path}" is not in the allowed list`,
    }
  }

  // Check if a domain is allowed for web access
  canAccessDomain(domain: string): { allowed: boolean; reason?: string } {
    // Check blocked domains
    if (this.policy.blockedDomains.includes(domain)) {
      return {
        allowed: false,
        reason: `Domain "${domain}" is blocked`,
      }
    }

    // If allowedDomains is empty, allow all non-blocked domains
    if (this.policy.allowedDomains.length === 0) {
      return { allowed: true }
    }

    // Check if domain is in allowed list
    if (this.policy.allowedDomains.includes(domain)) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `Domain "${domain}" is not in the allowed list`,
    }
  }

  // Check quota limits
  async checkQuota(
    workspaceId: string,
    quotaType: 'llmTokens' | 'audioMinutes' | 'storage',
    amount: number
  ): Promise<{ allowed: boolean; remaining?: number; reason?: string }> {
    const supabase = await createServiceClient()

    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    switch (quotaType) {
      case 'llmTokens': {
        // Count tokens used today
        const { count } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('action', 'llm_call')
          .gte('created_at', startOfDay.toISOString())

        const used = count || 0
        const limit = this.policy.quotas.llmTokensPerDay
        const remaining = limit - used

        if (used + amount > limit) {
          return {
            allowed: false,
            remaining,
            reason: `Daily token limit (${limit}) would be exceeded`,
          }
        }
        return { allowed: true, remaining }
      }

      case 'audioMinutes': {
        // Count audio minutes this month
        const { data } = await supabase
          .from('meetings')
          .select('duration_seconds')
          .gte('created_at', startOfMonth.toISOString())

        const usedMinutes = (data || []).reduce(
          (sum, m) => sum + (m.duration_seconds || 0) / 60,
          0
        )
        const limit = this.policy.quotas.audioMinutesPerMonth
        const remaining = limit - usedMinutes

        if (usedMinutes + amount > limit) {
          return {
            allowed: false,
            remaining,
            reason: `Monthly audio limit (${limit} minutes) would be exceeded`,
          }
        }
        return { allowed: true, remaining }
      }

      case 'storage': {
        // Calculate current storage usage
        const { data } = await supabase
          .from('documents')
          .select('size_bytes')

        const usedGb = (data || []).reduce(
          (sum, d) => sum + d.size_bytes,
          0
        ) / (1024 * 1024 * 1024)
        const limit = this.policy.quotas.storageGb
        const remaining = limit - usedGb

        if (usedGb + amount > limit) {
          return {
            allowed: false,
            remaining,
            reason: `Storage limit (${limit}GB) would be exceeded`,
          }
        }
        return { allowed: true, remaining }
      }

      default:
        return { allowed: true }
    }
  }

  // Redact PII if enabled
  redactPII(text: string): string {
    if (!this.policy.redactPII) {
      return text
    }

    // Simple PII patterns - in production, use a proper NLP library
    const patterns = [
      // Email addresses
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
      // Phone numbers (French format)
      { pattern: /\b(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}\b/g, replacement: '[PHONE]' },
      // Social security numbers (French format)
      { pattern: /\b[12]\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{3}\s*\d{3}\s*\d{2}\b/g, replacement: '[SSN]' },
      // Credit card numbers
      { pattern: /\b(?:\d{4}[\s-]?){4}\b/g, replacement: '[CARD]' },
      // IBAN
      { pattern: /\b[A-Z]{2}\d{2}[\s]?(?:\d{4}[\s]?){4,7}\b/g, replacement: '[IBAN]' },
    ]

    let redacted = text
    for (const { pattern, replacement } of patterns) {
      redacted = redacted.replace(pattern, replacement)
    }

    return redacted
  }

  // Helper methods
  private isExternalCommunication(toolName: string): boolean {
    const externalTools = ['send_telegram', 'send_email', 'send_slack', 'post_webhook']
    return externalTools.some(t => toolName.toLowerCase().includes(t))
  }

  private isWriteOperation(toolName: string): boolean {
    const writePatterns = ['create', 'add', 'update', 'delete', 'send', 'export', 'write']
    return writePatterns.some(p => toolName.toLowerCase().includes(p))
  }

  private extractOperationType(toolName: string): string {
    // Extract the resource type from tool name
    // e.g., "add_note" -> "note", "create_task" -> "task"
    const parts = toolName.toLowerCase().split('_')
    return parts.length > 1 ? parts[parts.length - 1] : toolName
  }
}

// Factory function to get policy for a workspace
export async function getPolicyForWorkspace(workspaceId: string): Promise<PolicyEngine> {
  const supabase = await createServiceClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single()

  const settings = workspace?.settings as { policy?: PolicyConfig } | null
  const policy = settings?.policy || getDefaultPolicy()

  return new PolicyEngine(policy)
}

// Default policy
function getDefaultPolicy(): PolicyConfig {
  return {
    allowedReadSources: ['*'],
    allowedWriteOperations: ['note', 'task', 'decision'],
    externalCommunicationRequiresConfirmation: true,
    allowedFilePaths: [],
    blockedFilePaths: ['/etc', '/var', '/usr', '/bin', '/sbin'],
    allowedDomains: [],
    blockedDomains: [],
    quotas: {
      llmTokensPerDay: 100000,
      audioMinutesPerMonth: 600,
      storageGb: 10,
    },
    redactPII: false,
  }
}
