import type { Agent, AgentContext } from "./agent.js";
import { agentInput } from "./agent.js";
import type { AgentEvent, AgentResult } from "../runtime/events.js";

export class CodingAgent implements Agent {
  name = "coding";
  description = "Coding-oriented agent that prefers inspect-first workspace/file/git/tool workflows.";

  run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent, AgentResult> {
    if (ctx.notes) ctx.notes.appendSection("PROGRESS.md", "Coding agent task:\n" + input);
    const instruction = [
      "Use Coding Agent mode.",
      "Before edits, inspect README/package/config and git status/diff when relevant. Use workspace-safe file/git/patch tools.",
      "Prefer small, reversible edits. After edits, run the repo's lightweight verification such as npm run build when relevant.",
      "Do not commit automatically. Report changed files and verification results.",
    ].join("\n");
    return ctx.runLoop(agentInput(instruction, input));
  }
}

