"""TerminalTool — safe terminal execution for chapter 9."""
import json
import subprocess
from typing import Dict, Any


class TerminalTool:
    def __init__(self, workspace=".", allowed_commands=None):
        self.workspace = workspace
        self.allowed_commands = allowed_commands or ["ls", "cat", "head", "tail",
            "wc", "find", "grep", "echo", "pwd", "python", "git", "du", "df"]

    def run(self, params):
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
