# Claude Code Hooks — Reference Overview

> Source: [Official Docs](https://code.claude.com/docs/en/hooks) · Last verified: April 2026

Hooks are **shell commands (or HTTP/LLM calls) that Claude Code runs automatically** at specific lifecycle points. Unlike CLAUDE.md instructions — which Claude can deprioritize — hooks are executed by the harness. They are deterministic and always run.

---

## Mental Model

```
User message → [UserPromptSubmit hooks] → Claude thinks → [PreToolUse hooks] → Tool runs
→ [PostToolUse hooks] → Claude responds → [Stop hooks] → Session ends → [SessionEnd hooks]
```

Hooks can **observe**, **inject context**, **modify inputs**, or **block** at each stage.

---

## Scope Hierarchy

| Priority | Level | File | Shared? |
|----------|-------|------|---------|
| 1 (highest) | Managed | `/etc/claude-code/managed-settings.json` | All users on machine (IT) |
| 2 | Local | `.claude/settings.local.json` | You, this project only (gitignored) |
| 3 | Project | `.claude/settings.json` | All collaborators (committed) |
| 4 (lowest) | User | `~/.claude/settings.json` | You, all projects |

**Key behavior:** Hooks from all scopes fire sequentially — they accumulate, not override.  
`disableAllHooks: true` in user/project settings cannot disable managed hooks.

---

## All Hook Events

### Session Lifecycle (once per session)

| Event | When | Blocking | Matcher |
|-------|------|----------|---------|
| `SessionStart` | Session opens | No | `startup`, `resume`, `clear`, `compact` |
| `InstructionsLoaded` | CLAUDE.md files loaded | No | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact` |
| `SessionEnd` | Session closes | No | `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other` |
| `CwdChanged` | Working directory changes | No | None |
| `ConfigChange` | Settings file changes | Yes | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` |
| `FileChanged` | Watched file changes | No | Literal filenames (e.g. `.env\|.envrc`) |

### Turn Lifecycle (once per turn)

| Event | When | Blocking | Matcher |
|-------|------|----------|---------|
| `UserPromptSubmit` | Before Claude processes message | Yes | None |
| `Stop` | Claude finishes responding | Yes | None |
| `StopFailure` | API error during turn | No | `rate_limit`, `authentication_failed`, `billing_error`, `invalid_request`, `server_error`, `max_output_tokens`, `unknown` |
| `Notification` | Notification sent to user | No | `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog` |

### Tool Lifecycle (every tool call)

| Event | When | Blocking | Matcher |
|-------|------|----------|---------|
| `PreToolUse` | Before tool executes | Yes | Tool name (`Bash`, `Write`, `Edit`, `mcp__server__tool`, ...) |
| `PermissionRequest` | Permission dialog shown | Yes | Tool name |
| `PermissionDenied` | Auto-mode classifier denies | No | Tool name |
| `PostToolUse` | After tool succeeds | No | Tool name |
| `PostToolUseFailure` | After tool fails | No | Tool name |

### Agent & Task Lifecycle

| Event | When | Blocking | Matcher |
|-------|------|----------|---------|
| `SubagentStart` | Subagent spawned | No | Agent type (`Explore`, `Bash`, `Plan`, custom) |
| `SubagentStop` | Subagent finishes | Yes | Agent type |
| `TaskCreated` | Task creation | Yes | None |
| `TaskCompleted` | Task marked complete | Yes | None |
| `TeammateIdle` | Agent team member pauses | Yes | None |

### Worktree & Context

| Event | When | Blocking | Matcher |
|-------|------|----------|---------|
| `WorktreeCreate` | Worktree creation | Yes (any non-zero) | None |
| `WorktreeRemove` | Worktree removal | No | None |
| `PreCompact` | Before context compaction | Yes | `manual`, `auto` |
| `PostCompact` | After compaction | No | `manual`, `auto` |

### MCP / Elicitation

| Event | When | Blocking | Matcher |
|-------|------|----------|---------|
| `Elicitation` | MCP server requests user input | Yes | MCP server name |
| `ElicitationResult` | User responds to MCP input | Yes | MCP server name |

---

## Handler Types

| Type | How it works | Best for |
|------|-------------|---------|
| `command` | Shell script; receives JSON via stdin, returns JSON via stdout | Most use cases |
| `http` | POST to a URL; JSON in, JSON out | Remote services, team shared validation |
| `prompt` | Fast yes/no via Claude model | Natural language policy checks |
| `agent` | Spawns subagent with tool access | Complex multi-step verification |

### Command Handler Fields

```json
{
  "type": "command",
  "command": "path/to/script.sh",
  "shell": "bash",
  "timeout": 600,
  "statusMessage": "Spinner text while running...",
  "if": "Bash(git *)",
  "async": false
}
```

### Exit Code Behavior

| Code | Effect |
|------|--------|
| `0` | Success — parse JSON from stdout |
| `2` | **Hard block** — action prevented, stderr shown to user |
| Other | Non-blocking error — action proceeds, stderr logged |

---

## Matcher Syntax

| Pattern | Behavior | Example |
|---------|----------|---------|
| Omitted / `"*"` | Match all | Every tool use |
| Letters, digits, `_`, `\|` | Exact or pipe-separated list | `"Bash"`, `"Edit\|Write"` |
| Other characters | JavaScript regex | `"^Notebook"`, `"mcp__memory__.*"` |

**MCP tools:** `mcp__<server>__<tool>`
- All from one server: `mcp__memory__.*`
- Write tools from any server: `mcp__.*__write.*`

---

## JSON Output Schema

### Universal fields (any event)

```json
{
  "continue": false,
  "stopReason": "Message shown when continue=false",
  "suppressOutput": false,
  "systemMessage": "Injected into Claude's system context"
}
```

> Context injection (`systemMessage`, `additionalContext`, stdout) is capped at **10,000 characters**.

### Event-specific output patterns

#### PreToolUse — allow / deny / modify input

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "Shown to user",
    "updatedInput": { "command": "modified command" },
    "additionalContext": "Context for Claude"
  }
}
```

Precedence when multiple hooks respond: `deny` > `defer` > `ask` > `allow`

#### UserPromptSubmit / Stop / PostToolUse — block or allow

```json
{
  "decision": "block",
  "reason": "Why this is blocked"
}
```

#### SessionStart — inject context

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Loaded project state: phase 2 of 3"
  }
}
```

