import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export type McpStdioTransportOptions = {
  command: string;
  args?: string[];
  cwd?: string;
};

export class McpStdioTransport {
  private child: ChildProcessWithoutNullStreams | undefined;

  start(options: McpStdioTransportOptions): void {
    if (this.child) throw new Error("MCP stdio transport already started.");
    this.child = spawn(options.command, options.args ?? [], {
      cwd: options.cwd,
      stdio: "pipe",
    });
  }

  writeJson(message: unknown): void {
    if (!this.child) throw new Error("MCP stdio transport is not started.");
    this.child.stdin.write(JSON.stringify(message) + "\n");
  }

  close(): void {
    this.child?.kill("SIGTERM");
    this.child = undefined;
  }
}

