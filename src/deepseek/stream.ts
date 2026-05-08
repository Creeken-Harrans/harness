import type { DeepSeekStreamChunk, ModelStreamEvent } from "./types.js";

function streamEventsFromChunk(chunk: DeepSeekStreamChunk): ModelStreamEvent[] {
  const events: ModelStreamEvent[] = [];
  for (const choice of chunk.choices ?? []) {
    const delta = choice.delta;
    if (typeof delta?.reasoning_content === "string" && delta.reasoning_content.length > 0) {
      events.push({
        type: "reasoning_delta",
        choiceIndex: choice.index,
        delta: delta.reasoning_content,
      });
    }

    if (typeof delta?.content === "string" && delta.content.length > 0) {
      events.push({
        type: "content_delta",
        choiceIndex: choice.index,
        delta: delta.content,
      });
    }

    for (const toolCall of delta?.tool_calls ?? []) {
      events.push({
        type: "tool_call_delta",
        choiceIndex: choice.index,
        toolCallIndex: toolCall.index,
        id: toolCall.id,
        callType: toolCall.type,
        nameDelta: toolCall.function?.name,
        argumentsDelta: toolCall.function?.arguments,
      });
    }

    if (choice.finish_reason != null) {
      events.push({
        type: "choice_done",
        choiceIndex: choice.index,
        finishReason: choice.finish_reason,
        usage: chunk.usage,
      });
    }
  }
  return events;
}

function parseSseMessage(message: string): string[] {
  const payloads: string[] = [];
  const dataLines: string[] = [];

  for (const line of message.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length > 0) {
    payloads.push(dataLines.join("\n"));
  }
  return payloads;
}

export async function* parseDeepSeekSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ModelStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const boundary = buffer.search(/\r?\n\r?\n/);
      if (boundary === -1) break;

      const rawMessage = buffer.slice(0, boundary);
      const delimiterLength = buffer.startsWith("\r\n\r\n", boundary) ? 4 : 2;
      buffer = buffer.slice(boundary + delimiterLength);

      for (const payload of parseSseMessage(rawMessage)) {
        if (payload === "[DONE]") {
          yield { type: "done" };
          continue;
        }

        const chunk = JSON.parse(payload) as DeepSeekStreamChunk;
        for (const event of streamEventsFromChunk(chunk)) {
          yield event;
        }
      }
    }
  }

  const tail = buffer + decoder.decode();
  for (const payload of parseSseMessage(tail.trim())) {
    if (payload === "[DONE]") {
      yield { type: "done" };
      continue;
    }
    const chunk = JSON.parse(payload) as DeepSeekStreamChunk;
    for (const event of streamEventsFromChunk(chunk)) {
      yield event;
    }
  }
}