#### PermissionRequest — auto-approve with optional input modification

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow|deny",
      "updatedInput": { "command": "safer alternative" }
    }
  }
}
```

---

## Environment Variables

| Variable | Available | Description |
|----------|-----------|-------------|
| `CLAUDE_PROJECT_DIR` | All hooks | Absolute path to project root |
| `CLAUDE_PLUGIN_ROOT` | Plugin hooks | Plugin installation directory |
| `CLAUDE_PLUGIN_DATA` | Plugin hooks | Plugin persistent data directory |
| `CLAUDE_CODE_REMOTE` | All hooks | `"true"` in web environments |
| `CLAUDE_ENV_FILE` | `SessionStart`, `CwdChanged`, `FileChanged` | Write `export VAR=val` here to persist env vars into session |

### Setting session environment variables

```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
  echo 'export DEBUG=true' >> "$CLAUDE_ENV_FILE"
fi
```

---

## Configuration Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "MatcherValue|Or|Pipe",
        "hooks": [
          {
            "type": "command",
            "command": "path/to/script.sh",
            "timeout": 30,
            "statusMessage": "Running check..."
          }
        ]
      }
    ]
  }
}
```

---

## Common Patterns & Use Cases

### 1. Auto-memory: detect corrections in prompts (UserPromptSubmit)
Scan each message for correction-signal words. If found, inject a system message telling Claude to consider saving a feedback memory.

```json
"UserPromptSubmit": [{
  "hooks": [{
    "type": "command",
    "command": "cat | grep -qiE '(wrong|avoid|never|don.t|instead)' && echo '{\"systemMessage\": \"This may be a correction — check if it warrants a memory entry.\"}' || true"
  }]
}]
```

### 2. Session resume: detect in-progress state (SessionStart)
Check project files for state markers (conductor session, PR branch, phase tracker) and inject a resume prompt.

```json
"SessionStart": [{
  "hooks": [{
    "type": "command",
    "command": "[ -f CLAUDE.md ] && grep -q 'CONDUCTOR STATE' CLAUDE.md && echo '{\"systemMessage\": \"Active session detected — resume with /conductor\"}' || true"
  }]
}]
```

### 3. Guard rails: block destructive commands (PreToolUse)
Prevent `rm -rf` or other dangerous patterns from running without explicit approval.

```bash
#!/bin/bash
COMMAND=$(cat | jq -r '.tool_input.command')
if echo "$COMMAND" | grep -qE 'rm -rf|drop table|DELETE FROM'; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Destructive command blocked — confirm manually"}}'
fi
```

### 4. Auto-lint on write (PostToolUse)
After every file write, run a formatter or linter.

```json
"PostToolUse": [{
  "matcher": "Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/lint-on-write.sh",
    "timeout": 30
  }]
}]
```

### 5. Load env from .envrc (SessionStart + FileChanged)
Load project environment into Claude's session context, and reload when `.envrc` changes.

```bash
#!/bin/bash
if [ -f .envrc ] && [ -n "$CLAUDE_ENV_FILE" ]; then
  grep '^export ' .envrc >> "$CLAUDE_ENV_FILE"
fi
```

### 6. Block config changes without approval (ConfigChange)
Prevent settings files from being modified mid-session without review.

```json
"ConfigChange": [{
  "matcher": "project_settings|user_settings",
  "hooks": [{
    "type": "command",
    "command": "exit 2",
    "statusMessage": "Config changes require manual approval"
  }]
}]
```

### 7. Validate tasks before creation (TaskCreated)
Enforce task naming conventions or require descriptions.

```bash
#!/bin/bash
SUBJECT=$(cat | jq -r '.task_subject')
if [ ${#SUBJECT} -lt 10 ]; then
  echo "Task subject too short — be more specific." >&2
  exit 2
fi
```

---

## Disabling Hooks

```json
{ "disableAllHooks": true }
```

Note: Cannot disable managed (org-level) hooks from user or project settings.

View all active hooks and their source in Claude Code with `/hooks`.

---

## Plugin Hooks

Plugins can ship their own hooks in `hooks/hooks.json`. They activate when the plugin is enabled.

```json
{
  "description": "What this plugin's hooks do",
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh"
      }]
    }]
  }
}
```

---

## Sources

- [Hooks reference — code.claude.com](https://code.claude.com/docs/en/hooks)
- [Claude Code settings — code.claude.com](https://code.claude.com/docs/en/settings)
- [Claude Code Hooks Complete Guide (March 2026)](https://smartscope.blog/en/generative-ai/claude/claude-code-hooks-guide/)
- [Claude Code Hooks: A Practical Guide — DataCamp](https://www.datacamp.com/tutorial/claude-code-hooks)
