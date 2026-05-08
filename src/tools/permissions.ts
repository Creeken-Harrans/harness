import type { ApprovalPolicy } from "../security/approval.js";
import type { Tool, ToolRisk } from "./tool.js";

function approvalDetail(tool: Tool, input: Record<string, unknown>): string {
  if (tool.risk === "shell" && typeof input.command === "string") {
    return `command: ${input.command}${typeof input.cwd === "string" ? `\ncwd: ${input.cwd}` : ""}`;
  }
  if (tool.risk === "write" && typeof input.path === "string") {
    return `path: ${input.path}`;
  }
  return JSON.stringify(input, null, 2).slice(0, 2000);
}

export async function ensureToolPermission(
  tool: Tool,
  input: Record<string, unknown>,
  approval: ApprovalPolicy,
): Promise<void> {
  const decision = await approval.request({
    action: tool.name,
    risk: tool.risk as ToolRisk,
    detail: approvalDetail(tool, input),
  });
  if (!decision.approved) {
    throw new Error(decision.reason ?? `Tool use denied: ${tool.name}`);
  }
}

