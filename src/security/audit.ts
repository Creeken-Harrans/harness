import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config/config.js";
import { redactValue } from "./secrets.js";

export type AuditRecord = {
  ts: string;
  type: string;
  [key: string]: unknown;
};

export class AuditLog {
  private readonly filePath: string;

  constructor(private readonly config: AppConfig) {
    const dir = path.join(config.dataDir, "audit");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, "audit.jsonl");
  }

  write(record: Omit<AuditRecord, "ts">): void {
    const safe = redactValue({ ts: new Date().toISOString(), ...record }, this.config);
    fs.appendFileSync(this.filePath, `${JSON.stringify(safe)}\n`);
  }
}

