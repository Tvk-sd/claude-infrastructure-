import fs from "node:fs/promises";
import path from "node:path";

import type { InfrastructureSnapshot, PassResult, PlannedAction } from "../types.js";

function renderActionLine(action: PlannedAction): string {
  if (action.kind === "delete") {
    return `- [${action.applied ? "x" : " "}] delete \`${action.sourcePath}\` — ${action.reason}${action.error ? ` (error: ${action.error})` : ""}`;
  }

  return `- [${action.applied ? "x" : " "}] move \`${action.sourcePath}\` -> \`${action.targetPath}\` — ${action.reason}${action.error ? ` (error: ${action.error})` : ""}`;
}

function renderPassSection(result: PassResult): string[] {
  const lines: string[] = [];
  lines.push(`## ${result.name}`);
  lines.push("");
  lines.push(...result.notes.map((note) => `- ${note}`));
  lines.push("");

  if (result.actions.length === 0) {
    lines.push("- No actions detected.");
  } else {
    lines.push(...result.actions.map(renderActionLine));
  }

  lines.push("");
  return lines;
}

function renderTrackedDocs(snapshot: InfrastructureSnapshot): string[] {
  const lines: string[] = [];
  lines.push("## Infrastructure Snapshot");
  lines.push("");
  lines.push(`- Generated: ${snapshot.generatedAt}`);
  lines.push(`- Branch: \`${snapshot.branch}\``);
  lines.push("");
  lines.push("### Git status (short)");
  lines.push("");

  if (snapshot.gitStatusShort.length === 0) {
    lines.push("- Working tree clean.");
  } else {
    lines.push(...snapshot.gitStatusShort.map((line) => `- \`${line}\``));
  }

  lines.push("");
  lines.push("### Tracked documents");
  lines.push("");
  lines.push("| Path | Exists | Last Modified |");
  lines.push("|---|---|---|");
  for (const doc of snapshot.trackedDocs) {
    lines.push(`| \`${doc.path}\` | ${doc.exists ? "yes" : "no"} | ${doc.modifiedAt ?? "-"} |`);
  }
  lines.push("");
  return lines;
}

export async function writeRunReport(params: {
  workspaceRoot: string;
  reportDirectory: string;
  latestReportPath: string;
  dryRun: boolean;
  results: PassResult[];
  snapshot: InfrastructureSnapshot;
}): Promise<{ absoluteReportPath: string; relativeReportPath: string }> {
  const date = new Date();
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}-${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(date.getUTCSeconds()).padStart(2, "0")}Z`;
  const fileName = `ops-status-${stamp}.md`;
  const relativeReportPath = path.join(params.reportDirectory, fileName);
  const absoluteReportPath = path.join(params.workspaceRoot, relativeReportPath);

  await fs.mkdir(path.dirname(absoluteReportPath), { recursive: true });

  const lines: string[] = [];
  lines.push(`# Ops Cron Report`);
  lines.push("");
  lines.push(`- Mode: ${params.dryRun ? "dry-run" : "apply"}`);
  lines.push(`- Timestamp: ${params.snapshot.generatedAt}`);
  lines.push("");

  for (const result of params.results) {
    lines.push(...renderPassSection(result));
  }

  lines.push(...renderTrackedDocs(params.snapshot));
  await fs.writeFile(absoluteReportPath, `${lines.join("\n")}\n`, "utf8");

  const latestAbsolutePath = path.join(params.workspaceRoot, params.latestReportPath);
  await fs.mkdir(path.dirname(latestAbsolutePath), { recursive: true });
  await fs.writeFile(
    latestAbsolutePath,
    `# Latest Ops Report\n\n- Latest run: \`${relativeReportPath.replaceAll("\\", "/")}\`\n`,
    "utf8",
  );

  return {
    absoluteReportPath,
    relativeReportPath: relativeReportPath.replaceAll("\\", "/"),
  };
}
