export type EvalJudge =
  | { type: "final_contains"; text: string }
  | { type: "tool_called"; name: string }
  | { type: "tool_not_called"; name: string }
  | { type: "permission_denied" }
  | { type: "exit_ok" }
  | { type: "memory_hit"; text: string };

export type EvalToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type EvalCase = {
  id: string;
  name: string;
  input: string;
  expected?: string;
  allowedTools?: string[];
  deniedTools?: string[];
  judge: EvalJudge | EvalJudge[];
  maxSteps?: number;
  tags?: string[];
  toolCalls?: EvalToolCall[];
};

export type EvalCaseResult = {
  case: EvalCase;
  ok: boolean;
  finalText: string;
  toolCalls: Array<{ name: string; ok: boolean; result: string }>;
  deniedToolCount: number;
  durationMs: number;
  errors: string[];
};

