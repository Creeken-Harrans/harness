import type { Agent, AgentContext } from "./agent.js";
import { agentInput } from "./agent.js";
import type { AgentEvent, AgentResult } from "../runtime/events.js";

export class ReactAgent implements Agent {
  name = "react";
  description = "ReAct-style action/observation loop using DeepSeek tool calls.";

  run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent, AgentResult> {
    const instruction = [
      "Use a ReAct-style loop internally: decide the next action, call a tool when useful, observe the result, and continue until the task is answered.",
      "Do not reveal private chain-of-thought. When tools are used, expose only concise action summaries and observation summaries.",
      "Stop after the configured max steps and explain what remains if the task is not complete.",
    ].join("\n");
    return ctx.runLoop(agentInput(instruction, input));
  }
}

