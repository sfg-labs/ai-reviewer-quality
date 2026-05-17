# QUAL.DOC.001 — Public API without JSDoc/TSDoc

**Severity:** LOW
**Source:** Claude reasoning + markdownlint
**Category:** Documentation

## What

An exported function, class, type, or React component lacks a JSDoc / TSDoc comment, OR a markdown documentation file has markdownlint violations on a changed line.

## Why

The first thing a consumer sees is the IDE tooltip. Without a docstring they must read the implementation. Cumulative cost across a 50-engineer team is enormous.

## Fix

Add a 1-3 sentence docstring describing:
- What it does (one sentence)
- Parameters (if non-obvious)
- Return value (if non-trivial)
- Failure modes (if any throws)

## Example

```ts
// BAD
export function calculateGst(amount, rate) { /* ... */ }

// GOOD
/**
 * Compute GST on the given amount.
 *
 * @param amount - Pre-tax amount in INR (paise).
 * @param rate - GST rate as a fraction (0.18 for 18%).
 * @returns The GST amount in paise, rounded half-even.
 */
export function calculateGst(amount: number, rate: number): number { /* ... */ }
```

## Suppression

```ts
// ai-review-ignore: QUAL.DOC.001 — name is self-documenting
```
