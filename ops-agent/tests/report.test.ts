import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { writeRunReport } from "../lib/report.js";
import type { InfrastructureSnapshot, PassResult } from "../types.js";

test("writeRunReport writes dated report and latest pointer", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ops-report-test-"));

  const results: PassResult[] = [
    {
      name: "cleanup",
      actions: [],
      notes: ["Scanned 2 files.", "Dry-run mode enabled; no files were deleted."],
    },
  ];

  const snapshot: InfrastructureSnapshot = {
    generatedAt: "2026-04-12T08:00:00.000Z",
    branch: "main",
    gitStatusShort: [],
    trackedDocs: [],
  };

  try {
    const output = await writeRunReport({
      workspaceRoot,
      reportDirectory: "reports/ops",
      latestReportPath: "reports/ops/latest.md",
      dryRun: true,
      results,
      snapshot,
    });

    const reportExists = await fs
      .stat(path.join(workspaceRoot, output.relativeReportPath))
      .then(() => true)
      .catch(() => false);
    assert.equal(reportExists, true);

    const latestContents = await fs.readFile(
      path.join(workspaceRoot, "reports/ops/latest.md"),
      "utf8",
    );
    assert.match(latestContents, /Latest run:/);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
