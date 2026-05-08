import type { Agent, AgentContext } from "./agent.js";
import { agentInput } from "./agent.js";
import type { AgentEvent, AgentResult } from "../runtime/events.js";

export class ReflectionAgent implements Agent {
  name = "reflection";
  description = "Runs the task with a final self-check and concise reflection summary.";

  run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent, AgentResult> {
    const instruction = [
      "Use Reflection mode.",
      "Complete the task, then perform one concise self-check before the final answer. If you find a concrete issue, fix it once.",
      "Expose only a short reflection summary: checks run, issues found, and remaining risks.",
    ].join("\n");
    return ctx.runLoop(agentInput(instruction, input));
  }
}

