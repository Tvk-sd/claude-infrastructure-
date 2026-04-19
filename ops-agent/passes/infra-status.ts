import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { InfrastructureSnapshot, OpsAgentConfig } from "../types.js";

const execFileAsync = promisify(execFile);

async function readGitOutput(
  workspaceRoot: string,
  args: string[],
): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
    return stdout
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return ["git command unavailable or repository not ready"];
  }
}

async function buildTrackedDocs(
  workspaceRoot: string,
  config: OpsAgentConfig,
): Promise<InfrastructureSnapshot["trackedDocs"]> {
  const results: InfrastructureSnapshot["trackedDocs"] = [];

  for (const item of config.status.trackedDocs) {
    const absolutePath = path.join(workspaceRoot, item);
    try {
      const stat = await fs.stat(absolutePath);
      results.push({
        path: item,
        exists: true,
        modifiedAt: stat.mtime.toISOString(),
      });
    } catch {
      results.push({
        path: item,
        exists: false,
        modifiedAt: null,
      });
    }
  }

  return results;
}

export async function collectInfrastructureSnapshot(
  workspaceRoot: string,
  config: OpsAgentConfig,
): Promise<InfrastructureSnapshot> {
  const [branchLines, gitStatusShort, trackedDocs] = await Promise.all([
    readGitOutput(workspaceRoot, ["branch", "--show-current"]),
    readGitOutput(workspaceRoot, ["status", "--short"]),
    buildTrackedDocs(workspaceRoot, config),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    branch: branchLines[0] ?? "unknown",
    gitStatusShort,
    trackedDocs,
  };
}
