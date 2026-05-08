import type { EvalCaseResult } from "./cases.js";

export type EvalMetrics = {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  toolCallCount: number;
  deniedToolCount: number;
  durationMs: number;
  errors: number;
};

export function computeMetrics(results: EvalCaseResult[]): EvalMetrics {
  const total = results.length;
  const passed = results.filter((result) => result.ok).length;
  const durationMs = results.reduce((sum, result) => sum + result.durationMs, 0);
  return {
    total,
    passed,
    failed: total - passed,
    successRate: total === 0 ? 0 : passed / total,
    toolCallCount: results.reduce((sum, result) => sum + result.toolCalls.length, 0),
    deniedToolCount: results.reduce((sum, result) => sum + result.deniedToolCount, 0),
    durationMs,
    errors: results.reduce((sum, result) => sum + result.errors.length, 0),
  };
}

