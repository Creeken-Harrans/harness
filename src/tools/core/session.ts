import type { Tool } from "../tool.js";

export function createSessionTools(): Tool[] {
  return [
    {
      name: "session_info",
      risk: "safe",
      description: "Get basic harness/session info such as current workspace, model, time, memory count, and session id.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run(_input, ctx) {
        const data = {
          now: new Date().toISOString(),
          runId: ctx.runId,
          tracePath: ctx.tracePath,
          workspace: ctx.workspace.root,
          model: ctx.config.model,
          thinking: ctx.config.thinking,
          approvalMode: ctx.config.approvalMode,
          agent: ctx.config.agent,
          sessionId: ctx.session?.id(),
          messageCount: ctx.session?.messageCount(),
          memoryCount: ctx.memory.count(),
        };
        return { ok: true, content: JSON.stringify(data, null, 2), data };
      },
    },
    {
      name: "get_session_info",
      risk: "safe",
      description: "Compatibility alias for session_info.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run(input, ctx) {
        return createSessionTools()[0].run(input, ctx);
      },
    },
  ];
}

