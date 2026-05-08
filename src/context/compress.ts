export function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  const head = Math.floor(maxChars * 0.65);
  const tail = Math.max(0, maxChars - head - 80);
  return {
    text: text.slice(0, head) + "\n\n...[truncated " + (text.length - maxChars) + " chars]...\n\n" + text.slice(-tail),
    truncated: true,
  };
}

export function summarizeLongObservation(text: string, maxChars = 4000): string {
  return truncateText(text, maxChars).text;
}

