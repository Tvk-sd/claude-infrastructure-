export type ActionKind = "delete" | "move";

export interface PlannedAction {
  kind: ActionKind;
  sourcePath: string;
  targetPath?: string;
  reason: string;
  applied: boolean;
  error?: string;
}

export interface CleanupConfig {
  enabled: boolean;
  junkFileNames: string[];
  tempFileExtensions: string[];
  includeDirectories: string[];
  excludeDirectories: string[];
}

export interface OrganizationRule {
  name: string;
  matchExtensions?: string[];
  matchFileNames?: string[];
  destinationDirectory: string;
}

export interface OrganizationConfig {
  enabled: boolean;
  onlyTopLevelFiles: boolean;
  includeDirectories: string[];
  excludeDirectories: string[];
  rules: OrganizationRule[];
}

export interface StatusConfig {
  trackedDocs: string[];
}

export interface OpsAgentConfig {
  version: number;
  workspaceRoot: string;
  reportDirectory: string;
  latestReportPath: string;
  dryRun: boolean;
  cleanup: CleanupConfig;
  organization: OrganizationConfig;
  status: StatusConfig;
}

export interface PassResult {
  name: string;
  actions: PlannedAction[];
  notes: string[];
}

export interface InfrastructureSnapshot {
  generatedAt: string;
  branch: string;
  gitStatusShort: string[];
  trackedDocs: Array<{
    path: string;
    exists: boolean;
    modifiedAt: string | null;
  }>;
}
