## What changed
<!-- 1-3 lines on the intent of this PR -->

## Why
<!-- Why is this change needed? Link issue if any. -->

## How
<!-- Brief technical notes on the approach. -->

## Rule pack changes
<!-- If this PR adds, modifies, or removes a QUAL.* rule, list each rule_id and bump rule_pack_version in src/version.ts -->

## Tests
- [ ] `npm test` passes locally at ≥95% coverage
- [ ] `npm run build` re-bundles dist/index.js and the diff is committed
- [ ] New rule(s) have at least one fixture under `tests/fixtures/`

## AI review
The 3 AI reviewers (security, quality, qa) will comment automatically.

## Checklist
- [ ] No `--no-verify` / `--force` ops bypassing CI
- [ ] Updated `docs/RULES.md` if a rule was added/changed
- [ ] Updated `CLAUDE.md` if the runtime contract changed
