import type { ChatMessage } from "../messages/message.js";

export type DeepSeekToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ToolDefinition = DeepSeekToolDefinition;

export type DeepSeekUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  [key: string]: unknown;
};

export type DeepSeekChatCompletionResponse = {
  id?: string;
  choices: Array<{
    index: number;
    finish_reason?: string | null;
    message: ChatMessage;
  }>;
  usage?: DeepSeekUsage;
};

export type ChatCompletionResponse = DeepSeekChatCompletionResponse;

export type DeepSeekToolCallDelta = {
  index: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
};

export type DeepSeekStreamDelta = {
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: DeepSeekToolCallDelta[];
  [key: string]: unknown;
};

export type DeepSeekStreamChunk = {
  id?: string;
  choices?: Array<{
    index: number;
    delta?: DeepSeekStreamDelta;
    finish_reason?: string | null;
  }>;
  usage?: DeepSeekUsage;
  [key: string]: unknown;
};

export type ModelStreamEvent =
  | {
      type: "content_delta";
      choiceIndex: number;
      delta: string;
    }
  | {
      type: "reasoning_delta";
      choiceIndex: number;
      delta: string;
    }
  | {
      type: "tool_call_delta";
      choiceIndex: number;
      toolCallIndex: number;
      id?: string;
      callType?: "function";
      nameDelta?: string;
      argumentsDelta?: string;
    }
  | {
      type: "choice_done";
      choiceIndex: number;
      finishReason?: string | null;
      usage?: DeepSeekUsage;
    }
  | {
      type: "done";
      usage?: DeepSeekUsage;
    };
