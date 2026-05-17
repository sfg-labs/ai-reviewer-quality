# QUAL.SOLID.001 — Function too long or too complex

**Severity:** MEDIUM (HIGH for >150 lines or complexity >15)
**Source:** Claude reasoning + eslint complexity rule
**Category:** SOLID / Single Responsibility

## What

A single function exceeds **100 lines** OR has **cyclomatic complexity > 10**. Both are strong signals that the function is doing more than one thing.

## Why

Long, complex functions are hard to test, hard to review, and tend to grow indefinitely. They concentrate change pressure — every new requirement edits the same blob — and they make ownership unclear.

## Fix

1. Extract sub-routines that have a single, name-able job.
2. Replace nested conditionals with early returns or a lookup table.
3. If the function is a pipeline, model it explicitly: `parse -> validate -> transform -> persist`.

## Example

```ts
// BAD — 120-line `handleOrderSubmit` mixes validation, pricing, persistence, and notifications.
async function handleOrderSubmit(order) { /* ... 120 lines ... */ }

// GOOD
async function handleOrderSubmit(order) {
  const validated = validateOrder(order);
  const priced = applyPricing(validated);
  const saved = await persistOrder(priced);
  await notifySubscribers(saved);
  return saved;
}
```

## Suppression

```ts
// ai-review-ignore: QUAL.SOLID.001 — generated code, owned by /scripts/codegen.ts
```
