# Conductor V2 — Architecture Analysis

### Should it be broken into agents and hooks?

> Analysed: April 2026  
> Source: `/Users/Till/Projects/11 -Conductor/02 Conductor V2/commands/conductor.md` (v2.1.4, ~850 lines)

---

## Executive Summary

Yes — and the split is already partially visible in the code. The conductor is currently a **workflow engine running as a prompt**, which is architecturally fragile. Gate enforcement, state persistence, context monitoring, and phase routing are all implemented as Claude instructions — probabilistic behaviors that degrade as context grows. These are infrastructure jobs, not reasoning jobs. The refactor is a clean separation: **hooks handle the deterministic infrastructure, agents handle the PM reasoning, and the conductor becomes a slim orchestrator** rather than a monolith.

---

## What the Conductor Currently Does (Taxonomy)

Reading the 850-line skill file, the conductor performs seven distinct categories of work:


| Category               | Examples                                                            | Should be                          |
| ---------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| **PM reasoning**       | Q1/Q2/Q3, opportunity framing, design feedback, Three Amigos lenses | LLM (stays in conductor/agents)    |
| **Gate enforcement**   | "CRITICAL: Do NOT self-approve this gate"                           | Hook (deterministic)               |
| **State persistence**  | Writing CONDUCTOR STATE to CLAUDE.md                                | Hook (deterministic)               |
| **Context monitoring** | "Check approximate conversation length after each iteration"        | Hook (deterministic)               |
| **Session resume**     | Read CLAUDE.md at session start, inject phase state                 | Hook (deterministic)               |
| **Phase routing**      | Scope Zero → Specify → Design → Three Amigos → Build → Ship         | Agent per phase (isolated context) |
| **Skill invocation**   | `jtbd-analysis`, `art-direction`, `deploy-checklist`, etc.          | Already correct — stays as routing |


The problem: categories 2–5 are written as LLM instructions but behave deterministically when they work. When they fail, they fail silently.

---

## The Core Architectural Problem

The conductor tries to implement a **state machine** inside a prompt. State machines have three requirements: reliable state storage, reliable state transitions, and reliable guards on transitions. The conductor achieves none of these deterministically.

### Why gates fail

```
CRITICAL: Do NOT self-approve this gate. Do NOT say "Moving on to Specify" or similar.
Stop and wait for the human to explicitly say "approve", "yes", "continue", or equivalent.
```

This instruction appears four times in the conductor. It's there because Claude violates it. By the time context is 40–60% full, the instruction is competing with thousands of tokens of prior reasoning. The "CRITICAL" flag is a symptom — it's compensating for an architecture that can't enforce its own rules.

Gates are boolean checks: "did the human approve?" A grep on the last N tokens of the transcript is more reliable than asking Claude to remember.

### Why state persistence is fragile

The pause protocol has five explicit steps — including a "CRITICAL: Do NOT skip Step 1 or Step 2" instruction. The gotchas section already records one real failure: "Pause wrote CONDUCTOR STATE to CLAUDE.md but skipped context/PROJECT-TRACKER.md." This is a race condition between Claude's instruction-following and context pressure.

State writes are side effects. Side effects belong in hooks.

### Why context monitoring is unreliable

```
After each build iteration, check the approximate conversation length.
```

Claude estimates context length by "feel." A `Stop` hook can read the actual session transcript length. One is approximate, the other is precise.

---

## What Should Become Hooks

### 1. `SessionStart` — State injection (replace: "read CLAUDE.md at session start")

Currently: The conductor tells Claude to read CLAUDE.md and load CONDUCTOR STATE. Claude sometimes misses it, especially on resume.

As a hook: Read CONDUCTOR STATE deterministically, inject as `additionalContext` before Claude sees the first message. Config (stack, working dir, skip_phases) also loaded here.

```bash
#!/bin/bash
# Parse CONDUCTOR STATE block from CLAUDE.md
STATE=$(awk '/<!-- CONDUCTOR STATE/,/<!-- END CONDUCTOR STATE/' CLAUDE.md 2>/dev/null)
CONFIG=$(cat "${CLAUDE_SKILL_DIR}/config.json" 2>/dev/null)

if [ -n "$STATE" ]; then
  jq -n \
    --arg state "$STATE" \
    --arg config "$CONFIG" \
    '{"hookSpecificOutput": {"hookEventName": "SessionStart",
      "additionalContext": ("CONDUCTOR STATE (loaded from CLAUDE.md):\n" + $state + "\n\nProject config:\n" + $config)}}'
fi
```

**Why this matters:** Currently the SessionStart hook only detects whether a conductor session exists and surfaces a one-liner. A richer hook could inject the full phase state, design contract, acceptance criteria, and next step — making resume reliable even if Claude's context window is compressed.

---

### 2. `UserPromptSubmit` — Gate enforcement (replace: "CRITICAL: Do NOT self-approve")

