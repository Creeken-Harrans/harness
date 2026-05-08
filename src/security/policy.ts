export type SafetyBoundary = {
  name: string;
  description: string;
  productionSandbox: boolean;
};

export const WORKSPACE_POLICY_BOUNDARY: SafetyBoundary = {
  name: "workspace-path-policy",
  description: "File, git, and patch tools are constrained to HARNESS_WORKSPACE by path checks. This is not a kernel or container sandbox.",
  productionSandbox: false,
};

