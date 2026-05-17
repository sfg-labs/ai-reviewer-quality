# Claude project-scoped agents — ai-reviewer-quality

This repo's `.claude/` directory only holds **settings + commands** for Claude Code.

Project-scoped **agents** live in the KOTA-PROJECT root checkout under `~/Downloads/KOTA-PROJECT/.claude/agents/`. Notably:

- `ai-reviewer-builder.md` — the agent that scaffolded this repo
- `repo-standardizer.md` — the agent that maintains the standard `.github/` + `.claude/` skeleton across all 23 sfg-labs repos

## Why split?

Agents are large Markdown specs. Duplicating them into every repo would create drift the moment one repo edited a spec. Keeping the agent catalog in the parent project and pulling settings per-repo gives us per-repo overrides without losing single-source-of-truth on the agent behaviour.

## How to use

```bash
cd ~/Downloads/KOTA-PROJECT
claude  # picks up the local agents/ catalog automatically
```

Then from inside Claude Code:

```
/agent ai-reviewer-builder
```
