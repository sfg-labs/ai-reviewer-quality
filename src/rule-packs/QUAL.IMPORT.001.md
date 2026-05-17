# QUAL.IMPORT.001 — Wildcard import where named would do

**Severity:** LOW
**Source:** Claude reasoning + eslint `import/no-namespace`
**Category:** Imports

## What

A new import uses the `import * as X from '...'` wildcard form when fewer than 4 named exports are actually referenced.

## Why

Wildcard imports defeat tree-shaking, make grep harder, and obscure which symbols are actually in use. Named imports document intent and let the bundler drop dead code.

## Fix

```ts
// BAD
import * as utils from './utils';
utils.calculateGst(amount, 0.18);

// GOOD
import { calculateGst } from './utils';
calculateGst(amount, 0.18);
```

Wildcards are fine when you genuinely need the namespace (e.g. `import * as React from 'react'` in some setups, or a config object with many fields you iterate over).

## Suppression

```ts
// ai-review-ignore: QUAL.IMPORT.001 — iterating all exported handlers
import * as handlers from './handlers';
Object.values(handlers).forEach(register);
```
