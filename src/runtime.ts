import type { DeepSeekClient } from "./deepseek.js";
import type { ContextManager } from "./context.js";
import type { SessionStore } from "./session.js";
import type { ToolRunner } from "./tools/runner.js";
import { tools } from "./tools/schema.js";
import type { ChatMessage } from "./types.js";

export class AgentRuntime {
  constructor(
    private readonly client: DeepSeekClient,
    private readonly context: ContextManager,
    private readonly session: SessionStore,
    private readonly toolRunner: ToolRunner,
  ) {}

  async handleUserInput(input: string): Promise<string> {
    const userMessage: ChatMessage = { role: "user", content: input };
    this.session.append(userMessage);

    const messages = this.context.build(this.session.getMessages(), input);

    let finalText = "";
    const maxToolRounds = 6;

    for (let round = 0; round < maxToolRounds; round++) {
      const response = await this.client.chat(messages, tools);
      const assistant = response.choices[0].message;

      messages.push(assistant);
      this.session.append(assistant);

      const toolCalls = assistant.tool_calls ?? [];
      const content = typeof assistant.content === "string" ? assistant.content : "";

      if (toolCalls.length === 0) {
        finalText = content.trim();
        break;
      }

      if (content.trim()) {
        console.log(`\nassistant> ${content.trim()}\n`);
      }

      for (const call of toolCalls) {
        console.log(`\n[tool request] ${call.function.name}`);
        const result = await this.toolRunner.run(call);
        const toolMessage: ChatMessage = {
          role: "tool",
          tool_call_id: call.id,
          content: result,
        };
        messages.push(toolMessage);
        this.session.append(toolMessage);
      }
    }

    if (!finalText) {
      finalText = "工具调用轮数已达到上限，已停止。你可以把任务拆小一点，或者检查刚才的工具输出。";
    }

    return finalText;
  }
}
