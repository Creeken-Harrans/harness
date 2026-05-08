export type SandboxStatus = {
  enabled: boolean;
  description: string;
};

export function currentSandboxStatus(): SandboxStatus {
  return {
    enabled: false,
    description: "No strong sandbox is active. The harness currently relies on approval prompts, hard command denials, and workspace path policy.",
  };
}

