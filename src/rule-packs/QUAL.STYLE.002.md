# QUAL.STYLE.002 — Raw color literal in code

**Severity:** MEDIUM
**Source:** eslint custom rule + Claude reasoning
**Category:** Design system

## What

A hex color (`#0a84ff`), `rgb()`, `rgba()`, `hsl()`, or named CSS color appears directly in code (.ts / .tsx / .css / .scss) instead of being referenced from the design-token system.

## Why

KOTA-PROJECT Operating Principle #4: **no raw colors in code**. Design tokens are the single source of truth — raw colors create dark-mode bugs, accessibility regressions, and brand drift.

## Fix

Replace the literal with a token:

```ts
// BAD
const Card = styled.div`background: #0a84ff;`;

// GOOD
import { tokens } from '@sfg/design-tokens';
const Card = styled.div`background: ${tokens.color.brand.primary};`;
```

## Suppression

```ts
// ai-review-ignore: QUAL.STYLE.002 — third-party SDK requires literal hex
```
