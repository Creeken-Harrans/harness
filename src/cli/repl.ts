import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs";
import { readConfig } from "../config.js";
import { DeepSeekClient } from "../deepseek.js";
import { ContextManager } from "../context.js";
import { MemoryStore } from "../memory.js";
import { SessionStore } from "../session.js";
import { Terminal } from "../terminal.js";
import { ToolRunner } from "../tools/runner.js";
import { ToolRegistry } from "../tools/registry.js";
import { createPhase2CoreTools } from "../tools/core/index.js";
import { Workspace } from "../workspace/workspace.js";
import { NotesStore } from "../notes/notes.js";
import { AgentRuntime } from "../runtime.js";
import { handleSlashCommand } from "./commands.js";
import { AgentRenderer } from "./renderer.js";

export async function startRepl(): Promise<void> {
  const config = readConfig();
  fs.mkdirSync(config.dataDir, { recursive: true });

  const sessionId = process.argv.find((x) => x.startsWith("--session="))?.split("=")[1] ?? "default";

  const rl = readline.createInterface({ input, output });
  const memory = new MemoryStore(config.dataDir);
  const session = new SessionStore(config.dataDir, sessionId);
  const terminal = new Terminal(config);
  const workspace = new Workspace(config.workspace);
  const notes = new NotesStore(config.dataDir);
  const registry = new ToolRegistry();
  for (const tool of createPhase2CoreTools()) registry.register(tool);
  const client = new DeepSeekClient(config);
  const context = new ContextManager(config, memory);
  const toolRunner = new ToolRunner({
    config,
    registry,
    memory,
    terminal,
    workspace,
    notes,
    session,
    ask: (q) => rl.question(q),
  });
  const runtime = new AgentRuntime(config, client, context, session, toolRunner);
  const renderer = new AgentRenderer();

  console.log("DeepSeek Mini Harness");
  console.log(`session=${session.id()} model=${config.model} workspace=${config.workspace}`);
  console.log("Type /help for commands. Type /exit to quit.\n");

  if (!config.apiKey) {
    console.log("Missing DEEPSEEK_API_KEY. Copy .env.example to .env and fill in your key before chatting.");
  }

  while (true) {
    const text = await rl.question("you> ");
    const trimmed = text.trim();
    if (!trimmed) continue;

    const command = await handleSlashCommand(trimmed, config, session, memory, terminal, context, registry, workspace, notes);
    if (command.shouldExit) break;
    if (command.handled) continue;

    const stream = runtime.run(trimmed);
    let next = await stream.next();
    while (!next.done) {
      renderer.render(next.value);
      next = await stream.next();
    }
  }

  rl.close();
}
