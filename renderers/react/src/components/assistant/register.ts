import { registerComponent } from '../../registry.js'
import { AssistantThread } from './Thread.js'
import { AssistantComposer } from './Composer.js'
import { AssistantThreadList } from './ThreadList.js'
import { AssistantToolCall } from './ToolCall.js'
import { AssistantRunStatus } from './RunStatus.js'

export type Registry = ReturnType<typeof registerAssistantComponents>

export function registerAssistantComponents() {
  registerComponent('assistant.thread', AssistantThread)
  registerComponent('assistant.composer', AssistantComposer)
  registerComponent('assistant.thread-list', AssistantThreadList)
  registerComponent('assistant.tool-call', AssistantToolCall)
  registerComponent('assistant.run-status', AssistantRunStatus)

  return {
    components: [
      'assistant.thread',
      'assistant.composer',
      'assistant.thread-list',
      'assistant.tool-call',
      'assistant.run-status',
    ] as const,
  }
}
