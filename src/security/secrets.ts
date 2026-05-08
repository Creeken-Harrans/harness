import type { AppConfig } from "../config/config.js";

const GENERIC_SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /(?<=Authorization:\s*Bearer\s+)[A-Za-z0-9._-]{12,}/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function redactString(value: string, config?: Pick<AppConfig, "apiKey">): string {
  let out = value;
  if (config?.apiKey) {
    out = out.split(config.apiKey).join("[REDACTED_API_KEY]");
  }
  for (const pattern of GENERIC_SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED_SECRET]");
  }
  return out;
}

export function redactValue(value: unknown, config?: Pick<AppConfig, "apiKey">): unknown {
  if (typeof value === "string") return redactString(value, config);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, config));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (/api[_-]?key|authorization|token|secret|password|credential/i.test(key)) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = redactValue(nested, config);
      }
    }
    return output;
  }
  return value;
}

