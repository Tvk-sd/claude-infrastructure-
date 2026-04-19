import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runCleanupPass } from "../passes/cleanup.js";
import { runOrganizationPass } from "../passes/organize.js";
import type { OpsAgentConfig } from "../types.js";

async function withTempWorkspace(
  callback: (workspaceRoot: string, config: OpsAgentConfig) => Promise<void>,
): Promise<void> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ops-agent-test-"));
  const config: OpsAgentConfig = {
    version: 1,
    workspaceRoot: ".",
    reportDirectory: "reports/ops",
    latestReportPath: "reports/ops/latest.md",
    dryRun: true,
    cleanup: {
      enabled: true,
      junkFileNames: [".DS_Store"],
      tempFileExtensions: [".tmp"],
      includeDirectories: ["."],
      excludeDirectories: [".git"],
    },
    organization: {
      enabled: true,
      onlyTopLevelFiles: true,
      includeDirectories: ["."],
      excludeDirectories: [".git", "logs"],
      rules: [
        {
          name: "Move logs",
          matchExtensions: [".log"],
          destinationDirectory: "logs",
        },
      ],
    },
    status: { trackedDocs: [] },
  };

  try {
    await callback(workspaceRoot, config);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
}

test("cleanup pass marks junk files in dry-run", async () => {
  await withTempWorkspace(async (workspaceRoot, config) => {
    await fs.writeFile(path.join(workspaceRoot, ".DS_Store"), "junk", "utf8");

    const result = await runCleanupPass(workspaceRoot, config, false);
    assert.equal(result.actions.length, 1);
    assert.equal(result.actions[0]?.kind, "delete");
    assert.equal(result.actions[0]?.applied, false);

    const stillExists = await fs
      .stat(path.join(workspaceRoot, ".DS_Store"))
      .then(() => true)
      .catch(() => false);
    assert.equal(stillExists, true);
  });
});

test("organization pass moves file in apply mode", async () => {
  await withTempWorkspace(async (workspaceRoot, config) => {
    await fs.writeFile(path.join(workspaceRoot, "app.log"), "hello", "utf8");

    const result = await runOrganizationPass(workspaceRoot, config, true);
    assert.equal(result.actions.length, 1);
    assert.equal(result.actions[0]?.kind, "move");
    assert.equal(result.actions[0]?.applied, true);
    assert.equal(result.actions[0]?.targetPath, "logs/app.log");

    const moved = await fs
      .stat(path.join(workspaceRoot, "logs", "app.log"))
      .then(() => true)
      .catch(() => false);
    assert.equal(moved, true);
  });
});
