# QUAL.NAMING.001 — Abbreviation or non-descriptive identifier

**Severity:** LOW
**Source:** Claude reasoning
**Category:** Naming

## What

A variable, function, or parameter name uses a non-obvious abbreviation (`u`, `cfg`, `mgr`, `proc`) or a single-letter name outside a loop/comprehension context.

## Why

Code is read 10× more often than it's written. `userManager` is unambiguous; `mgr` is not.

## Fix

Spell it out. The IDE will autocomplete it for you.

## Example

```ts
// BAD
function process(u, cfg) { /* ... */ }

// GOOD
function processUser(user: User, config: ProcessorConfig) { /* ... */ }
```

Accepted abbreviations (no flag):
- `id`, `url`, `uri`, `http`, `db`, `gst`, `tcs`, `tds`, `pan`, `cin`, `i`/`j`/`k` in loop indices.

## Suppression

```ts
// ai-review-ignore: QUAL.NAMING.001 — math convention
function dot(u: Vec3, v: Vec3): number { /* ... */ }
```
