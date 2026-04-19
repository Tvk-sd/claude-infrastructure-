#!/usr/bin/env node
import { runOpsAgent } from "./runner.js";

runOpsAgent(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`Ops agent failed: ${message}\n`);
  process.exitCode = 1;
});
