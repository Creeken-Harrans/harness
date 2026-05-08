import type { Agent, AgentContext } from "./agent.js";
import { agentInput } from "./agent.js";
import type { AgentEvent, AgentResult } from "../runtime/events.js";

export class ResearchAgent implements Agent {
  name = "research";
  description = "Local-document research agent with planner, gather, notes, synthesize, report phases.";

  run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent, AgentResult> {
    if (ctx.notes) ctx.notes.appendSection("PROGRESS.md", "Research agent task:\n" + input);
    const instruction = [
      "Use Research Agent mode for local materials.",
      "Plan the research question, gather evidence from available workspace files and memory, record useful notes when appropriate, then synthesize a grounded report.",
      "No web/search tool is currently registered, so do not claim live web research.",
    ].join("\n");
    return ctx.runLoop(agentInput(instruction, input));
  }
}

