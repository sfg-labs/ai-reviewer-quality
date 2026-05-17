# QUAL.TEST.001 — New public function without a test

**Severity:** MEDIUM
**Source:** Claude reasoning (cross-references `tests/` and `__tests__/` directories)
**Category:** Testing

## What

A new exported function, class, or React component is added without a corresponding test file or test case being added in the same PR.

## Why

Tests are the contract: they document intent, prevent regressions, and accelerate future refactors. New public API without tests is a debt the team takes on silently.

## Fix

Add a test file (`<name>.spec.ts` / `<name>.test.tsx`) and cover the happy path plus at least one edge case.

## Example

```ts
// BAD — new public helper, no test
export function calculateGst(amount: number) { /* ... */ }

// GOOD — added in same PR: helpers/gst.spec.ts
```

## Suppression

```ts
// ai-review-ignore: QUAL.TEST.001 — trivial wrapper, tested via integration test in nma-india-engine
```
