# The 7 Options of the Claude Code Context Scaffolding Product

#scaffolding #context #contextanxiety #

1. GitHub repo (yours)
  A repo containing the scaffolding document template + pre-configured settings.json with hooks. People fork or clone it.

- Serves: developers primarily
- Shareable via: GitHub stars, READMEs, links
- Trade-off: high friction — requires someone to understand what they're installing before they install it

1. Article (yours)
  Written explanation of the three-layer model with the scaffolding concept as the centrepiece.

- Serves: PMs and thought leaders
- Shareable via: Substack, LinkedIn, HackerNews
- Trade-off: no install path — people read and move on without adopting anything

1. Claude Code plugin
  Packaged as an installable plugin in the Claude Code marketplace. One command installs the hooks and generates the scaffolding document in your project.

- Serves: power users
- Shareable via: plugin marketplace, discoverability is built in
- Trade-off: requires building to Claude Code's plugin spec; tightest coupling to one platform

1. A /init command
  A single slash command — /context-init — that when run in any project, asks 3 questions and generates the scaffolding document + configures the hooks. The wizard IS the product.

- Serves: all three audiences — low friction, no prior understanding required
- Shareable via: GitHub + article + word of mouth
- Trade-off: the output quality depends on the questions being right; requires careful design of the document format first

1. An RFC-style spec
  A specification document that defines the scaffolding format — what fields are required, what hooks must read/write, what the change log structure is. Others implement it
  however they want. Like a standard, not a tool.

- Serves: developers who want to build on top of it; positions you as the originator of a standard
- Shareable via: GitHub + article
- Trade-off: high intellectual investment upfront; only valuable if others actually adopt the spec

1. A minimal starter template
  A GitHub template repo — one CONTEXT.md file + one settings.json. "Use this template" button. Zero explanation required to start.

- Serves: power users who learn by doing
- Shareable via: GitHub template discovery, low barrier to fork
- Trade-off: without the concept framing, people use it without understanding it — adoption without comprehension

1. A concept video + companion repo
  A 5-minute walkthrough showing the problem (compaction kills state) and the solution (scaffolding + hooks) in action. The repo is the companion. The video is the distribution
  mechanism.

- Serves: all three — visual learners, PMs, and developers all get the same story
- Shareable via: YouTube, X/Twitter, LinkedIn
- Trade-off: highest production cost; gets stale as Claude Code evolves

---

  How They Stack as a Combination

  No single format serves all three audiences. The combinations that do:

  Minimum viable: Article (concept) + starter template (install path) — covers PMs and power users, low build cost

  Most complete: RFC spec (standard) + /init command (wizard) + article (concept) — covers all three, positions you as originator of the pattern not just a tool builder

  Highest leverage: Plugin (discoverability) + article (concept) — plugin gets found, article explains why it matters

---

  The question underneath all of this: do you want to be the person who built the tool, or the person who named the problem? Those lead to different primary formats.