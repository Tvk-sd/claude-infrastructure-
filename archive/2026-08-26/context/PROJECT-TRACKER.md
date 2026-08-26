# Claude Infrastructure — Tracker
**Status:** In Progress
**Last updated:** 2026-05-14

---

## How Claude should update this tracker

<!-- These rules apply during regular project sessions, not during the project-handoff skill execution itself. -->

Rules that apply in every session — follow automatically, no instruction needed:

1. **On task complete** → mark `[x]`, move item to `### Done` within the same stage block
2. **Ad-hoc tasks** → any work done mid-session that was not pre-tracked must be added to `### Done` immediately when shipped — do not leave untracked work out of the record
3. **Now is empty** → pull the top item from Next into Now
4. **Stage complete** → collapse the stage block to a one-line summary under `## Completed Stages`
5. **Done section > 8 items** → oldest items move to `CHANGELOG.md` (append entry, dated, 1–3 sentences)
6. **Update `Last updated`** at the end of every session that touches the tracker

---

## PM OS — Active

### Now
- [ ] Battle-test `/discover` on a real project — surface question-bank gaps and over-rigid MUST/MAY calls

### Next
- [ ] Add `/discover` entry to SKILL-NAVIGATOR.md — clarify when to use it vs `/conductor` vs `/brainstorm`
- [ ] Add `/discover handoff` sub-command — export clean brief for `/prd-writing`, `/conductor`, or stakeholders

### Later
- [ ] Tune phase-skip behavior — possibly stricter gating on Phase 1
- [ ] Review delegations after real use — confirm jtbd-analysis / ost-exploration / metrics-definition hand-offs feel seamless

### Done
- [x] Built `/discover` skill — 5-phase conversational problem-space PM OS (SKILL.md + 5 phase files + canvas template) — 2026-05-14

---

## Completed Stages
*(none yet)*

---

## Resume

**Prompt:** "Resume Claude Infrastructure. Read CLAUDE.md and PROJECT-TRACKER.md."

Key context:
- `/discover` skill lives at `~/.claude/skills/user/discover/` — SKILL.md (orchestrator/state machine), `phases/1-5*.md` (question banks), `templates/discovery-canvas.md` (living artifact)
- Design decisions: orchestrator delegates to existing skills; hybrid grill/draft rhythm; single living `discovery-canvas.md` output; resumes via `<!-- pending -->` cursor markers
- `/discover` is upstream of `/conductor` — problem-space discovery, not build-and-ship
- This project folder also holds: ops-agent, CC statusbar, infrastructure-status docs, conductor architecture analysis
- **Project SCAFFOLD** spun out to its own project on 2026-05-14 → `~/Projects/13 - project-scaffold` (repo: github.com/Tvk-sd/Project-SCAFFOLD). Track it there, not here.

---

## Session Log

<!-- Most recent entry at top. AI writes Situation, Action, Result and suggests Signal. Human owns the Signal. -->

### 2026-05-14 — Project SCAFFOLD spin-out
**Situation:** Session opened to push the three scaffolding skills to GitHub.
**Action:** Pushed project-setup/handoff/resume to github.com/Tvk-sd/Project-SCAFFOLD, grilled the philosophy of re-orientation, produced PHILOSOPHY.md Pass 1. Determined the work is a standalone project, not infrastructure — spun it out to its own repo, folder, CLAUDE.md, and tracker.
**Result:** Project SCAFFOLD now lives at `~/Projects/13 - project-scaffold`. Full detail tracked there.
**Signal:** Project SCAFFOLD has left infrastructure — track it in its own folder from now on.

### 2026-05-14
**Situation:** Session opened to design a lightweight, conversational PM "Discover OS" — distinct from `/conductor` — covering 12+ problem-space artifacts from context analysis through product vision canvas.
**Action:** Settled architecture via three decisions (orchestrator delegates to existing skills; hybrid grill/draft rhythm; single living canvas). Reframed phase "exit criteria" into question banks that guide the agent's grilling. Built the full skill: SKILL.md state machine, five phase files (Understand, Frame, Size, Position, Plan) as MUST/MAY question banks, and `discovery-canvas.md` template with pending-marker cursors.
**Result:** `/discover` skill is live and structurally complete — 13 artifacts across 5 phases, delegating to jtbd-analysis, ost-exploration, metrics-definition, user-research-synthesis.
**Signal:** The discover skill is separated from the conductor while still a part of it — test it separated.
