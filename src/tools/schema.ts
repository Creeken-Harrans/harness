import type { ToolDefinition } from "../types.js";

export const tools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "memory_add",
      description: "Persist a durable memory that will be available in later sessions. Use only for stable user preferences, project facts, or explicit remember requests.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The memory text to store. Keep it concise but self-contained.",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Optional short tags, e.g. ['typescript', 'preference'].",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "memory_search",
      description: "Search persistent memory for facts relevant to the current task.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
          limit: { type: "number", description: "Maximum number of memories to return. Default 8." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "shell_exec",
      description: "Run a shell command in the configured workspace. Prefer read-only inspection commands first. Requires user approval unless approvals are disabled.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Command to execute with bash -lc.",
          },
          cwd: {
            type: "string",
            description: "Optional working directory. Defaults to HARNESS_WORKSPACE.",
          },
          timeoutMs: {
            type: "number",
            description: "Optional timeout in milliseconds.",
          },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_session_info",
      description: "Get basic harness/session info such as current workspace and time.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];
