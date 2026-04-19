import fs from "node:fs/promises";
import path from "node:path";

import { isExcluded, isIncluded, normalizeRelativePath } from "./path-utils.js";

async function walkRecursive(
  workspaceRoot: string,
  currentRelativePath: string,
  includeDirectories: string[],
  excludeDirectories: string[],
  results: string[],
): Promise<void> {
  const absoluteDirectoryPath = path.join(workspaceRoot, currentRelativePath);
  const entries = await fs.readdir(absoluteDirectoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryRelativePath = normalizeRelativePath(
      path.join(currentRelativePath, entry.name),
    );

    if (isExcluded(entryRelativePath, excludeDirectories)) {
      continue;
    }

    if (entry.isDirectory()) {
      await walkRecursive(
        workspaceRoot,
        entryRelativePath,
        includeDirectories,
        excludeDirectories,
        results,
      );
      continue;
    }

    if (entry.isFile() && isIncluded(entryRelativePath, includeDirectories)) {
      results.push(entryRelativePath);
    }
  }
}

export async function listFiles(
  workspaceRoot: string,
  includeDirectories: string[],
  excludeDirectories: string[],
): Promise<string[]> {
  const results: string[] = [];
  await walkRecursive(workspaceRoot, "", includeDirectories, excludeDirectories, results);
  return results.sort((a, b) => a.localeCompare(b));
}
