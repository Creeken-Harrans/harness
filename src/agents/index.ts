import type { HarnessAgentName } from "../config/config.js";
import type { Agent } from "./agent.js";
import { CodingAgent } from "./coding-agent.js";
import { PlanExecuteAgent } from "./plan-execute-agent.js";
import { ReactAgent } from "./react-agent.js";
import { ReflectionAgent } from "./reflection-agent.js";
import { ResearchAgent } from "./research-agent.js";
import { SimpleAgent } from "./simple-agent.js";

export function createAgent(name: HarnessAgentName): Agent {
  switch (name) {
    case "react":
      return new ReactAgent();
    case "plan":
      return new PlanExecuteAgent();
    case "reflection":
      return new ReflectionAgent();
    case "coding":
      return new CodingAgent();
    case "research":
      return new ResearchAgent();
    case "simple":
    default:
      return new SimpleAgent();
  }
}

