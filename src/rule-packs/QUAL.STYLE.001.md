# QUAL.STYLE.001 — eslint violation introduced

**Severity:** HIGH (error) or LOW (warning)
**Source:** eslint
**Category:** Style

## What

The PR introduces a line that violates the repo's eslint config. The reviewer only flags violations on lines that the PR actually touched — pre-existing violations are left alone.

## Why

Lint rules encode team conventions. Letting violations slip through erodes the consistency that makes the codebase navigable.

## Fix

- Run `npm run lint -- --fix` and commit the result.
- If the rule is wrong for this code path, configure an `eslint-disable-next-line <rule>` with a comment explaining why.

## Example

```ts
// BAD
let foo = 'bar';   // prefer-const: 'foo' is never reassigned

// GOOD
const foo = 'bar';
```

## Suppression

Prefer the eslint-native form over our `ai-review-ignore` shorthand:

```ts
// eslint-disable-next-line prefer-const -- foo is reassigned in dev mode hot-reload path
let foo = 'bar';
```
