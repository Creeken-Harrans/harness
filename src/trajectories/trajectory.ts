import type { AgentEvent, AgentResult } from "../runtime/events.js";

export type TrajectoryToolCall = {
  id: string;
  name: string;
  arguments?: string;
  ok?: boolean;
  observationSummary?: string;
};

export type AgentTrajectory = {
  runId: string;
  startedAt: string;
  endedAt?: string;
  userInput: string;
  selectedContextSummary?: unknown;
  modelMessagesSummary: string[];
  toolCalls: TrajectoryToolCall[];
  observations: string[];
  finalAnswer?: string;
  errors: string[];
  durationMs?: number;
  usage?: unknown;
  result?: AgentResult;
  success?: boolean;
  humanFeedback?: unknown;
};

export function summarizeEvent(event: AgentEvent): string | undefined {
  if (event.type === "assistant_message" && event.content.trim()) return "assistant: " + event.content.trim().slice(0, 1000);
  if (event.type === "tool_stdout") return "stdout: " + event.data.slice(0, 500);
  if (event.type === "tool_stderr") return "stderr: " + event.data.slice(0, 500);
  if (event.type === "error") return "error: " + event.error;
  return undefined;
}

