import type { Agent, AgentContext } from "./agent.js";
import { agentInput } from "./agent.js";
import { TodoStore } from "../notes/todo.js";
import type { AgentEvent, AgentResult } from "../runtime/events.js";

export class PlanExecuteAgent implements Agent {
  name = "plan";
  description = "Plan-Execute agent that records a task todo before executing.";

  run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent, AgentResult> {
    if (ctx.notes) {
      ctx.notes.appendSection("PROGRESS.md", "Plan-Execute agent started task:\n" + input);
      new TodoStore(ctx.notes).add("Complete Plan-Execute task: " + input.slice(0, 160));
    }
    const instruction = [
      "Use Plan-Execute mode.",
      "First provide a concise visible plan with checkable steps. Then execute the plan using tools when useful.",
      "Keep the plan updated in the answer; do not expose hidden reasoning. Finish with completed steps, remaining work, and evidence.",
    ].join("\n");
    return ctx.runLoop(agentInput(instruction, input));
  }
}

