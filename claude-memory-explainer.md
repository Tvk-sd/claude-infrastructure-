# Claude Code Memory — How It Works

Claude Code's memory system gives Claude persistent knowledge across sessions. It has three distinct layers — one automatic, one global and intentional, one per-project. Together they cover everything from personal preferences to domain expertise to active project state.

---

## The problem it solves

Claude forgets everything when a session ends. By default, every new conversation starts from zero. The memory system changes that: Claude writes structured notes during a session, and loads them back at the start of the next one.

---

## The full memory stack

| Layer | File | Who writes | When loaded |
|---|---|---|---|
| Global instructions | `~/.claude/CLAUDE.md` | You | Every session |
| Global knowledge | `~/.claude/memory/general.md` | Claude | On demand |
| Domain knowledge | `~/.claude/memory/domain.md` | Claude (you flag) | On demand |
| Auto-memory index | `~/.claude/projects/.../MEMORY.md` | Claude | Every session |
| Auto-memory files | `feedback_build_process.md` etc. | Claude | On demand |
| Project briefing | `ProjectFolder/CLAUDE.md` | You | When in that project |
| Project state | `ProjectFolder/HANDOFF.md` | Claude + you | When in that project |

---

## Layer 1 — Global instructions

`~/.claude/CLAUDE.md` is your standing brief to Claude — who you are, how you work, what skills are installed, workflow rules. Written by you. Loaded every session, everywhere.

---

## Layer 2 — Global knowledge (intentional)

Two Claude-maintained files at `~/.claude/memory/`:

**`general.md`** — cross-project conventions, tool quirks, workflow preferences. Claude writes here automatically when something applies across all projects.

**`domain.md`** — staged domain knowledge: skills, products, projects. You trigger it with one phrase:

> "Add this to domain memory"

Claude writes a dated entry. Over time, when a section grows large enough, it gets packaged as a reusable skill. The memory entry becomes a pointer. The knowledge lives in the skill.

```
You flag it → Claude writes to domain.md
Section grows → packaged as a skill
Skill ships  → memory entry becomes a 1-line pointer
```

This is the **domain lifecycle** — the mechanism that turns hard-won session knowledge into reusable tools.

---

## Layer 3 — Auto-memory (reactive)

`~/.claude/projects/-Users-Till/memory/` — scoped to your working directory. Claude writes here automatically when it learns something non-obvious about you or your behaviour. No prompting needed.

### The index — MEMORY.md

Loaded at the start of every session (up to 200 lines). An index of what exists — not the knowledge itself.

```markdown
## Global Knowledge
- general.md — cross-project conventions, tool quirks
- domain.md  — domain knowledge staging

## Feedback
- feedback_build_process.md — scope gate, value checkpoints, fork protocol

## User
- user_conductor_preferences.md — OST framing, autopilot with control, design vocabulary
```

### Typed memory files

Each file has frontmatter declaring its type. The `description` field is what Claude reads to decide relevance before loading the full file.

```markdown
---
name: build process failures
description: Three lessons from a failed build session — scope, artifacts, forking
type: feedback
---

Don't let the build process optimise for artifacts over working behaviour...
```

### The 4 auto-memory types

| Type | What it stores | Claude writes it when… |
|---|---|---|
| `user` | Who you are, preferences, environment | Learning something about the person |
| `feedback` | How Claude should behave — corrections and confirmed approaches | You correct Claude, or an approach is validated |
| `project` | Active work context, decisions, deadlines | You share project state or goals |
| `reference` | Where things live in external systems | You mention a tool, board, or location |

### The write rule

Claude writes immediately when something non-obvious is learned — not at session end. Survives crashes, compaction, and new sessions.

---

## Layer 4 — Per-project memory (human-curated)

Every project folder has two files:

**`CLAUDE.md`** — the standing brief. Rules, stack decisions, design constraints. Written by you. Loaded every time Claude opens that folder.

**`HANDOFF.md`** — live session state. What's done, what's next, why decisions were made. Updated each session. Lets you resume cleanly days or weeks later.

```
ProjectFolder/
├── CLAUDE.md     ← standing brief (your instructions)
└── HANDOFF.md    ← live state (updated as you work)
```

---

## How this compares to Huryn's approach

Paweł Huryn's popular method uses a flat `memory.md` with `date / what / why` entries — written manually or by prompting Claude explicitly.

| | Huryn's approach | Auto-memory | Global knowledge | CLAUDE.md + HANDOFF.md |
|---|---|---|---|---|
| **Who writes** | You (manually) | Claude (automatically) | Claude (you flag) | You + Claude |
| **Format** | Flat text | Typed frontmatter | Flat markdown | Free-form markdown |
| **Scope** | Wherever you put it | Per working directory | Global | Per project folder |
| **Portability** | Shareable via GitHub | Local only | Local only | Travels with project |
| **Best for** | Cross-surface memory | Behaviour + preferences | Cross-project knowledge | Project context + state |

The real difference is intent. Huryn's is about what **you** want Claude to remember. Auto-memory is about what **Claude** notices. Global knowledge is about what **you flag as significant**. CLAUDE.md + HANDOFF.md is about briefing Claude on a specific project.

Most well-structured setups use all four.

---

## Limitations

- **All local** — nothing syncs across devices or surfaces (unlike Huryn's GitHub-shareable approach)
- **Scoped per working directory** — auto-memory from one project doesn't bleed into another
- **200-line index limit** — MEMORY.md is truncated after 200 lines; keep it as a pointer index, not the knowledge store itself
- **HANDOFF.md drifts if not updated** — only as good as the last session that maintained it
