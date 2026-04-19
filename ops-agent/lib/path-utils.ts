import path from "node:path";

export function normalizeRelativePath(inputPath: string): string {
  const normalized = path.normalize(inputPath).replaceAll("\\", "/");
  return normalized === "." ? "" : normalized.replace(/^\.\/+/, "");
}

export function isInDirectory(
  candidateRelativePath: string,
  directoryRelativePath: string,
): boolean {
  const candidate = normalizeRelativePath(candidateRelativePath);
  const directory = normalizeRelativePath(directoryRelativePath);

  if (directory === "" || directory === ".") {
    return true;
  }

  return candidate === directory || candidate.startsWith(`${directory}/`);
}

export function isExcluded(
  candidateRelativePath: string,
  excludedDirectories: string[],
): boolean {
  return excludedDirectories.some((entry) =>
    isInDirectory(candidateRelativePath, entry),
  );
}

export function isIncluded(
  candidateRelativePath: string,
  includedDirectories: string[],
): boolean {
  return includedDirectories.some((entry) =>
    isInDirectory(candidateRelativePath, entry),
  );
}
