import fs from "node:fs/promises";
import path from "node:path";

import type { OpsAgentConfig, PassResult, PlannedAction } from "../types.js";
import { listFiles } from "../lib/fs-walk.js";

function shouldRemoveFile(filePath: string, config: OpsAgentConfig): boolean {
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName).toLowerCase();

  if (config.cleanup.junkFileNames.includes(fileName)) {
    return true;
  }

  return config.cleanup.tempFileExtensions.includes(extension);
}

export async function runCleanupPass(
  workspaceRoot: string,
  config: OpsAgentConfig,
  applyChanges: boolean,
): Promise<PassResult> {
  if (!config.cleanup.enabled) {
    return {
      name: "cleanup",
      actions: [],
      notes: ["Cleanup pass disabled in config."],
    };
  }

  const candidateFiles = await listFiles(
    workspaceRoot,
    config.cleanup.includeDirectories,
    config.cleanup.excludeDirectories,
  );

  const actions: PlannedAction[] = [];

  for (const relativePath of candidateFiles) {
    if (!shouldRemoveFile(relativePath, config)) {
      continue;
    }

    const action: PlannedAction = {
      kind: "delete",
      sourcePath: relativePath,
      reason: "Matched junk/temp file cleanup policy.",
      applied: false,
    };

    if (applyChanges) {
      try {
        await fs.unlink(path.join(workspaceRoot, relativePath));
        action.applied = true;
      } catch (error) {
        action.error = error instanceof Error ? error.message : String(error);
      }
    }

    actions.push(action);
  }

  return {
    name: "cleanup",
    actions,
    notes: [
      `Scanned ${candidateFiles.length} files.`,
      applyChanges
        ? "Applied cleanup actions where possible."
        : "Dry-run mode enabled; no files were deleted.",
    ],
  };
}
