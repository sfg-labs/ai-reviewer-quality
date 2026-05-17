# ai-reviewer-quality — CLAUDE.md

> Operating notes for Claude Code working in this repository.

## Purpose

GitHub Action that reviews PRs for **code quality** concerns and posts inline comments. Sibling actions handle security (`ai-reviewer-security`) and QA (`ai-reviewer-qa`).

## Folder layout

```
action.yml                    GitHub Action manifest (node20, dist/index.js entry)
src/
  runner.ts                   entry point — wires inputs to pipeline
  types.ts                    Finding / ChangedFile / ReviewConfig / ReviewBundle
  config.ts                   load .github/ai-review.yml (per-repo overrides)
  version.ts                  RULE_PACK_VERSION + ANALYZER_VERSIONS constants
  aggregator.ts               dedupe / suppression / cap / verdict policy
  github/
    pr-diff.ts                octokit wrapper, parse-diff -> changedLines[]
    post-inline.ts            inline review comment builder + poster
    post-summary.ts           summary body renderer
  tools/
    exec.ts                   spawn-and-capture for CLIs
    eslint.ts                 parse eslint -f json output
    ts-prune.ts               parse ts-prune stdout
    jscpd.ts                  parse jscpd JSON report
    markdownlint.ts           parse markdownlint-cli2 JSON report
    runner.ts                 build + run all analyzers in parallel
  rule-packs/
    QUAL.<CATEGORY>.NNN.md    one Markdown file per rule
tests/
  *.spec.ts                   unit + integration tests (≥95% coverage)
  fixtures/                   captured PR diffs for integration tests
dist/
  index.js                    bundled runner (committed — GH Actions need it)
docs/
  RULES.md                    rule catalog
  INSTALL.md                  3-step install in any sfg-labs repo
```

## Hard rules

1. **Verdict is always `COMMENT`.** Quality reviewer never blocks merge — see `src/aggregator.ts::computeVerdict`.
2. **Findings scoped to changed lines only.** All analyzers filter against `ChangedFile.changedLines` before emitting.
3. **Cite every finding.** `rule_id` + `citation_url` pointing to `src/rule-packs/<RULE_ID>.md` at the tagged version.
4. **Reproducibility.** `rule_pack_version` and `analyzer_versions` are pinned in `src/version.ts` and stamped on every finding.
5. **Suppression.** Humans can write `// ai-review-ignore: <RULE_ID> — <reason>` on or above a line to suppress.
6. **Token budget.** Default 50K input tokens; over budget posts a polite skip comment.
7. **Bundled `dist/`.** Always re-run `npm run build` after edits to `src/` and commit `dist/index.js`. CI verifies the bundle is in sync.

## Adding a new rule

1. Add `src/rule-packs/QUAL.<CATEGORY>.NNN.md` (see existing files for shape).
2. Emit the rule_id from the corresponding `src/tools/*.ts` analyzer parser (deterministic-only — no LLM).
3. Add at least one fixture under `tests/fixtures/` and a test in `tests/`.
4. Bump `RULE_PACK_VERSION` in `src/version.ts` if the rule changes existing behaviour.
5. `npm test && npm run build` then commit.

## Don'ts

- Don't import `package.json` from runtime code (breaks the ncc bundle).
- Don't add a network call beyond the GitHub API. No LLM API calls — this reviewer is deterministic and free at runtime.
- Don't run real analyzers in this repo's own CI (would be recursive). Mock them in tests.
- Don't bump verdict severity logic — quality is advisory.
