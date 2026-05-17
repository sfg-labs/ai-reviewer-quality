# QUAL.CLONE.001 — Duplicated code block

**Severity:** MEDIUM
**Source:** jscpd (threshold 5%)
**Category:** DRY

## What

A code block of meaningful length (≥ 30 tokens / ~5 lines) appears in two or more files, or twice in the same file.

## Why

Duplicate code drifts. A bug fix or behavior change in one copy doesn't propagate to the other, leading to subtle inconsistencies that show up in production.

## Fix

Extract the common block into a helper function or component and have both call sites depend on it.

## Example

```ts
// BAD — same parsing block copy-pasted into two route handlers.
// foo.ts L20-L35
// bar.ts L40-L55

// GOOD — shared helper.
// helpers/parse-request.ts
export function parseRequest(req) { /* ... */ }
```

## Suppression

```ts
// ai-review-ignore: QUAL.CLONE.001 — boilerplate required by framework
```
