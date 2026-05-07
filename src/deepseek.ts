import type { AppConfig } from "./config.js";
import type { ChatCompletionResponse, ChatMessage, ToolDefinition } from "./types.js";

export class DeepSeekClient {
  constructor(private readonly config: AppConfig) {}

  async chat(messages: ChatMessage[], tools: ToolDefinition[] = []): Promise<ChatCompletionResponse> {
    if (!this.config.apiKey) {
      throw new Error("Missing DEEPSEEK_API_KEY. Copy .env.example to .env and fill in your key.");
    }

    const url = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      stream: false,
      thinking: { type: this.config.thinking },
    };

    if (this.config.thinking === "enabled") {
      body.reasoning_effort = this.config.reasoningEffort;
    }

    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${text}`);
    }

    const json = (await response.json()) as ChatCompletionResponse;
    if (!json.choices?.[0]?.message) {
      throw new Error(`Unexpected DeepSeek response: ${JSON.stringify(json).slice(0, 1000)}`);
    }
    return json;
  }
}
