# Memory Audit — V1.1 Gap Review

Date: 2026-03-26
Baseline: infrastructure-status.md (V1, 2026-03-25)

---

## Health Scores


| Layer                        | V1      | V1.1    | Delta    | Notes                                                  |
| ---------------------------- | ------- | ------- | -------- | ------------------------------------------------------ |
| Architecture design          | 100%    | 100%    | —        | Unchanged                                              |
| Global CLAUDE.md             | 80%     | 80%     | —        | Unchanged                                              |
| Skills system                | 80%     | 80%     | —        | Skill gotchas still mostly empty seeds                 |
| Memory system (design)       | 80%     | 80%     | —        | Unchanged                                              |
| Memory system (utilization)  | 40%     | 60%     | +20%     | general.md populated; home namespace rich              |
| Cross-project knowledge      | 20%     | 30%     | +10%     | general.md now has real content                        |
| Feedback capture             | 20%     | 40%     | +20%     | Home namespace substantially better; global still thin |
| Session continuity (HANDOFF) | 60%     | 60%     | —        | No change                                              |
| **Overall**                  | **55%** | **66%** | **+11%** | One day of deliberate maintenance                      |


**What moved the needle:** `general.md` populated (was empty); Session 2 confirmed done via git log (rename, .gitignore, memory sync committed); home namespace feedback grew to ~6 entries. Cross-project knowledge and session continuity unchanged.

---

## AutoDream Assessment

### What it is

AutoDream (beta, not officially announced) consolidates and reorganises Claude Code memory. 4 phases: Orientation → Signal Collection → Consolidation → Pruning & Indexing. Inspired by REM sleep — processes session transcripts, extracts patterns, resolves contradictions, updates indexes.

### Current status in your setup

- **Enabled:** `autoDreamEnabled: true` in `~/.claude/settings.json`
- **Has run:** LinkedIn Strategy project (confirmed via `.consolidate-lock` in prior session, 2026-03-25 ~20:22)
- **Has NOT run yet:** Global `~/.claude/memory/` — no lock file found
- **Trigger condition:** 24h since last consolidation + 5+ sessions

### Compatibility with existing architecture


| Your structure                                      | AutoDream fit  | Notes                                                                                                                                  |
| --------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Typed frontmatter (user/feedback/project/reference) | ✅ Excellent    | AutoDream uses metadata for intelligent pruning decisions                                                                              |
| One file per topic                                  | ✅ Excellent    | Can operate on entries individually without side effects                                                                               |
| MEMORY.md as pointer index                          | ⚠️ Risk        | Index is hand-maintained. AutoDream may prune a file without removing its pointer from MEMORY.md — broken pointer on next session load |
| global memory layer                                 | ⚠️ Not yet run | First run will process 7 entries. `project_pmos_audit.md` (completed 2026-03-16) is a prune candidate                                  |


### What AutoDream fixes (vs. your V1 gaps)

- **Feedback capture:** AutoDream mines session transcripts for corrections and confirmations — the capture that never happened manually now happens automatically
- **general.md population:** Signal collection would continue populating it across sessions without requiring end-of-session discipline
- **Stale entries:** Pruning phase catches dated references and resolved project states

### What AutoDream doesn't fix

- **Cross-project knowledge:** Operates per-project only. No mechanism to surface home-namespace knowledge in project sessions. 
  - This is where [general.md comes into play. It is the file that holds general cross project knowledge](http://general.md)
- **MEMORY.md index integrity:** The index is not a memory file — AutoDream may not know it's a pointer index. Risk of drift on first global run.
- **Session 3 (auto-memory proactivity):** AutoDream handles capture passively; Session 3 was about active mid-session feedback writing. These are complementary, not redundant.

---

## Priority Actions

### 1 — Protect MEMORY.md from AutoDream drift (immediate)

Add an explicit note to `~/.claude/CLAUDE.md` memory instructions:

> MEMORY.md is a hand-maintained pointer index — not a memory file. Do not let AutoDream treat it as consolidatable content. If AutoDream prunes a memory file, manually remove its entry from MEMORY.md.

This is the single structural vulnerability in the current setup.

### 2 — Update Session 3 memory entry (immediate)

Mark `project_skill_audit_2026_03_24.md` Session 3 as partially superseded. AutoDream now handles passive capture. The remaining gap is mid-session proactivity — a narrower problem.

### 3 — Let AutoDream run on global memory (passive)

The 7 global memory entries are clean enough. `project_pmos_audit.md` is a prune candidate (completed work, historical). Watch what AutoDream does on first run — specifically whether MEMORY.md is touched.

### 4 — Don't pre-fix `brainstorming-ideation` railroading

The deferred decision (wait for a real failure) was correct. Still hold.

---

## What V2 now looks like

- `general.md`: 8+ entries (currently 4 — AutoDream will grow this)
- Feedback: 6–8 global entries (AutoDream will backfill from transcripts)
- MEMORY.md integrity: protected via explicit instruction
- Cross-project knowledge: still unresolved — the one architectural gap AutoDream doesn't touch
- Session 3: redefined as "mid-session proactivity only" (passive capture now covered)

**Target overall: 75–80%** — achievable without any manual work once AutoDream runs on global memory.

---

*Supersedes: infrastructure-status.md V1 (2026-03-25). Next review: after AutoDream first runs on global memory.*