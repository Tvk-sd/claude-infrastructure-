import test from "node:test";
import assert from "node:assert/strict";

import { validateConfig } from "../runner.js";
import type { OpsAgentConfig } from "../types.js";

function makeBaseConfig(): OpsAgentConfig {
  return {
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
      excludeDirectories: [".git"],
      rules: [
        {
          name: "Move logs",
          matchExtensions: [".log"],
          destinationDirectory: "logs",
        },
      ],
    },
    status: {
      trackedDocs: [],
    },
  };
}

test("validateConfig rejects absolute report paths", () => {
  const config = makeBaseConfig();
  config.reportDirectory = "/tmp/reports";

  assert.throws(() => validateConfig(config), /must be relative paths/);
});

test("validateConfig rejects absolute move destinations", () => {
  const config = makeBaseConfig();
  config.organization.rules[0]!.destinationDirectory = "/tmp/logs";

  assert.throws(() => validateConfig(config), /must be relative/);
});
