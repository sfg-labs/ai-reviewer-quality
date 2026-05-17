# Install — 3 steps

## 1. Add `ANTHROPIC_API_KEY` as a repo secret

```bash
gh secret set ANTHROPIC_API_KEY --repo sfg-labs/<your-repo>
```

`GITHUB_TOKEN` is provided automatically by GitHub Actions — no setup needed.

## 2. Add `.github/workflows/ai-review.yml`

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
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token:      ${{ secrets.GITHUB_TOKEN }}
```

(If you adopted the `repo-standardizer` scaffold, this file already exists.)

## 3. (Optional) Add `.github/ai-review.yml` for per-repo overrides

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
| `anthropic-api-key` | yes | — | Use a GitHub secret. |
| `github-token` | yes | — | Pass `${{ secrets.GITHUB_TOKEN }}`. |
| `config-path` | no | `.github/ai-review.yml` | Path in the target repo. |
| `model` | no | `claude-sonnet-4-6` | Override only if escalating ambiguous findings. |
| `max-tokens` | no | `50000` | Hard cap on input tokens; over budget posts a polite skip comment. |

## Outputs

| Output | Notes |
|---|---|
| `verdict` | Always `COMMENT` (quality never blocks merge). |
| `finding-count` | Total findings after dedupe + suppression. |

## Troubleshooting

- **"PR exceeds the 50000-token budget"** — split the PR into smaller pieces, or bump `max-tokens` in the workflow.
- **"Quality review disabled via ai-review.yml — skipping."** — your repo set `quality.enabled: false`.
- **No comments appear** — check that `ANTHROPIC_API_KEY` is set in the repo's Actions secrets and that the PR isn't a draft.
