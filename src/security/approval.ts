import type { AppConfig } from "../config/config.js";
import type { ToolRisk } from "../tools/tool.js";

export type ApprovalQuestion = {
  action: string;
  risk: ToolRisk;
  detail?: string;
};

export type ApprovalDecision = {
  approved: boolean;
  reason?: string;
};

export type AskFn = (question: string) => Promise<string>;

export class ApprovalPolicy {
  constructor(
    private readonly config: AppConfig,
    private readonly ask: AskFn,
  ) {}

  async request(question: ApprovalQuestion): Promise<ApprovalDecision> {
    if (question.risk === "dangerous" && !this.config.allowDangerousTools) {
      return { approved: false, reason: "Dangerous tools are disabled. Set HARNESS_ALLOW_DANGEROUS_TOOLS=true to opt in." };
    }

    if (!this.requiresApproval(question.risk)) {
      return { approved: true };
    }

    const detail = question.detail ? `\n${question.detail}` : "";
    const answer = await this.ask(
      `\nTool request: ${question.action}\nRisk: ${question.risk}${detail}\nApprove? [y/N] `,
    );
    const approved = ["y", "yes"].includes(answer.trim().toLowerCase());
    return approved ? { approved: true } : { approved: false, reason: "User declined tool request." };
  }

  requiresApproval(risk: ToolRisk): boolean {
    if (risk === "safe" || risk === "read") return false;
    if (risk === "dangerous") return true;
    if (this.config.approvalMode === "never") return false;
    return true;
  }
}

