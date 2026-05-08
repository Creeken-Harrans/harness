export type McpToolDescriptor = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export interface McpClient {
  listTools(): Promise<McpToolDescriptor[]>;
  callTool(name: string, input: Record<string, unknown>): Promise<unknown>;
  close(): Promise<void>;
}

export class NotConnectedMcpClient implements McpClient {
  async listTools(): Promise<McpToolDescriptor[]> {
    return [];
  }

  async callTool(name: string): Promise<unknown> {
    throw new Error("MCP client is not connected. Tool requested: " + name);
  }

  async close(): Promise<void> {
    return undefined;
  }
}

