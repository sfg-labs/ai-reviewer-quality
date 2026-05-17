# ai-reviewer-quality

AI PR reviewer focused on **code quality** — SOLID, complexity, dead code, clones, naming, docs, missing tests.

Consumed as a GitHub Action from any `sfg-labs` repo.

## What it does

On every PR (non-draft), this action:

1. Fetches the diff via the GitHub API
2. Runs **eslint**, **ts-prune**, **jscpd**, and **markdownlint** scoped to changed lines
3. Asks **Claude Sonnet 4.6** to reason about SOLID, naming, missing tests, accessibility, and TODO ownership
4. Aggregates + dedupes findings, honors `// ai-review-ignore: <RULE_ID>` suppression comments
5. Posts a single review with inline comments — **always COMMENT, never blocks merge**

## Use it

In any repo's `.github/workflows/ai-review.yml`:

```yaml
- uses: sfg-labs/ai-reviewer-quality@main
  with:
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    github-token:      ${{ secrets.GITHUB_TOKEN }}
```

See [`docs/INSTALL.md`](docs/INSTALL.md) for the 3-step install.

## Rule pack

13 starter rules, see [`docs/RULES.md`](docs/RULES.md) for the catalog. Each rule has its own Markdown file under [`src/rule-packs/`](src/rule-packs/) — citation URLs in PR comments link straight to those files.

## Verdict policy

| Concern | Verdict |
|---|---|
| quality (this repo) | **COMMENT only** — never blocks merge |
| [security](https://github.com/sfg-labs/ai-reviewer-security) | REQUEST_CHANGES on CRITICAL/HIGH |
| [qa](https://github.com/sfg-labs/ai-reviewer-qa) | REQUEST_CHANGES on coverage drop or breaking API |

## Develop

```bash
npm install
npm test            # ≥95% coverage
npm run build       # emits dist/index.js via @vercel/ncc
npm run lint
npm run typecheck
```

`dist/index.js` is **committed** — GitHub Actions consume the bundle directly without an `npm install` step.

## Built by

[Faith & Gamble IT × Suwalka Motors JV](https://github.com/sfg-labs) — `sfg-labs`.
