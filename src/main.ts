#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs";
import { readConfig } from "./config.js";
import { DeepSeekClient } from "./deepseek.js";
import { ContextManager } from "./context.js";
import { MemoryStore } from "./memory.js";
import { SessionStore } from "./session.js";
import { Terminal } from "./terminal.js";
import { ToolRunner } from "./tools/runner.js";
import { AgentRuntime } from "./runtime.js";
import { handleSlashCommand } from "./commands.js";

async function main(): Promise<void> {
  const config = readConfig();
  fs.mkdirSync(config.dataDir, { recursive: true });

  const sessionId = process.argv.find((x) => x.startsWith("--session="))?.split("=")[1] ?? "default";

  const rl = readline.createInterface({ input, output });
  const memory = new MemoryStore(config.dataDir);
  const session = new SessionStore(config.dataDir, sessionId);
  const terminal = new Terminal(config);
  const client = new DeepSeekClient(config);
  const context = new ContextManager(config, memory);
  const toolRunner = new ToolRunner(config, memory, terminal, (q) => rl.question(q));
  const runtime = new AgentRuntime(client, context, session, toolRunner);

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

    const command = await handleSlashCommand(trimmed, config, session, memory, terminal);
    if (command.shouldExit) break;
    if (command.handled) continue;

    try {
      const answer = await runtime.handleUserInput(trimmed);
      console.log(`\nassistant> ${answer}\n`);
    } catch (error) {
      console.error("\n[error]", error instanceof Error ? error.message : String(error), "\n");
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
