export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type ChatMessage = {
  role: ChatRole;
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  reasoning_content?: string;
  [key: string]: unknown;
};

export type StoredMessage = ChatMessage & {
  createdAt: string;
};

export function messageText(message: ChatMessage): string {
  if (typeof message.content === "string") return message.content;
  if (message.content == null) return "";
  return JSON.stringify(message.content);
}
