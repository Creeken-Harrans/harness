"""TerminalTool — safe terminal execution for chapter 9."""
import json
import subprocess
from .base import LightweightTool


class TerminalTool(LightweightTool):
    def __init__(self, workspace=".", allowed_commands=None, **kwargs):
        super().__init__(name="terminal", description="Terminal execution tool")
        self.workspace = kwargs.pop("workspace", workspace)
        self.allowed_commands = allowed_commands or ["ls", "cat", "head", "tail",
            "wc", "find", "grep", "echo", "pwd", "python", "git", "du", "df"]
        self._timeout = kwargs.pop("timeout", 30)
        self._extra_config = kwargs

    # 教程兼容：run 简化签名故意与 Tool 基类不同，接受 str|dict 并返回 str
    def run(self, params):  # type: ignore[override]  # 教程简化协议：run() 返回 str 而非 ToolResponse
        if isinstance(params, str):
            params = {"action": "execute", "command": params}
        action = params.get("action", "execute")
        if action == "execute":
            cmd = params.get("command", "")
            if not cmd:
                return json.dumps({"error": "no command provided"})
            cmd_name = cmd.split()[0]
            if cmd_name not in self.allowed_commands:
                return json.dumps({"error": f"command '{cmd_name}' not allowed. "
                                     f"Allowed: {self.allowed_commands}"})
            try:
                result = subprocess.run(cmd, shell=True, capture_output=True,
                                        text=True, timeout=30, cwd=self.workspace)
                return json.dumps({"stdout": result.stdout[:2000],
                                   "stderr": result.stderr[:1000],
                                   "returncode": result.returncode})
            except subprocess.TimeoutExpired:
                return json.dumps({"error": "command timed out"})
            except Exception as e:
                return json.dumps({"error": str(e)})
        elif action == "set_workspace":
            self.workspace = params.get("path", self.workspace)
            return json.dumps({"status": "ok", "workspace": self.workspace})
        return json.dumps({"error": f"unknown action: {action}"})
