import path from "node:path";
import { WorkspaceFileStore } from "./file-store.js";
import { WorkspacePathPolicy } from "./path-policy.js";

export class Workspace {
  readonly root: string;
  readonly policy: WorkspacePathPolicy;
  readonly files: WorkspaceFileStore;

  constructor(root: string) {
    this.root = path.resolve(root);
    this.policy = new WorkspacePathPolicy(this.root);
    this.files = new WorkspaceFileStore(this.policy);
  }

  resolvePath(inputPath = "."): string {
    return this.policy.assertInside(inputPath).absolutePath;
  }
}

