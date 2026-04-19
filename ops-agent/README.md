# Ops Agent

A local cron-style maintenance agent for the `claude-infrastructure` workspace. On each run it performs three passes — cleanup, organization, and infrastructure snapshot — then writes a dated markdown report.

## What it does


| Pass             | What it does                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------- |
| **cleanup**      | Deletes junk files (`.DS_Store`, `Thumbs.db`) and temp extensions (`.tmp`, `.bak`, etc.) |
| **organize**     | Moves files matching configured rules to target directories (e.g. `.log` → `logs/`)      |
| **infra-status** | Snapshots current git branch, working-tree status, and tracked doc freshness             |


Every run writes:

- A dated report: `reports/ops/ops-status-<timestamp>.md`
- A pointer to the latest: `reports/ops/latest.md`

## Folder structure

```
ops-agent/
├── cli.ts              # Entry point — parses args, calls runner
├── runner.ts           # Orchestrates all three passes
├── types.ts            # Shared TypeScript types
├── config.json         # Runtime configuration (edit this)
├── passes/
│   ├── cleanup.ts      # Junk/temp file removal pass
│   ├── organize.ts     # File-move rules pass
│   └── infra-status.ts # Git + tracked-doc snapshot pass
├── lib/
│   ├── report.ts       # Renders and writes markdown reports
│   ├── fs-walk.ts      # Recursive file walker with include/exclude
│   └── path-utils.ts   # Path normalization helpers
├── tests/
│   ├── cleanup-and-organization.test.ts
│   ├── guardrails.test.ts
│   └── report.test.ts
└── launchd/
    └── com.claudeinfra.ops-agent.plist  # macOS scheduler template
```

## Safety model

Default mode is always **dry-run** — no files are touched unless both conditions are true:

1. CLI flag `--apply` is passed
2. `dryRun` is set to `false` in `config.json`

This two-gate design prevents accidental destructive changes.

## Usage

Install dependencies (from workspace root):

```bash
npm install
```

Preview what would happen (dry-run, default):

```bash
npm run ops:run
```

Apply changes:

```bash
npm run ops:apply
```

Run tests:

```bash
npm test
```

Type-check:

```bash
npm run typecheck
```

## Configuration

Edit `ops-agent/config.json`:

```json
{
  "dryRun": true,                    // master dry-run switch
  "cleanup": {
    "enabled": true,
    "junkFileNames": [".DS_Store"],  // exact filenames to delete
    "tempFileExtensions": [".tmp"],  // extensions to delete
    "includeDirectories": ["."],     // where to scan
    "excludeDirectories": [".git", "node_modules"]
  },
  "organization": {
    "enabled": true,
    "onlyTopLevelFiles": true,       // only move root-level files
    "rules": [
      {
        "name": "Move plain logs",
        "matchExtensions": [".log"],
        "destinationDirectory": "logs"
      }
    ]
  },
  "status": {
    "trackedDocs": [                 // docs listed in every report
      "infrastructure-status-v1.1.md"
    ]
  }
}
```

## Scheduled runs (macOS launchd)

The `launchd/` folder contains a plist template that runs the agent daily at 08:00.

Install:

```bash
mkdir -p ~/Library/LaunchAgents
cp ops-agent/launchd/com.claudeinfra.ops-agent.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.claudeinfra.ops-agent.plist
```

Unload:

```bash
launchctl unload ~/Library/LaunchAgents/com.claudeinfra.ops-agent.plist
rm ~/Library/LaunchAgents/com.claudeinfra.ops-agent.plist
```

Launchd logs land in `reports/ops/launchd.out.log` and `reports/ops/launchd.err.log`.

## Verification checklist

1. Run `npm run ops:run` and confirm a report is generated in `reports/ops/`
2. Confirm planned actions show as unchecked `[ ]` in the report
3. Set `dryRun: false` in `config.json` and run `npm run ops:apply`
4. Confirm only intended files were changed
5. Review `git diff` before enabling the scheduled apply mode

