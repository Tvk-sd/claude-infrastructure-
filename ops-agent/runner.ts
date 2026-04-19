import fs from "node:fs/promises";
import path from "node:path";

import { writeRunReport } from "./lib/report.js";
import { runCleanupPass } from "./passes/cleanup.js";
import { collectInfrastructureSnapshot } from "./passes/infra-status.js";
import { runOrganizationPass } from "./passes/organize.js";
import type { OpsAgentConfig } from "./types.js";

async function readConfig(configPath: string): Promise<OpsAgentConfig> {
  const raw = await fs.readFile(configPath, "utf8");
  return JSON.parse(raw) as OpsAgentConfig;
}

export function validateConfig(config: OpsAgentConfig): void {
  if (config.version <= 0) {
    throw new Error("Invalid config version.");
  }

  for (const destination of config.organization.rules.map(
    (rule) => rule.destinationDirectory,
  )) {
    if (path.isAbsolute(destination)) {
      throw new Error(`Organization rule destination must be relative: ${destination}`);
    }
  }

  if (path.isAbsolute(config.reportDirectory) || path.isAbsolute(config.latestReportPath)) {
    throw new Error("reportDirectory and latestReportPath must be relative paths.");
  }
}

function parseArgs(args: string[]): { applyChanges: boolean; configPath: string } {
  let applyChanges = false;
  let configPath = "ops-agent/config.json";

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--apply") {
      applyChanges = true;
    }
    if (value === "--config" && args[index + 1]) {
      configPath = args[index + 1];
      index += 1;
    }
  }

  return { applyChanges, configPath };
}

export async function runOpsAgent(args: string[]): Promise<void> {
  const { applyChanges, configPath } = parseArgs(args);
  const workspaceRoot = process.cwd();
  const config = await readConfig(path.join(workspaceRoot, configPath));
  validateConfig(config);
  const shouldApply = applyChanges && !config.dryRun;

  const cleanupResult = await runCleanupPass(workspaceRoot, config, shouldApply);
  const organizationResult = await runOrganizationPass(workspaceRoot, config, shouldApply);
  const snapshot = await collectInfrastructureSnapshot(workspaceRoot, config);
  const reportOutput = await writeRunReport({
    workspaceRoot,
    reportDirectory: config.reportDirectory,
    latestReportPath: config.latestReportPath,
    dryRun: !shouldApply,
    results: [cleanupResult, organizationResult],
    snapshot,
  });

  const modeMessage = shouldApply
    ? "Changes were applied."
    : "Dry-run mode: no file modifications performed.";

  process.stdout.write(`Ops agent run complete. ${modeMessage}\n`);
  process.stdout.write(`Report: ${reportOutput.relativeReportPath}\n`);
}
