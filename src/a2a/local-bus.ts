import type { AgentCard } from "./agent-card.js";

export type LocalAgentHandler = (input: unknown) => Promise<unknown>;

export class LocalAgentBus {
  private readonly agents = new Map<string, { card: AgentCard; handler: LocalAgentHandler }>();

  registerAgent(card: AgentCard, handler: LocalAgentHandler): void {
    if (this.agents.has(card.name)) throw new Error("Agent already registered: " + card.name);
    this.agents.set(card.name, { card, handler });
  }

  listAgents(): AgentCard[] {
    return [...this.agents.values()].map((entry) => entry.card);
  }

  async sendMessage(name: string, message: unknown): Promise<void> {
    await this.requestTask(name, message);
  }

  async requestTask(name: string, input: unknown): Promise<unknown> {
    const agent = this.agents.get(name);
    if (!agent) throw new Error("Unknown local agent: " + name);
    return agent.handler(input);
  }

  async collectResult(task: Promise<unknown>): Promise<unknown> {
    return task;
  }
}

