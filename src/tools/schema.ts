import type { ToolDefinition } from "../types.js";
import { ToolRegistry } from "./registry.js";
import { createPhase2CoreTools } from "./core/index.js";

const compatibilityRegistry = new ToolRegistry();
for (const tool of createPhase2CoreTools()) compatibilityRegistry.register(tool);

/**
 * Deprecated compatibility export. Runtime code should use ToolRegistry directly.
 */
export const tools: ToolDefinition[] = compatibilityRegistry.exportDeepSeekTools();
