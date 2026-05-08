import type { ChatMessage, ToolCall } from "./message.js";

export function toDeepSeekMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages;
}

export function toolResultToMessage(call: ToolCall, content: string): ChatMessage {
  return {
    role: "tool",
    tool_call_id: call.id,
    content,
  };
}
