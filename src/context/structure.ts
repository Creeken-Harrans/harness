import type { ChatMessage } from "../messages/message.js";
import type { SelectedContext } from "./select.js";

export function structureDeepSeekMessages(selected: SelectedContext): ChatMessage[] {
  const systemContent = selected.systemSources
    .sort((a, b) => b.priority - a.priority)
    .map((source) => "[context:" + source.kind + ":" + source.id + "]\n" + source.content)
    .join("\n\n");
  return [
    { role: "system", content: systemContent },
    ...selected.transcript,
  ];
}

