# Safety

This project is a learning and local automation harness. It is not a production sandbox.

## Active Controls

- Tool risk levels: safe, read, write, shell, network, dangerous.
- safe and read tools do not prompt by default.
- write, shell, and network tools are approval-gated unless HARNESS_APPROVAL_MODE=never.
- dangerous tools are denied unless HARNESS_ALLOW_DANGEROUS_TOOLS=true, and still require approval.
- Terminal has hard-deny patterns for obvious destructive commands.
- File, git, and patch tools are restricted to HARNESS_WORKSPACE.
- Path escape attempts are denied.
- Protected secret-like paths such as .env, SSH keys, tokens, and credentials are denied by default.
- Trace and trajectory writers redact API keys and common secret patterns.

## Not Provided

- No Docker, Firecracker, gVisor, or VM sandbox.
- No syscall filtering.
- No network isolation.
- No process tree control beyond shell timeout.
- No complete prompt-injection defense.
- No full DLP system.

## Practical Defaults

Use:

~~~bash
HARNESS_APPROVAL_MODE=shell
HARNESS_WORKSPACE=.
~~~

Avoid HARNESS_APPROVAL_MODE=never except in disposable workspaces.

