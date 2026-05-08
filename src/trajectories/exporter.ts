import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config/config.js";
import type { AgentEvent, AgentResult } from "../runtime/events.js";
import { redactValue } from "../security/secrets.js";
import type { AgentTrajectory } from "./trajectory.js";
import { summarizeEvent } from "./trajectory.js";

export class TrajectoryRecorder {
  private readonly started = Date.now();
  private readonly trajectory: AgentTrajectory;

  constructor(
    private readonly config: AppConfig,
    runId: string,
    userInput: string,
    selectedContextSummary?: unknown,
  ) {
    this.trajectory = {
      runId,
      startedAt: new Date(this.started).toISOString(),
      userInput,
      selectedContextSummary,
      modelMessagesSummary: [],
      toolCalls: [],
      observations: [],
      errors: [],
    };
  }

  observe(event: AgentEvent): void {
    const summary = summarizeEvent(event);
    if (summary) this.trajectory.observations.push(summary);
    if (event.type === "tool_call_start") {
      this.trajectory.toolCalls.push({
        id: event.toolCallId,
        name: event.name,
        arguments: event.arguments,
      });
    } else if (event.type === "tool_call_end") {
      const existing = this.trajectory.toolCalls.find((call) => call.id === event.toolCallId);
      if (existing) {
        existing.ok = event.ok;
        existing.observationSummary = event.result.slice(0, 1000);
      }
    } else if (event.type === "assistant_message") {
      this.trajectory.modelMessagesSummary.push(event.content.slice(0, 1000));
    } else if (event.type === "error") {
      this.trajectory.errors.push(event.error);
    } else if (event.type === "done") {
      this.finish(event.result);
    }
  }

  finish(result: AgentResult): void {
    this.trajectory.result = result;
    this.trajectory.finalAnswer = result.finalText;
    this.trajectory.success = result.stoppedReason === "final";
    this.trajectory.endedAt = new Date().toISOString();
    this.trajectory.durationMs = Date.now() - this.started;
  }

  write(): string {
    const dir = path.join(this.config.dataDir, "trajectories");
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, this.trajectory.runId + ".json");
    fs.writeFileSync(filePath, JSON.stringify(redactValue(this.trajectory, this.config), null, 2));
    return filePath;
  }
}