Currently: Claude is told to wait for "approve", "yes", "continue" before passing a gate. Claude decides whether the gate is open.

As a hook: Scan the prompt for approval signals. If the conductor is waiting at a gate (readable from CONDUCTOR STATE), inject gate state into context explicitly.

```bash
#!/bin/bash
INPUT=$(cat)
PHASE=$(awk '/<!-- CONDUCTOR STATE/,/<!-- END CONDUCTOR STATE/' CLAUDE.md 2>/dev/null | grep "^Phase:" | head -1)
GATE_OPEN=$(echo "$PHASE" | grep -qiE "\-pending$" && echo "true" || echo "false")

if [ "$GATE_OPEN" = "true" ]; then
  APPROVAL=$(echo "$INPUT" | grep -qiE "^(approve|yes|continue|ok|go ahead|proceed)$" && echo "approved" || echo "not-yet")
  jq -n --arg phase "$PHASE" --arg approval "$APPROVAL" \
    '{"systemMessage": ("Gate status: " + $phase + " — human signal: " + $approval + ". Only advance phase if signal is approved.")}'
fi
```

**Why this matters:** Gate enforcement becomes a hybrid: the hook flags the gate state, Claude still makes the judgment call — but it now has explicit machine-readable context, not just its own memory of what the instructions said 400 tokens ago.

---

### 3. `Stop` — Context pressure warning + state validation

Currently: Claude is told to "check the approximate conversation length after each build iteration" and warn at 60%. This happens inconsistently.

As a hook: After each Claude response, measure transcript size and inject a warning when threshold is crossed. Also validate that if a gate block appeared in the response, CONDUCTOR STATE was updated.

```bash
#!/bin/bash
TRANSCRIPT_SIZE=$(wc -c < "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)
THRESHOLD=80000  # ~60% of typical context window

if [ "$TRANSCRIPT_SIZE" -gt "$THRESHOLD" ]; then
  jq -n '{"systemMessage": "CONTEXT WARNING: Session transcript is large. Recommend pausing now before auto-compact — say pause to save state cleanly."}'
fi
```

**Why this matters:** The current instruction relies on Claude noticing its own context pressure, which is the worst time to rely on Claude's self-awareness. A hook fires reliably regardless of context fullness.

---

### 4. `PostToolUse` on Write — State write validation

Currently: When Claude writes CLAUDE.md, there's no validation that the CONDUCTOR STATE block is correctly formed.

As a hook: After every Write to CLAUDE.md, verify the state block exists and is well-formed.

```bash
#!/bin/bash
FILE=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.file_path')

if echo "$FILE" | grep -q "CLAUDE.md"; then
  HAS_STATE=$(grep -c "CONDUCTOR STATE" "$FILE" 2>/dev/null || echo 0)
  if [ "$HAS_STATE" -lt 2 ]; then
    jq -n '{"systemMessage": "Warning: CLAUDE.md was written but CONDUCTOR STATE block is missing or malformed. Write it before closing."}'
  fi
fi
```

---

## What Should Become Agents (Beyond Scope Zero)

Scope Zero is already correctly extracted as `conductor-scope-zero.md`. The pattern should extend to all six phases.

### Why per-phase agents?

Each phase has a natural context boundary. When you're in Three Amigos, you don't need Scope Zero's Q1/Q2/Q3 reasoning in context. When you're in Build, you don't need Design's wireframe review loop. The conductor currently carries all six phases in one 850-line context block — by the time you reach Build, the early phases are competing for attention.

Per-phase agents give each phase:

