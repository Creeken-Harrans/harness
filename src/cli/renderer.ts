import type { AgentEvent } from "../runtime/events.js";

export class AgentRenderer {
  private assistantOpen = false;
  private assistantHadDelta = false;
  private reasoningOpen = false;

  render(event: AgentEvent): void {
    switch (event.type) {
      case "trace":
        console.log(`[trace] ${event.path ?? event.message}`);
        break;

      case "llm_reasoning_delta":
        this.ensureReasoningPrefix();
        process.stdout.write(event.delta);
        break;

      case "llm_delta":
        this.ensureAssistantPrefix();
        this.assistantHadDelta = true;
        process.stdout.write(event.delta);
        break;

      case "assistant_message":
        if (!this.assistantHadDelta && event.content.trim()) {
          this.ensureAssistantPrefix();
          process.stdout.write(event.content);
        }
        break;

      case "tool_call_start":
        this.closeOpenLines();
        console.log(`[tool] ${event.name} start`);
        break;

      case "tool_stdout":
        process.stdout.write(event.data);
        break;

      case "tool_stderr":
        process.stderr.write(event.data);
        break;

      case "tool_call_end":
        this.closeOpenLines();
        console.log(`[tool] ${event.name} ${event.ok ? "ok" : "failed"}`);
        break;

      case "error":
        this.closeOpenLines();
        console.error(`[error] ${event.error}`);
        break;

      case "done":
        this.closeOpenLines();
        break;

      case "user_message":
        break;
    }
  }

  private ensureAssistantPrefix(): void {
    if (this.reasoningOpen) {
      process.stdout.write("\n");
      this.reasoningOpen = false;
    }
    if (!this.assistantOpen) {
      process.stdout.write("\nassistant> ");
      this.assistantOpen = true;
    }
  }

  private ensureReasoningPrefix(): void {
    if (this.assistantOpen) {
      process.stdout.write("\n");
      this.assistantOpen = false;
    }
    if (!this.reasoningOpen) {
      process.stdout.write("\nreasoning> ");
      this.reasoningOpen = true;
    }
  }

  private closeOpenLines(): void {
    if (this.assistantOpen || this.reasoningOpen) {
      process.stdout.write("\n");
    }
    this.assistantOpen = false;
    this.assistantHadDelta = false;
    this.reasoningOpen = false;
  }
}
