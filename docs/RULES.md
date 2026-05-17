# Quality rule catalog

Rule pack version: **1.0.0**.

Every finding carries its `rule_id` and a `citation_url` linking to the rule's Markdown file (see [`../src/rule-packs/`](../src/rule-packs/)).

| Rule ID | Title | Severity | Source |
|---|---|---|---|
| [QUAL.SOLID.001](../src/rule-packs/QUAL.SOLID.001.md) | Function too long or too complex | MEDIUM / HIGH | Claude + eslint complexity |
| [QUAL.DEAD.001](../src/rule-packs/QUAL.DEAD.001.md) | Exported but unreferenced symbol | LOW | ts-prune |
| [QUAL.CLONE.001](../src/rule-packs/QUAL.CLONE.001.md) | Duplicated code block | MEDIUM | jscpd |
| [QUAL.TEST.001](../src/rule-packs/QUAL.TEST.001.md) | New public function without a test | MEDIUM | Claude |
| [QUAL.DOC.001](../src/rule-packs/QUAL.DOC.001.md) | Public API without JSDoc/TSDoc | LOW | Claude + markdownlint |
| [QUAL.DEP.001](../src/rule-packs/QUAL.DEP.001.md) | Duplicate dependency in package.json | MEDIUM | Claude |
| [QUAL.DEP.002](../src/rule-packs/QUAL.DEP.002.md) | Major version bump without changelog | MEDIUM | Claude |
| [QUAL.STYLE.001](../src/rule-packs/QUAL.STYLE.001.md) | eslint violation introduced | HIGH / LOW | eslint |
| [QUAL.STYLE.002](../src/rule-packs/QUAL.STYLE.002.md) | Raw color literal | MEDIUM | eslint + Claude |
| [QUAL.NAMING.001](../src/rule-packs/QUAL.NAMING.001.md) | Abbreviation / non-descriptive name | LOW | Claude |
| [QUAL.A11Y.001](../src/rule-packs/QUAL.A11Y.001.md) | Missing alt / aria-label | MEDIUM | Claude |
| [QUAL.IMPORT.001](../src/rule-packs/QUAL.IMPORT.001.md) | Wildcard import where named would do | LOW | Claude + eslint |
| [QUAL.COMMENT.001](../src/rule-packs/QUAL.COMMENT.001.md) | TODO/FIXME without owner or date | LOW | Claude |

## Suppression

Add a comment on or directly above the flagged line:

```ts
// ai-review-ignore: QUAL.STYLE.002 — third-party SDK requires literal hex
const SDK_COLOR = '#0a84ff';
```

Suppression must cite the exact `rule_id`. Suppression rates per rule are tracked in trending data; if a rule's suppression rate climbs above 30%, treat that as a signal the rule needs tightening.

## Per-repo configuration

Override rules in the target repo's `.github/ai-review.yml`:

```yaml
quality:
  enabled: true
  max_findings_per_file: 25
  exclude_paths:
    - 'legacy/**'
    - 'vendor/**'
  rules:
    QUAL.NAMING.001:
      enabled: false        # team chooses to allow abbreviations
    QUAL.DOC.001:
      severity: MEDIUM      # team treats undocumented exports as MEDIUM not LOW
```