- Clean context at spawn (only phase-relevant instructions)
- Smaller, more reliable instruction set
- Ability to run in parallel (Stage 2 Specify while Stage 1 ships)
- Isolated failure modes (a broken Build agent doesn't corrupt Specify)

### Proposed agent map


| Phase        | Agent name                  | Tools                            | Returns                                  |
| ------------ | --------------------------- | -------------------------------- | ---------------------------------------- |
| Scope Zero   | `pm-os:scope-zero` (exists) | Read, Grep, Glob                 | Gate 1 artifact                          |
| Specify      | `pm-os:specify`             | Read, Write                      | Gate 2 artifact + staging                |
| Design       | `pm-os:design`              | Read, Write, Bash (browser open) | Gate 3 artifact + Three Amigos agenda    |
| Three Amigos | `pm-os:three-amigos`        | Read, Write                      | Gate 4 artifact + locked contract        |
| Build        | `pm-os:build`               | All (full build access)          | Stage 1 complete + acceptance criteria ✅ |
| Ship         | `pm-os:ship`                | Read, Write, Bash                | Handoff packet                           |


The conductor command (`/conductor`) becomes an orchestrator: read state, determine current phase, spawn the right agent, receive the gate artifact, persist state, wait for human approval, spawn next agent.

### What the slim orchestrator does

```
/conductor
  → read CONDUCTOR STATE (via SessionStart hook or direct read)
  → determine phase
  → spawn phase agent with current context (outcome, contract, acceptance criteria)
  → receive gate artifact
  → write CONDUCTOR STATE (validated by PostToolUse hook)
  → present gate to human
  → wait for approval (enforced by UserPromptSubmit hook)
  → spawn next phase agent
```

The orchestrator's instruction set drops from ~850 lines to ~100: phase map, agent routing table, state format, gate presentation template.

---

## What Should Stay as It Is


| Element                                                       | Why it stays                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| The 23 leaf skills (jtbd-analysis, art-direction, etc.)       | Already correct leaf nodes — standalone and conductor-triggerable |
| Skill routing inside phases                                   | LLM judgment (fuzzy job → jtbd-analysis) — not deterministic      |
| PM reasoning (Q1/Q2/Q3, design feedback, Three Amigos lenses) | Core LLM value — cannot and should not be mechanized              |
| The three-file pattern (CLAUDE.md / HANDOFF.md / CONCEPT.md)  | Correct, just needs deterministic writes                          |
| Design path selection (A/B/C)                                 | LLM decision with human input                                     |
| Worktree and delegate patterns                                | Already pattern-documented, work correctly                        |


---

## Risk: What Could Go Wrong in the Refactor


| Risk                                                                 | Mitigation                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Agents spawn with insufficient context (no design contract in scope) | Orchestrator explicitly passes gate artifacts as agent prompt context    |
| Hooks fire in non-conductor sessions                                 | Scope hooks to `SessionStart` with CONDUCTOR STATE existence check       |
| Phase agents diverge from conductor rules                            | Single shared rules file loaded into each agent — don't duplicate        |
| Gate state becomes inconsistent across agent handoffs                | CONDUCTOR STATE is the single source of truth; hooks validate writes     |
| Parallel phase agents conflict                                       | Worktrees already isolate branches — each worktree has its own CLAUDE.md |


---

## Prioritised Next Steps

**High value, low effort:**

1. Enhance the `SessionStart` hook to inject full CONDUCTOR STATE (not just a one-liner)
2. Add a `Stop` hook for context pressure warnings (replace the inline instruction)
3. Add a `PostToolUse` Write hook to validate CONDUCTOR STATE writes

**Medium value, medium effort:**
4. Extract Specify as `pm-os:specify` agent (highest frequency phase, most instruction-heavy after Scope Zero)
5. Extract Three Amigos as `pm-os:three-amigos` agent (most structured, clearest context boundary)

**High value, higher effort:**
6. Extract Build as `pm-os:build` agent (longest phase, most context-hungry, highest failure risk)
7. Slim the orchestrator to ~100 lines once all phases are agents

**Signals that you've succeeded:**

- The "CRITICAL: Do NOT self-approve" instructions disappear from the conductor
- The gotchas section shrinks (failures become infrastructure, not prompting)
- Context at gate 4 (Three Amigos → Build) is under 30% instead of 60–80%

---

## Current vs. Target Architecture

```
CURRENT
conductor.md (~850 lines)
├── Config read/write logic
├── Phase 1 — Scope Zero instructions
├── Phase 2 — Specify instructions
├── Phase 3 — Design instructions (with Figma-first guard, plan mode guard, path A/B/C)
├── Phase 4 — Three Amigos instructions (lenses, agenda, contract)
├── Phase 5 — Build instructions (proposal pattern, review loop, contract change rule)
├── Phase 6 — Ship instructions (delivery types, path routing)
├── CONDUCTOR STATE format
├── Rules (7 rules including "CRITICAL" gate enforcement)
├── Parallel patterns (worktrees + delegate)
└── Gotchas

TARGET
conductor.md (~100 lines — orchestrator only)
├── Phase routing table
├── Agent spawn map
└── State format

agents/
├── scope-zero.md ✅ (exists)
├── specify.md
├── design.md
├── three-amigos.md
├── build.md
└── ship.md

hooks/ (in ~/.claude/settings.json or .claude/settings.json)
├── SessionStart: inject CONDUCTOR STATE + config
├── UserPromptSubmit: gate state awareness
├── Stop: context pressure warning + state validation
└── PostToolUse(Write): validate CONDUCTOR STATE writes
```

---

## Sources & References

- Conductor V2 command: `/Users/Till/Projects/11 -Conductor/02 Conductor V2/commands/conductor.md`
- Scope Zero agent: `/Users/Till/Projects/11 -Conductor/02 Conductor V2/agents/conductor-scope-zero.md`
- Design decisions: `/Users/Till/Projects/11 -Conductor/02 Conductor V2/HANDOFF.md`
- Concept & principles: `/Users/Till/Projects/11 -Conductor/02 Conductor V2/CONCEPT.md`
- Hooks reference: `docs/hooks-reference.md` (this repo)

