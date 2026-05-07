import fs from "node:fs";
import path from "node:path";

export type ThinkingMode = "enabled" | "disabled";
export type ApprovalMode = "always" | "shell" | "never";

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
};

function stripQuotes(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

export function loadDotEnv(filePath = path.resolve(process.cwd(), ".env")): void {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = stripQuotes(trimmed.slice(eq + 1));
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function enumEnv<T extends string>(name: string, values: readonly T[], fallback: T): T {
  const raw = process.env[name] as T | undefined;
  if (raw && values.includes(raw)) return raw;
  return fallback;
}

export function readConfig(): AppConfig {
  loadDotEnv();

  const cwd = process.cwd();
  const apiKey = process.env.DEEPSEEK_API_KEY ?? "";
  const workspace = path.resolve(cwd, process.env.HARNESS_WORKSPACE ?? ".");

  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
    thinking: enumEnv("DEEPSEEK_THINKING", ["enabled", "disabled"] as const, "disabled"),
    reasoningEffort: enumEnv("DEEPSEEK_REASONING_EFFORT", ["high", "max"] as const, "high"),
    maxContextTokens: intEnv("HARNESS_MAX_CONTEXT_TOKENS", 24_000),
    approvalMode: enumEnv("HARNESS_APPROVAL_MODE", ["always", "shell", "never"] as const, "shell"),
    workspace,
    dataDir: path.resolve(cwd, "data"),
    shellTimeoutMs: intEnv("HARNESS_SHELL_TIMEOUT_MS", 20_000),
    maxToolOutputChars: intEnv("HARNESS_MAX_TOOL_OUTPUT_CHARS", 12_000),
  };
}
