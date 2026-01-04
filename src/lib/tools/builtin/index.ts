import { toolRegistry } from '../registry'
import { addNoteTool } from './add-note'
import { createTaskTool } from './create-task'
import { searchEmailsTool } from './search-emails'
import { semanticSearchTool } from './semantic-search'
import { sendTelegramTool } from './send-telegram'

// Register all built-in tools
export function registerBuiltinTools() {
  toolRegistry.register(addNoteTool)
  toolRegistry.register(createTaskTool)
  toolRegistry.register(searchEmailsTool)
  toolRegistry.register(semanticSearchTool)
  toolRegistry.register(sendTelegramTool)
}

export { addNoteTool } from './add-note'
export { createTaskTool } from './create-task'
export { searchEmailsTool } from './search-emails'
export { semanticSearchTool } from './semantic-search'
export { sendTelegramTool } from './send-telegram'
