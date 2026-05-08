import type { DeepSeekToolDefinition } from "../deepseek/types.js";
import type { Tool } from "./tool.js";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): this {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(tool.name)) {
      throw new Error(`Invalid tool name: ${tool.name}`);
    }
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  require(name: string): Tool {
    const tool = this.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool;
  }

  validateToolCallName(name: string): boolean {
    return this.tools.has(name);
  }

  list(): Tool[] {
    return [...this.tools.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  exportDeepSeekTools(): DeepSeekToolDefinition[] {
    return this.list().map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }
}

