import path from "node:path";
import { boolEnv, enumEnv, intEnv, loadDotEnv } from "./env.js";

export type ThinkingMode = "enabled" | "disabled";
export type ApprovalMode = "always" | "shell" | "never";
export type HarnessAgentName = "simple" | "react" | "plan" | "reflection" | "coding" | "research";

export type AppConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  thinking: ThinkingMode;
  reasoningEffort: "high" | "max";
  maxContextTokens: number;
  approvalMode: ApprovalMode;
  workspace: string;
  dataDir: string;
  shellTimeoutMs: number;
  maxToolOutputChars: number;
  maxSteps: number;
  allowDangerousTools: boolean;
  agent: HarnessAgentName;
};

function firstPositiveIntEnv(names: string[], fallback: number): number {
  for (const name of names) {
    const value = intEnv(name, 0);
    if (value > 0) return value;
  }
  return fallback;
}

export function readConfig(): AppConfig {
  loadDotEnv();

  const cwd = process.cwd();
  const apiKey = process.env.DEEPSEEK_API_KEY ?? "";
  const workspace = path.resolve(cwd, process.env.HARNESS_WORKSPACE ?? ".");
  const dataDir = path.resolve(cwd, process.env.HARNESS_DATA_DIR ?? "data");

  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
    thinking: enumEnv("DEEPSEEK_THINKING", ["enabled", "disabled"] as const, "disabled"),
    reasoningEffort: enumEnv("DEEPSEEK_REASONING_EFFORT", ["high", "max"] as const, "high"),
    maxContextTokens: firstPositiveIntEnv(["HARNESS_CONTEXT_BUDGET", "HARNESS_MAX_CONTEXT_TOKENS"], 24_000),
    approvalMode: enumEnv("HARNESS_APPROVAL_MODE", ["always", "shell", "never"] as const, "shell"),
    workspace,
    dataDir,
    shellTimeoutMs: intEnv("HARNESS_SHELL_TIMEOUT_MS", 20_000),
    maxToolOutputChars: intEnv("HARNESS_MAX_TOOL_OUTPUT_CHARS", 12_000),
    maxSteps: intEnv("HARNESS_MAX_STEPS", 6),
    allowDangerousTools: boolEnv("HARNESS_ALLOW_DANGEROUS_TOOLS", false),
    agent: enumEnv("HARNESS_AGENT", ["simple", "react", "plan", "reflection", "coding", "research"] as const, "simple"),
  };
}
