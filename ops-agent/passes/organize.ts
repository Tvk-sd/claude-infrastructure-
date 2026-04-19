import fs from "node:fs/promises";
import path from "node:path";

import { listFiles } from "../lib/fs-walk.js";
import { normalizeRelativePath } from "../lib/path-utils.js";
import type {
  OpsAgentConfig,
  OrganizationRule,
  PassResult,
  PlannedAction,
} from "../types.js";

function findMatchingRule(
  relativePath: string,
  rules: OrganizationRule[],
): OrganizationRule | null {
  const fileName = path.basename(relativePath);
  const extension = path.extname(fileName).toLowerCase();

  for (const rule of rules) {
    const extensionMatch =
      rule.matchExtensions?.map((item) => item.toLowerCase()).includes(extension) ?? false;
    const fileNameMatch = rule.matchFileNames?.includes(fileName) ?? false;

    if (extensionMatch || fileNameMatch) {
      return rule;
    }
  }

  return null;
}

function shouldSkipForTopLevel(relativePath: string, onlyTopLevelFiles: boolean): boolean {
  if (!onlyTopLevelFiles) {
    return false;
  }
  return relativePath.includes("/");
}

export async function runOrganizationPass(
  workspaceRoot: string,
  config: OpsAgentConfig,
  applyChanges: boolean,
): Promise<PassResult> {
  if (!config.organization.enabled) {
    return {
      name: "organization",
      actions: [],
      notes: ["Organization pass disabled in config."],
    };
  }

  const candidateFiles = await listFiles(
    workspaceRoot,
    config.organization.includeDirectories,
    config.organization.excludeDirectories,
  );

  const actions: PlannedAction[] = [];

  for (const relativePath of candidateFiles) {
    if (shouldSkipForTopLevel(relativePath, config.organization.onlyTopLevelFiles)) {
      continue;
    }

    const rule = findMatchingRule(relativePath, config.organization.rules);
    if (!rule) {
      continue;
    }

    const targetRelativePath = normalizeRelativePath(
      path.join(rule.destinationDirectory, path.basename(relativePath)),
    );

    if (targetRelativePath === relativePath) {
      continue;
    }

    const action: PlannedAction = {
      kind: "move",
      sourcePath: relativePath,
      targetPath: targetRelativePath,
      reason: `Matched organization rule: ${rule.name}`,
      applied: false,
    };

    if (applyChanges) {
      try {
        const destinationDirectory = path.dirname(
          path.join(workspaceRoot, targetRelativePath),
        );
        await fs.mkdir(destinationDirectory, { recursive: true });
        await fs.rename(
          path.join(workspaceRoot, relativePath),
          path.join(workspaceRoot, targetRelativePath),
        );
        action.applied = true;
      } catch (error) {
        action.error = error instanceof Error ? error.message : String(error);
      }
    }

    actions.push(action);
  }

  return {
    name: "organization",
    actions,
    notes: [
      `Scanned ${candidateFiles.length} files.`,
      applyChanges
        ? "Applied organization moves where possible."
        : "Dry-run mode enabled; no files were moved.",
    ],
  };
}
