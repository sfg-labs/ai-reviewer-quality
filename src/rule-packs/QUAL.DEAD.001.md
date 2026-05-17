# QUAL.DEAD.001 — Exported but unreferenced symbol

**Severity:** LOW
**Source:** ts-prune
**Category:** Dead code

## What

A `export` declaration in the new code is not referenced anywhere in the codebase (excluding the module that defines it).

## Why

Dead exports inflate bundle size, mislead future maintainers ("must be public API — be careful changing"), and clutter editor autocomplete.

## Fix

- If the export was added speculatively, drop it.
- If it's public-API surface, add a consumer or document it with a `@public` JSDoc tag and add it to the package's published types.

## Example

```ts
// BAD
export function unusedHelper() { /* ... */ }

// GOOD — kept internal
function unusedHelper() { /* ... */ }
```

## Suppression

```ts
// ai-review-ignore: QUAL.DEAD.001 — public API surface, see CHANGELOG.md
export function publicApi() { /* ... */ }
```
