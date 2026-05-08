import type { ToolCall } from "../messages/message.js";
import type { ShellResult } from "../terminal/stream.js";

export type AgentResult = {
  runId: string;
  finalText: string;
  steps: number;
  stoppedReason: "final" | "max_steps" | "error";
};

export type AgentEvent =
  | {
      type: "user_message";
      runId: string;
      input: string;
    }
  | {
      type: "llm_delta";
      runId: string;
      delta: string;
    }
  | {
      type: "llm_reasoning_delta";
      runId: string;
      delta: string;
    }
  | {
      type: "assistant_message";
      runId: string;
      content: string;
      toolCalls?: ToolCall[];
    }
  | {
      type: "tool_call_start";
      runId: string;
      toolCallId: string;
      name: string;
      arguments: string;
    }
  | {
      type: "tool_stdout";
      runId: string;
      toolCallId: string;
      data: string;
    }
  | {
      type: "tool_stderr";
      runId: string;
      toolCallId: string;
      data: string;
    }
  | {
      type: "tool_call_end";
      runId: string;
      toolCallId: string;
      name: string;
      ok: boolean;
      result: string;
      shellResult?: ShellResult;
    }
  | {
      type: "trace";
      runId: string;
      message: string;
      path?: string;
    }
  | {
      type: "error";
      runId: string;
      error: string;
    }
  | {
      type: "done";
      runId: string;
      result: AgentResult;
    };
