import type { DeepSeekClient } from "../deepseek/client.js";
import type { ContextManager } from "../context.js";
import type { SessionStore } from "../session.js";
import type { ToolRunner } from "../tools/runner.js";
import type { AppConfig } from "../config/config.js";
import type { AgentEvent, AgentResult } from "./events.js";
import { runAgentLoop } from "./loop.js";

export class AgentRuntime {
  constructor(
    private readonly config: AppConfig,
    private readonly client: DeepSeekClient,
    private readonly context: ContextManager,
    private readonly session: SessionStore,
    private readonly toolRunner: ToolRunner,
  ) {}

  run(input: string): AsyncGenerator<AgentEvent, AgentResult> {
    return runAgentLoop(
      {
        config: this.config,
        client: this.client,
        context: this.context,
        session: this.session,
        toolRunner: this.toolRunner,
      },
      input,
    );
  }

  async runOnce(input: string): Promise<string> {
    const stream = this.run(input);
    let next = await stream.next();
    let finalText = "";
    let lastError = "";
    while (!next.done) {
      if (next.value.type === "assistant_message" && next.value.content.trim()) {
        finalText = next.value.content.trim();
      }
      if (next.value.type === "error") {
        lastError = next.value.error;
      }
      if (next.value.type === "done") {
        finalText = next.value.result.finalText;
      }
      next = await stream.next();
    }
    if (next.value.stoppedReason === "error") {
      throw new Error(lastError || "Agent runtime failed.");
    }
    return next.value.finalText || finalText;
  }

  async handleUserInput(input: string): Promise<string> {
    return this.runOnce(input);
  }
}
