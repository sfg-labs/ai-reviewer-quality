# QUAL.COMMENT.001 — TODO/FIXME without owner or date

**Severity:** LOW
**Source:** Claude reasoning
**Category:** Comments

## What

A `TODO`, `FIXME`, `XXX`, or `HACK` comment is added without specifying:
- An owner (GitHub handle), AND
- A target date or tracking link (issue, ticket)

## Why

Unowned TODOs become permanent. Auditing the codebase a year later, nobody knows whether the TODO is still relevant or who to ask.

## Fix

Use the standard format:

```ts
// TODO(@18-ashish-sharma, 2026-Q3): replace mock with real GST rate API once #142 ships
// FIXME(@hudasharma, 2026-06-01): handle paginated responses — currently truncates at 100
```

## Suppression

```ts
// ai-review-ignore: QUAL.COMMENT.001 — see ADR-0007 for ownership policy
// TODO: refactor when DPDP rules stabilise
```
