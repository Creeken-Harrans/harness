import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readConfig } from "../config/config.js";
import { MemoryStore } from "../memory.js";
import { NotesStore } from "../notes/notes.js";
import { SessionStore } from "../session.js";
import { Terminal } from "../terminal.js";
import { createPhase2CoreTools } from "../tools/core/index.js";
import { ToolRegistry } from "../tools/registry.js";
import { ToolRunner } from "../tools/runner.js";
import { Workspace } from "../workspace/workspace.js";
import type { EvalCase, EvalCaseResult } from "./cases.js";
import { judgeEvalCase } from "./judge.js";
import { computeMetrics } from "./metrics.js";

function readCases(casesDir: string): EvalCase[] {
  if (!fs.existsSync(casesDir)) return [];
  const cases: EvalCase[] = [];
  for (const file of fs.readdirSync(casesDir).sort()) {
    const filePath = path.join(casesDir, file);
    if (file.endsWith(".jsonl")) {
      for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
        if (line.trim()) cases.push(JSON.parse(line) as EvalCase);
      }
    } else if (file.endsWith(".json")) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as EvalCase | EvalCase[];
      cases.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    }
  }
  return cases;
}

function makeRunner() {
  const config = readConfig();
  config.approvalMode = "never";
  config.dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-eval-"));
  const workspace = new Workspace(config.workspace);
  const registry = new ToolRegistry();
  for (const tool of createPhase2CoreTools()) registry.register(tool);
  const memory = new MemoryStore(config.dataDir);
  const notes = new NotesStore(config.dataDir);
  const session = new SessionStore(config.dataDir, "eval");
  const terminal = new Terminal(config);
  const runner = new ToolRunner({
    config,
    registry,
    memory,
    notes,
    session,
    terminal,
    workspace,
    ask: async () => "y",
  });
  return { runner };
}

async function runCase(evalCase: EvalCase): Promise<EvalCaseResult> {
  const started = Date.now();
  const { runner } = makeRunner();
  const toolCalls: EvalCaseResult["toolCalls"] = [];
  const errors: string[] = [];
  let finalText = "";
  let deniedToolCount = 0;

  for (const call of evalCase.toolCalls ?? []) {
    if (evalCase.deniedTools?.includes(call.name)) {
      deniedToolCount += 1;
      continue;
    }
    if (evalCase.allowedTools && !evalCase.allowedTools.includes(call.name)) {
      deniedToolCount += 1;
      continue;
    }
    const stream = runner.runWithEvents({
      id: "eval_" + evalCase.id + "_" + call.name,
      type: "function",
      function: { name: call.name, arguments: JSON.stringify(call.arguments) },
    }, "eval_" + evalCase.id);
    let next = await stream.next();
    while (!next.done) next = await stream.next();
    const result = next.value;
    finalText += result + "\n";
    const ok = /"ok": true/.test(result);
    if (!ok && /denied|refusing|escapes|outside workspace/i.test(result)) deniedToolCount += 1;
    toolCalls.push({ name: call.name, ok, result });
  }

  const partial: EvalCaseResult = {
    case: evalCase,
    ok: false,
    finalText,
    toolCalls,
    deniedToolCount,
    durationMs: Date.now() - started,
    errors,
  };
  const judged = judgeEvalCase(evalCase, partial);
  return { ...partial, ok: judged.ok, errors: [...errors, ...judged.reasons] };
}

export async function runEvalSuite(casesDir = path.resolve(process.cwd(), "evals/cases")) {
  const cases = readCases(casesDir);
  const results: EvalCaseResult[] = [];
  for (const evalCase of cases) {
    results.push(await runCase(evalCase));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    metrics: computeMetrics(results),
    results,
  };
  const reportDir = path.resolve(process.cwd(), "evals/reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "report-" + Date.now() + ".json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return { reportPath, report };
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  runEvalSuite().then(({ reportPath, report }) => {
    console.log("eval report: " + reportPath);
    console.log(JSON.stringify(report.metrics, null, 2));
    process.exitCode = report.metrics.failed === 0 ? 0 : 1;
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
