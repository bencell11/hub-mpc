// Export base connector infrastructure
export { BaseConnector, connectorRegistry } from './base'
export type { ConnectorConfig, ConnectorCredentials, SyncResult } from './base'

// Import all connectors to register them
import './email'
import './telegram'

// Re-export specific connectors
export { EmailConnector } from './email'
export { TelegramConnector } from './telegram'
