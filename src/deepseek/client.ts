import type { AppConfig } from "../config/config.js";
import type { ChatMessage } from "../messages/message.js";
import { toDeepSeekMessages } from "../messages/serializers.js";
import { parseDeepSeekSse } from "./stream.js";
import type {
  DeepSeekChatCompletionResponse,
  DeepSeekToolDefinition,
  ModelStreamEvent,
} from "./types.js";

export class DeepSeekClient {
  constructor(private readonly config: AppConfig) {}

  private requestBody(messages: ChatMessage[], tools: DeepSeekToolDefinition[], stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: toDeepSeekMessages(messages),
      stream,
      thinking: { type: this.config.thinking },
    };

    if (this.config.thinking === "enabled") {
      body.reasoning_effort = this.config.reasoningEffort;
    }

    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    return body;
  }

  private endpoint(): string {
    return `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  }

  async chatOnce(messages: ChatMessage[], tools: DeepSeekToolDefinition[] = []): Promise<DeepSeekChatCompletionResponse> {
    if (!this.config.apiKey) {
      throw new Error("Missing DEEPSEEK_API_KEY. Copy .env.example to .env and fill in your key.");
    }

    const response = await fetch(this.endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(this.requestBody(messages, tools, false)),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${text}`);
    }

    const json = (await response.json()) as DeepSeekChatCompletionResponse;
    if (!json.choices?.[0]?.message) {
      throw new Error(`Unexpected DeepSeek response: ${JSON.stringify(json).slice(0, 1000)}`);
    }
    return json;
  }

  async chat(messages: ChatMessage[], tools: DeepSeekToolDefinition[] = []): Promise<DeepSeekChatCompletionResponse> {
    return this.chatOnce(messages, tools);
  }

  async *chatStream(messages: ChatMessage[], tools: DeepSeekToolDefinition[] = []): AsyncGenerator<ModelStreamEvent> {
    if (!this.config.apiKey) {
      throw new Error("Missing DEEPSEEK_API_KEY. Copy .env.example to .env and fill in your key.");
    }

    const response = await fetch(this.endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(this.requestBody(messages, tools, true)),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${text}`);
    }

    if (!response.body) {
      throw new Error("DeepSeek API returned no stream body.");
    }

    yield* parseDeepSeekSse(response.body);
  }
}
