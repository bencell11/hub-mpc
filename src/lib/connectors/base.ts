import type { ConnectorType } from '@/types/database'

export interface ConnectorConfig {
  [key: string]: unknown
}

export interface ConnectorCredentials {
  [key: string]: string | undefined
}

export interface SyncResult {
  success: boolean
  itemsProcessed: number
  itemsCreated: number
  itemsUpdated: number
  errors: string[]
}

export abstract class BaseConnector {
  protected id: string
  protected workspaceId: string
  protected config: ConnectorConfig
  protected credentials: ConnectorCredentials

  constructor(
    id: string,
    workspaceId: string,
    config: ConnectorConfig,
    credentials: ConnectorCredentials
  ) {
    this.id = id
    this.workspaceId = workspaceId
    this.config = config
    this.credentials = credentials
  }

  abstract get type(): ConnectorType

  // Test connection validity
  abstract testConnection(): Promise<{ success: boolean; error?: string }>

  // Sync data from the external service
  abstract sync(projectId?: string): Promise<SyncResult>

  // Get connector status
  abstract getStatus(): Promise<{
    connected: boolean
    lastSync?: string
    itemCount?: number
    error?: string
  }>

  // Validate configuration
  abstract validateConfig(): { valid: boolean; errors: string[] }

  // Validate credentials
  abstract validateCredentials(): { valid: boolean; errors: string[] }

  // Helper to encrypt credentials before storage
  static encryptCredentials(credentials: ConnectorCredentials): string {
    // In production, use proper encryption (e.g., libsodium)
    // For now, simple base64 encoding (NOT SECURE - replace in production)
    return Buffer.from(JSON.stringify(credentials)).toString('base64')
  }

  // Helper to decrypt credentials from storage
  static decryptCredentials(encrypted: string): ConnectorCredentials {
    // In production, use proper decryption
    return JSON.parse(Buffer.from(encrypted, 'base64').toString('utf-8'))
  }
}

// Connector factory
export type ConnectorFactory = (
  id: string,
  workspaceId: string,
  config: ConnectorConfig,
  credentials: ConnectorCredentials
) => BaseConnector

// Registry for connector types
class ConnectorRegistry {
  private factories: Map<ConnectorType, ConnectorFactory> = new Map()

  register(type: ConnectorType, factory: ConnectorFactory): void {
    this.factories.set(type, factory)
  }

  create(
    type: ConnectorType,
    id: string,
    workspaceId: string,
    config: ConnectorConfig,
    credentials: ConnectorCredentials
  ): BaseConnector | null {
    const factory = this.factories.get(type)
    if (!factory) {
      console.warn(`No connector registered for type: ${type}`)
      return null
    }
    return factory(id, workspaceId, config, credentials)
  }

  getRegisteredTypes(): ConnectorType[] {
    return Array.from(this.factories.keys())
  }
}

export const connectorRegistry = new ConnectorRegistry()
