import { toolRegistry } from '../registry'
import { addNoteTool } from './add-note'
import { createTaskTool } from './create-task'
import { listEmailsTool } from './list-emails'
import { listMeetingsTool } from './list-meetings'
import { getMeetingSummaryTool } from './get-meeting-summary'
import { searchEmailsTool } from './search-emails'
import { semanticSearchTool } from './semantic-search'
import { sendEmailTool } from './send-email'
import { sendMeetingReportTool } from './send-meeting-report'
import { sendTelegramTool } from './send-telegram'

// Register all built-in tools
export function registerBuiltinTools() {
  toolRegistry.register(addNoteTool)
  toolRegistry.register(createTaskTool)
  toolRegistry.register(listEmailsTool)
  toolRegistry.register(listMeetingsTool)
  toolRegistry.register(getMeetingSummaryTool)
  toolRegistry.register(searchEmailsTool)
  toolRegistry.register(semanticSearchTool)
  toolRegistry.register(sendEmailTool)
  toolRegistry.register(sendMeetingReportTool)
  toolRegistry.register(sendTelegramTool)
}

export { addNoteTool } from './add-note'
export { createTaskTool } from './create-task'
export { listEmailsTool } from './list-emails'
export { listMeetingsTool } from './list-meetings'
export { getMeetingSummaryTool } from './get-meeting-summary'
export { searchEmailsTool } from './search-emails'
export { semanticSearchTool } from './semantic-search'
export { sendEmailTool } from './send-email'
export { sendMeetingReportTool } from './send-meeting-report'
export { sendTelegramTool } from './send-telegram'
