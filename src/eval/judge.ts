import type { EvalCase, EvalCaseResult, EvalJudge } from "./cases.js";

function judges(evalCase: EvalCase): EvalJudge[] {
  return Array.isArray(evalCase.judge) ? evalCase.judge : [evalCase.judge];
}

export function judgeEvalCase(evalCase: EvalCase, result: EvalCaseResult): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const judge of judges(evalCase)) {
    if (judge.type === "final_contains" && !result.finalText.includes(judge.text)) {
      reasons.push("final text does not contain: " + judge.text);
    }
    if (judge.type === "tool_called" && !result.toolCalls.some((call) => call.name === judge.name)) {
      reasons.push("tool not called: " + judge.name);
    }
    if (judge.type === "tool_not_called" && result.toolCalls.some((call) => call.name === judge.name)) {
      reasons.push("tool should not have been called: " + judge.name);
    }
    if (judge.type === "permission_denied" && result.deniedToolCount === 0 && !/denied|refusing|escapes/i.test(result.finalText)) {
      reasons.push("permission denial was not observed");
    }
    if (judge.type === "exit_ok" && result.toolCalls.some((call) => !call.ok)) {
      reasons.push("a tool call failed");
    }
    if (judge.type === "memory_hit" && !result.finalText.includes(judge.text)) {
      reasons.push("memory text was not found: " + judge.text);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

