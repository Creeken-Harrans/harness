export type AgentCard = {
  name: string;
  description: string;
  capabilities: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
};

