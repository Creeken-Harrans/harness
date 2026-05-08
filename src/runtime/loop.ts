import crypto from "node:crypto";
import type { DeepSeekClient } from "../deepseek/client.js";
import type { ContextManager } from "../context.js";
import type { SessionStore } from "../session.js";
import type { ToolRunner } from "../tools/runner.js";
import { tools } from "../tools/schema.js";
import type { ChatMessage, ToolCall } from "../messages/message.js";
import { toolResultToMessage } from "../messages/serializers.js";
import type { ModelStreamEvent } from "../deepseek/types.js";
import type { AppConfig } from "../config/config.js";
import type { AgentEvent, AgentResult } from "./events.js";
import { TraceWriter } from "./trace.js";

type RuntimeDeps = {
  config: AppConfig;
  client: DeepSeekClient;
  context: ContextManager;
  session: SessionStore;
  toolRunner: ToolRunner;
};

type ToolCallAccumulator = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

function ensureToolCall(
  calls: Map<number, ToolCallAccumulator>,
  index: number,
): ToolCallAccumulator {
  const existing = calls.get(index);
  if (existing) return existing;

  const created: ToolCallAccumulator = {
    id: "",
    type: "function",
    function: {
      name: "",
      arguments: "",
    },
  };
  calls.set(index, created);
  return created;
}

function materializeToolCalls(calls: Map<number, ToolCallAccumulator>, runId: string): ToolCall[] {
  return [...calls.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, call]) => ({
      id: call.id || `call_${runId}_${index}`,
      type: "function" as const,
      function: {
        name: call.function.name,
        arguments: call.function.arguments,
      },
    }))
    .filter((call) => call.function.name);
}

function accumulateToolCall(delta: ModelStreamEvent, calls: Map<number, ToolCallAccumulator>): void {
  if (delta.type !== "tool_call_delta") return;
  const call = ensureToolCall(calls, delta.toolCallIndex);
  if (delta.id) call.id = delta.id;
  if (delta.callType) call.type = delta.callType;
  if (delta.nameDelta) call.function.name += delta.nameDelta;
  if (delta.argumentsDelta) call.function.arguments += delta.argumentsDelta;
}

export async function* runAgentLoop(
  deps: RuntimeDeps,
  input: string,
): AsyncGenerator<AgentEvent, AgentResult> {
  const runId = crypto.randomUUID();
  const trace = new TraceWriter(deps.config, runId);

  const emit = function* (event: AgentEvent): Generator<AgentEvent> {
    trace.writeEvent(event);
    yield event;
  };

  yield* emit({ type: "trace", runId, message: "trace started", path: trace.path() });
  yield* emit({ type: "user_message", runId, input });

  const userMessage: ChatMessage = { role: "user", content: input };
  deps.session.append(userMessage);

  const messages = deps.context.build(deps.session.getMessages(), input);
  let finalText = "";
  let steps = 0;

  try {
    for (; steps < deps.config.maxSteps; steps++) {
      trace.write({
        type: "model_request",
        messageCount: messages.length,
        toolCount: tools.length,
        step: steps + 1,
      });

      let content = "";
      let reasoningContent = "";
      let finishReason: string | null | undefined;
      const toolCallDeltas = new Map<number, ToolCallAccumulator>();

      for await (const event of deps.client.chatStream(messages, tools)) {
        switch (event.type) {
          case "content_delta":
            content += event.delta;
            yield* emit({ type: "llm_delta", runId, delta: event.delta });
            break;
          case "reasoning_delta":
            reasoningContent += event.delta;
            yield* emit({ type: "llm_reasoning_delta", runId, delta: event.delta });
            break;
          case "tool_call_delta":
            accumulateToolCall(event, toolCallDeltas);
            break;
          case "choice_done":
            finishReason = event.finishReason;
            trace.write({
              type: "model_choice_done",
              step: steps + 1,
              finishReason,
              usage: event.usage,
            });
            break;
          case "done":
            trace.write({ type: "model_stream_done", step: steps + 1, usage: event.usage });
            break;
        }
      }

      const toolCalls = materializeToolCalls(toolCallDeltas, runId);
      const assistant: ChatMessage = {
        role: "assistant",
        content: content || null,
      };

      if (reasoningContent) {
        assistant.reasoning_content = reasoningContent;
      }
      if (toolCalls.length > 0) {
        assistant.tool_calls = toolCalls;
      }

      messages.push(assistant);
      deps.session.append(assistant);
      yield* emit({ type: "assistant_message", runId, content, toolCalls });

      if (toolCalls.length === 0) {
        finalText = content.trim();
        const result: AgentResult = { runId, finalText, steps: steps + 1, stoppedReason: "final" };
        yield* emit({ type: "done", runId, result });
        return result;
      }

      for (const call of toolCalls) {
        yield* emit({
          type: "tool_call_start",
          runId,
          toolCallId: call.id,
          name: call.function.name,
          arguments: call.function.arguments,
        });

        const stream = deps.toolRunner.runWithEvents(call, runId);
        let next = await stream.next();
        while (!next.done) {
          trace.writeEvent(next.value);
          yield next.value;
          next = await stream.next();
        }

        const toolResult = next.value;
        const toolMessage = toolResultToMessage(call, toolResult);
        messages.push(toolMessage);
        deps.session.append(toolMessage);
      }

      if (finishReason === "stop" && toolCalls.length === 0) {
        break;
      }
    }

    finalText = "工具调用轮数已达到上限，已停止。你可以把任务拆小一点，或者检查刚才的工具输出。";
    const result: AgentResult = { runId, finalText, steps, stoppedReason: "max_steps" };
    yield* emit({ type: "assistant_message", runId, content: finalText });
    yield* emit({ type: "done", runId, result });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result: AgentResult = { runId, finalText: "", steps, stoppedReason: "error" };
    yield* emit({ type: "error", runId, error: message });
    yield* emit({ type: "done", runId, result });
    return result;
  }
}
