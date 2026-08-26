 Claude Code Status Line Setup

Set up a custom status line in ~/.claude/settings.json and ~/.claude/statusline-command.sh with the following elements, all in grey (\033[90m), separated by two spaces:

1. Folder — current directory as ~/path/to/folder (tilde-substituted, not basename)
2. Git branch — shown when inside a git repo. Use the icon ⎇ in front of the main or branch
3. Context progress bar — visual ASCII bar + percentage + total tokens + compact mode, e.g. [████░░░░░░] 20.1% / 200k (auto). Read from .context_window.used_percentage, .context_window.total_tokens,
  .context_window.auto_compact
4. Model name — from .model.display_name
  All segments drop out gracefully if data isn't available. Wire it up in settings.json as:
  "statusLine": { "type": "command", "command": "bash ~/.claude/statusline-command.sh" }

