import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config/config.js";
import type { AgentEvent } from "./events.js";

export type TraceRecord = {
  ts: string;
  runId: string;
  type: string;
  [key: string]: unknown;
};

function redactString(value: string, config: AppConfig): string {
  let out = value;
  if (config.apiKey) {
    out = out.split(config.apiKey).join("[REDACTED_API_KEY]");
  }
  return out.replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-[REDACTED]");
}

function redactValue(value: unknown, config: AppConfig): unknown {
  if (typeof value === "string") return redactString(value, config);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, config));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (/api[_-]?key|authorization|token|secret/i.test(key)) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = redactValue(nested, config);
      }
    }
    return output;
  }
  return value;
}

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
