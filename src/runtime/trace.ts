import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config/config.js";
import type { AgentEvent } from "./events.js";
import { redactValue } from "../security/secrets.js";

export type TraceRecord = {
  ts: string;
  runId: string;
  type: string;
  [key: string]: unknown;
};

export class TraceWriter {
  private readonly filePath: string;

  constructor(
    private readonly config: AppConfig,
    private readonly runId: string,
  ) {
    const traceDir = path.join(config.dataDir, "traces");
    fs.mkdirSync(traceDir, { recursive: true });
    this.filePath = path.join(traceDir, `${runId}.jsonl`);
  }

  path(): string {
    return this.filePath;
  }

  write(record: Omit<TraceRecord, "ts" | "runId">): void {
    const safe = redactValue(
      {
        ts: new Date().toISOString(),
        runId: this.runId,
        ...record,
      },
      this.config,
    ) as TraceRecord;
    fs.appendFileSync(this.filePath, `${JSON.stringify(safe)}\n`);
  }

  writeEvent(event: AgentEvent): void {
    this.write({
      type: event.type,
      event,
    });
  }
}
