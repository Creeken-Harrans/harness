import type { Agent, AgentContext } from "./agent.js";
import type { AgentEvent, AgentResult } from "../runtime/events.js";

export class SimpleAgent implements Agent {
  name = "simple";
  description = "Default DeepSeek tool-calling loop.";

  run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent, AgentResult> {
    return ctx.runLoop(input);
  }
}

