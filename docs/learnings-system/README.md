# The Learnings System — How It Works

A knowledge-management layer that turns one-off debugging pain into a **structured,
local, AI-crawlable corpus** of lessons that accumulates across every project.

It is the sibling of the [memory system](../claude-memory-explainer.md): memory
stores **facts to recall** ("this project uses X"); learnings store **retros and
patterns** ("this *kind* of bug bit me again — here's the shape of it").

---

## The problem it solves

You debug something non-obvious, understand it deeply for an hour, ship the fix —
and the insight evaporates. The next time the same *shape* of problem appears (in
a different project, months later), you rediscover it from scratch.

Notes in `CLAUDE.md` don't fix this: they're **unenforceable** (the model may or
may not follow the format) and **untestable** (you can't assert correctness). And
because they live per-project, they can't reveal that the same mistake recurred
elsewhere.

The learnings system fixes all three: a **fixed schema** enforced by a **testable
validator**, written to a **central corpus** that spans projects.

---

## The pieces

| Piece | Path | Role |
| --- | --- | --- |
| Skill | `~/.claude/skills/user/learnings/SKILL.md` | The capture procedure + schema + tag vocabulary; auto-triggers on phrases like "capture a learning", "/learn". |
| Validator | `~/.claude/skills/user/learnings/validate.py` | Dependency-free schema checker. Exit 0 = valid, 1 = invalid (issues printed). This is what makes the format *testable*. |
| Tests | `~/.claude/skills/user/learnings/tests/` | Golden fixtures (`valid.md` + `invalid-*.md`) and `run-tests.sh` asserting each one's exit code. |
| Vocabulary | `~/.claude/skills/user/learnings/vocabulary.txt` *(optional)* | One tag per line to extend the controlled vocabulary without editing code. |
| Corpus | `~/.claude/learnings/<project>.md` | One file per project. **Central and local-only** — never committed to a project repo, never pushed. |

---

## How it flows

```
You hit / resolve something non-obvious
        │
        │  "capture a learning"  (or /learn)
        ▼
Skill resolves the project slug → ~/.claude/learnings/<slug>.md
        │
        ▼
Writes a G<n> entry in the schema (symptom / root_cause / fix / pattern / …)
        │
        ▼
Runs validate.py  ──►  ✗ issues? fix and re-run
        │
        ▼ ✓
Confirmed: Saved + validated
        │
        ▼
(future) synthesize: crawl all ~/.claude/learnings/*.md → cluster recurring patterns
```

---

## The schema (schema_version 1)

Every file shares the same structure — that sameness is what lets a crawler
cluster "this happened again" instead of treating each file as a one-off.

**Frontmatter** (required): `type: learnings`, `schema_version: 1`, `project`,
`stack` (list), `date` (YYYY-MM-DD), `tags` (from the controlled vocabulary).

**Each gotcha** is a uniform block:

```markdown
### G1 — short title
- **tags:** animation-scope, state-management   # from the vocabulary
- **symptom:** what the human observed (no jargon)
- **root_cause:** the actual mechanism
- **fix:** what resolved it
- **pattern:** the transferable generalization   ← the clustering unit
- **severity:** low | med | high
```

The single most important field is **`pattern`**: it must be written to generalize
*beyond* the project. "Removed the withAnimation on the drawer" is a fix; "a global
animation swept an unrelated view into the transition — scope it" is a pattern. The
synthesizer (future) clusters on patterns, so a fix-shaped pattern is wasted.

---

## Why these design choices

- **Central store, not per-project.** Cross-project pattern detection is the whole
  point; a corpus fragmented across repos can't see itself. Living under
  `~/.claude/` also keeps it off every remote by construction.
- **Controlled tag vocabulary.** Free-text tags don't cluster. A shared, slowly-
  grown vocabulary is what makes "the same tag, in three projects" meaningful.
- **Testable validator over prose rules.** Prose in `CLAUDE.md` can't be asserted;
  a script with golden tests can. Run the tests anytime to prove the format holds.
- **Capture + validate first; synthesis deferred.** Locking the format before there's
  a corpus to synthesize is the right order — garbage-in would poison clustering.

---

## How to use it

In any project, say one of the triggers — **"capture a learning"**, **"log a
learning"**, **"record a gotcha"**, **"/learn"**, **"learnings retro"** — and
describe what bit you. The skill writes and validates the entry.

To check the format itself is sound:

```bash
bash ~/.claude/skills/user/learnings/tests/run-tests.sh
```

To validate a corpus file by hand:

```bash
python3 ~/.claude/skills/user/learnings/validate.py ~/.claude/learnings/<project>.md
```

---

## Status & roadmap

- **v1 (shipped):** capture + validate. Schema locked at `schema_version: 1`.
  First corpus file: `~/.claude/learnings/clock-timer.md`.
- **Next — synthesis:** a `synthesize` step that crawls `~/.claude/learnings/*.md`,
  clusters recurring `pattern` fields and tags, and surfaces "this recurs across N
  projects." This is the cross-project payoff and the reason the schema is strict.
- **Later — possible:** a severity/time-lost rollup; auto-suggest capture at the end
  of a debugging-heavy session; vocabulary curation as it grows.

---

## Relationship to the rest of the infrastructure

- [Memory system](../claude-memory-explainer.md) — facts to recall vs. (here)
  retros/patterns to learn from. A learnings entry that proves broadly useful can
  graduate into a memory pointer, mirroring how memory sections graduate into skills.
- Lives in the same `~/.claude/skills/user` skills library as the PM skills,
  following the same `SKILL.md` + `Progressive Updates` convention.
