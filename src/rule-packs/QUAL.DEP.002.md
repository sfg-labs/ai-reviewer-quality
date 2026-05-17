# QUAL.DEP.002 — Major version bump without changelog entry

**Severity:** MEDIUM
**Source:** Claude reasoning (diffs package.json and CHANGELOG.md)
**Category:** Dependencies

## What

A dependency's major version is bumped (e.g. `^3.x` → `^4.x`) in `package.json` without a corresponding note in `CHANGELOG.md` or the PR body.

## Why

Major bumps mean breaking changes. The next person debugging an unexplained behavior shift needs to know what jumped. Implicit upgrades are the #1 cause of "it worked yesterday" tickets.

## Fix

Add a one-line CHANGELOG entry under "Dependencies":

```md
### Dependencies
- Bumped `react-router` from 5 to 6 (breaking — replaces `Switch` with `Routes`).
```

## Suppression

Include `bump:trivial` in the commit message body or PR title to suppress.
