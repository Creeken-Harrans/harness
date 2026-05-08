import path from "node:path";
import type { AppConfig } from "../config.js";
import { estimateTokens } from "../context.js";
import type { MemoryStore } from "../memory.js";
import type { SessionStore } from "../session.js";
import type { Terminal } from "../terminal.js";

export type CommandResult = {
  handled: boolean;
  shouldExit?: boolean;
};

function printHelp(): void {
  console.log(`
Commands:
  /help                 Show this help
  /exit                 Exit
  /clear                Clear current session history
  /remember <text>      Save a durable memory
  /mem [query]          List or search memories
  /context              Show session/context stats
  /model                Show current model config
  /think [off|high|max] Show or change thinking mode for this session
  /pwd                  Show shell workspace
  /sh <command>         Run a shell command directly with streaming output

Normal text is sent to DeepSeek with memory + trimmed context.
`);
}

export async function handleSlashCommand(
  input: string,
  config: AppConfig,
  session: SessionStore,
  memory: MemoryStore,
  terminal: Terminal,
): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return { handled: false };

  const [cmd, ...rest] = trimmed.split(" ");
  const arg = rest.join(" ").trim();

  switch (cmd) {
    case "/help":
      printHelp();
      return { handled: true };

    case "/exit":
    case "/quit":
      return { handled: true, shouldExit: true };

    case "/clear":
      session.clear();
      console.log("Session cleared.");
      return { handled: true };

    case "/remember": {
      if (!arg) {
        console.log("Usage: /remember <text>");
        return { handled: true };
      }
      const entry = memory.add(arg, ["manual"], "manual");
      console.log(`Saved memory ${entry.id}`);
      return { handled: true };
    }

    case "/mem": {
      const results = arg ? memory.search(arg, 10) : memory.list(10);
      if (results.length === 0) {
        console.log("No memories found.");
        return { handled: true };
      }
      for (const m of results) {
        console.log(`- ${m.id} [${m.createdAt}] ${m.text}${m.tags.length ? ` #${m.tags.join(" #")}` : ""}`);
      }
      return { handled: true };
    }

    case "/context": {
      const messages = session.getMessages();
      const chars = messages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0), 0);
      console.log(JSON.stringify({
        sessionId: session.id(),
        messageCount: session.messageCount(),
        approximateHistoryTokens: estimateTokens("x".repeat(chars)),
        memoryCount: memory.count(),
        maxContextTokens: config.maxContextTokens,
        maxSteps: config.maxSteps,
      }, null, 2));
      return { handled: true };
    }

    case "/model":
      console.log(JSON.stringify({
        baseUrl: config.baseUrl,
        model: config.model,
        thinking: config.thinking,
        reasoningEffort: config.reasoningEffort,
        approvalMode: config.approvalMode,
      }, null, 2));
      return { handled: true };

    case "/think":
    case "/thinking": {
      const value = arg.toLowerCase();
      if (!arg) {
        console.log(JSON.stringify({
          thinking: config.thinking,
          reasoningEffort: config.reasoningEffort,
        }, null, 2));
      } else if (["off", "disabled", "disable", "false", "0"].includes(value)) {
        config.thinking = "disabled";
        console.log("thinking disabled");
      } else if (["on", "enabled", "enable", "true", "1"].includes(value)) {
        config.thinking = "enabled";
        console.log(`thinking enabled: ${config.reasoningEffort}`);
      } else if (value === "high" || value === "max") {
        config.thinking = "enabled";
        config.reasoningEffort = value;
        console.log(`thinking enabled: ${config.reasoningEffort}`);
      } else {
        console.log("Usage: /think [off|high|max]");
      }
      return { handled: true };
    }

    case "/pwd":
      console.log(config.workspace);
      return { handled: true };

    case "/sh": {
      if (!arg) {
        console.log("Usage: /sh <command>");
        return { handled: true };
      }

      let finalResult: Awaited<ReturnType<Terminal["run"]>> | undefined;
      const stream = terminal.runStream(arg, path.resolve(config.workspace));
      let next = await stream.next();
      while (!next.done) {
        const event = next.value;
        if (event.type === "stdout") {
          process.stdout.write(event.data);
        } else if (event.type === "stderr") {
          process.stderr.write(event.data);
        } else if (event.type === "error") {
          process.stderr.write(event.error);
        } else if (event.type === "exit") {
          finalResult = event.result;
        }
        next = await stream.next();
      }
      finalResult ??= next.value;
      console.log(JSON.stringify({
        command: finalResult.command,
        cwd: finalResult.cwd,
        exitCode: finalResult.exitCode,
        signal: finalResult.signal,
        durationMs: finalResult.durationMs,
        timedOut: finalResult.timedOut,
        stdoutBytes: finalResult.stdoutBytes,
        stderrBytes: finalResult.stderrBytes,
      }, null, 2));
      return { handled: true };
    }

    default:
      console.log(`Unknown command: ${cmd}. Try /help`);
      return { handled: true };
  }
}
