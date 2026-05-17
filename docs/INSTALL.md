# Install — 2 steps

Deterministic-only. **No `ANTHROPIC_API_KEY` required** — this action runs
pure static analysis at $0/PR.

## 1. Add `.github/workflows/ai-review.yml`

```yaml
name: ai-review
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  quality:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    continue-on-error: true   # quality is advisory, never blocks
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: sfg-labs/ai-reviewer-quality@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

`GITHUB_TOKEN` is provided automatically by GitHub Actions — no setup needed.

(If you adopted the `repo-standardizer` scaffold, this file already exists.)

## 2. (Optional) Add `.github/ai-review.yml` for per-repo overrides

```yaml
quality:
  enabled: true
  exclude_paths:
    - 'legacy/**'
    - 'vendor/**'
  rules:
    QUAL.NAMING.001:
      enabled: false
```

That's it. Open a PR — the action runs on push to the PR branch and posts a single review with inline comments.

## Inputs

| Input | Required | Default | Notes |
|---|---|---|---|
| `github-token` | yes | — | Pass `${{ secrets.GITHUB_TOKEN }}`. |
| `config-path` | no | `.github/ai-review.yml` | Path in the target repo. |
| `max-tokens` | no | `50000` | Hard cap on input tokens; over budget posts a polite skip comment. |

## Outputs

| Output | Notes |
|---|---|
| `verdict` | Always `COMMENT` (quality never blocks merge). |
| `finding-count` | Total findings after dedupe + suppression. |

## Troubleshooting

- **"PR exceeds the 50000-token budget"** — split the PR into smaller pieces, or bump `max-tokens` in the workflow.
- **"Quality review disabled via ai-review.yml — skipping."** — your repo set `quality.enabled: false`.
- **No comments appear** — confirm the PR isn't a draft and the workflow ran on `pull_request`.
