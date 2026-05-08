import type { StoredMessage } from "../messages/message.js";

export function summarizeMessages(messages: StoredMessage[], maxChars = 4000): string {
  const lines = messages.map((message) => {
    const content = typeof message.content === "string" ? message.content : "";
    return message.role + ": " + content.replace(/\s+/g, " ").trim();
  });
  const joined = lines.join("\n");
  if (joined.length <= maxChars) return joined;
  return joined.slice(0, Math.floor(maxChars * 0.7)) + "\n...[summary truncated]...\n" + joined.slice(-Math.floor(maxChars * 0.25));
}

