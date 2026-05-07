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

export type ChatCompletionResponse = {
  id?: string;
  choices: Array<{
    index: number;
    finish_reason?: string | null;
    message: ChatMessage;
  }>;
  usage?: unknown;
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};
