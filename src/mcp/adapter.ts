import type { Tool } from "../tools/tool.js";
import type { McpClient, McpToolDescriptor } from "./client.js";

export function mcpToolToHarnessTool(client: McpClient, descriptor: McpToolDescriptor): Tool {
  return {
    name: "mcp_" + descriptor.name.replace(/[^a-zA-Z0-9_-]/g, "_"),
    description: descriptor.description ?? "MCP tool adapter for " + descriptor.name,
    inputSchema: descriptor.inputSchema ?? { type: "object", properties: {}, additionalProperties: true },
    risk: "network",
    async run(input) {
      const data = await client.callTool(descriptor.name, input);
      return { ok: true, content: JSON.stringify(data, null, 2), data };
    },
  };
}

