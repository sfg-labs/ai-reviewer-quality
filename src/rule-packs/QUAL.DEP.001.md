# QUAL.DEP.001 — Duplicate dependency in package.json

**Severity:** MEDIUM
**Source:** Claude reasoning
**Category:** Dependencies

## What

A dependency appears in both `dependencies` and `devDependencies`, or appears more than once in the same block (which JSON usually silently de-duplicates in favor of the last entry).

## Why

Duplicates lead to surprise version resolution: npm picks one and the team thinks they have another. Build artifacts may ship with the wrong version.

## Fix

Remove the duplicate. Keep the entry in the block that reflects how it's actually used:
- Imported by application code → `dependencies`
- Used only by build / test scripts → `devDependencies`

## Example

```json
// BAD
{
  "dependencies": { "lodash": "^4.17.0" },
  "devDependencies": { "lodash": "^4.17.21" }
}

// GOOD
{
  "dependencies": { "lodash": "^4.17.21" }
}
```

## Suppression

Suppress at the file level:
```
<!-- ai-review-ignore: QUAL.DEP.001 — intentional, lockfile pins both versions -->
```
