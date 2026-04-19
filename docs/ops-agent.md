# Local Ops Cron Agent

This agent keeps the workspace clean, enforces lightweight file organization rules, and writes a dated infrastructure report on each run.

## Safety Model

- Default mode is dry-run.
- File changes happen only when both conditions are true:
  - CLI flag `--apply` is provided.
  - `dryRun` is set to `false` in `ops-agent/config.json`.

This two-gate design prevents accidental destructive changes.

## Configure

Edit `ops-agent/config.json`:

- `cleanup`: junk file names and temporary extensions to remove.
- `organization`: deterministic move rules to keep folders organized.
- `status.trackedDocs`: docs that should appear in every infrastructure report.
- `reportDirectory` and `latestReportPath`: where reports are written.

## Manual Commands

Install dependencies:

```bash
npm install
```

Run dry-run:

```bash
npm run ops:run
```

Run apply mode:

```bash
npm run ops:apply
```

Each run writes:

- A dated report in `reports/ops/ops-status-<timestamp>.md`
- A pointer file in `reports/ops/latest.md`

## launchd Schedule (macOS)

Template file:

- `ops-agent/launchd/com.claudeinfra.ops-agent.plist`

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

Logs:

- `reports/ops/launchd.out.log`
- `reports/ops/launchd.err.log`

## Verification Checklist

1. Run dry-run and confirm report is generated.
2. Confirm report lists planned actions as unchecked (`[ ]`).
3. Set `dryRun` to `false`, add `--apply`, run again.
4. Confirm only intended files are changed.
5. Review git diff before enabling scheduled apply mode.

