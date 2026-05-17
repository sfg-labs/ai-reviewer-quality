# QUAL.A11Y.001 — Missing alt text or aria-label

**Severity:** MEDIUM
**Source:** Claude reasoning (eslint-plugin-jsx-a11y also recommended)
**Category:** Accessibility

## What

A frontend element that requires an accessible name is added without one:
- `<img>` without `alt`
- `<button>` with only an icon, no `aria-label`
- `<input>` without an associated `<label>` or `aria-label`
- `<a>` with non-text content (icon-only) and no `aria-label`

## Why

Screen-reader users navigate by these attributes. Missing them silently breaks the experience for ~5-10% of real users.

## Fix

```tsx
// BAD
<img src="/logo.png" />
<button onClick={save}><SaveIcon /></button>

// GOOD
<img src="/logo.png" alt="Suwalka Motors logo" />
<button aria-label="Save invoice" onClick={save}><SaveIcon aria-hidden="true" /></button>
```

For purely decorative images use `alt=""` (intentional empty alt).

## Suppression

```tsx
// ai-review-ignore: QUAL.A11Y.001 — decorative, alt="" is intentional
<img src="/spacer.png" alt="" />
```
