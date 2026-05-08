#!/usr/bin/env node
import { startRepl } from "./cli/repl.js";

startRepl().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
