import {
  applyConfig,
  applySuppressions,
  capFindingsPerFile,
  computeVerdict,
  dedupeFindings,
} from '../src/aggregator';
import { ChangedFile, DEFAULT_CONFIG, Finding } from '../src/types';

function f(overrides: Partial<Finding>): Finding {
  return {
    rule_id: 'QUAL.STYLE.001',
    severity: 'LOW',
    confidence: 0.7,
    file: 'src/a.ts',
    line: 5,
    explanation: 'e',
    remediation: 'r',
    citation_url: 'u',
    source: 'eslint',
    rule_pack_version: '1.0.0',
    analyzer_versions: {},
    ...overrides,
  };
}

describe('computeVerdict', () => {
  it('always returns COMMENT regardless of finding severity', () => {
    expect(computeVerdict([])).toBe('COMMENT');
    expect(computeVerdict([f({ severity: 'CRITICAL' })])).toBe('COMMENT');
  });
});

describe('dedupeFindings', () => {
  it('removes duplicates by (rule, file, line) keeping higher confidence', () => {
    const out = dedupeFindings([
      f({ confidence: 0.5, explanation: 'low' }),
      f({ confidence: 0.9, explanation: 'high' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].explanation).toBe('high');
  });

  it('tie-breaks on severity when confidence is equal', () => {
    const out = dedupeFindings([
      f({ confidence: 0.7, severity: 'LOW', explanation: 'low' }),
      f({ confidence: 0.7, severity: 'HIGH', explanation: 'high' }),
    ]);
    expect(out[0].severity).toBe('HIGH');
  });

  it('keeps findings on different lines', () => {
    expect(dedupeFindings([f({ line: 1 }), f({ line: 2 })])).toHaveLength(2);
  });

  it('ranks every severity bucket distinctly', () => {
    const a = f({ confidence: 0.7, severity: 'CRITICAL', line: 1 });
    const b = f({ confidence: 0.7, severity: 'MEDIUM', line: 1 });
    expect(dedupeFindings([b, a])[0].severity).toBe('CRITICAL');
  });
});

describe('applyConfig', () => {
  it('drops findings for disabled rules', () => {
    const cfg = { ...DEFAULT_CONFIG, ruleOverrides: { 'QUAL.STYLE.001': { enabled: false } } };
    expect(applyConfig([f({})], cfg)).toEqual([]);
  });

  it('rewrites severity per override', () => {
    const cfg = { ...DEFAULT_CONFIG, ruleOverrides: { 'QUAL.STYLE.001': { severity: 'HIGH' as const } } };
    expect(applyConfig([f({})], cfg)[0].severity).toBe('HIGH');
  });

  it('drops findings under excluded paths', () => {
    const cfg = { ...DEFAULT_CONFIG, excludePaths: ['legacy/**'] };
    expect(applyConfig([f({ file: 'legacy/old.ts' })], cfg)).toEqual([]);
  });

  it('passes through findings with no override', () => {
    expect(applyConfig([f({ rule_id: 'QUAL.DEAD.001' })], DEFAULT_CONFIG)).toHaveLength(1);
  });
});

describe('applySuppressions', () => {
  function changedWithSuppression(patch: string): ChangedFile {
    return {
      filename: 'src/a.ts',
      status: 'modified',
      additions: 1,
      deletions: 0,
      patch,
      changedLines: [],
    };
  }

  it('suppresses a finding when an ignore comment precedes it', () => {
    const patch = `@@ -1,2 +1,4 @@
 line1
+// ai-review-ignore: QUAL.STYLE.001 — vendor
+const x = '#0a84ff';
 line2`;
    const out = applySuppressions([f({ line: 3 })], [changedWithSuppression(patch)]);
    expect(out).toEqual([]);
  });

  it('does NOT suppress when the rule_id does not match', () => {
    const patch = `@@ -1,2 +1,4 @@
 line1
+// ai-review-ignore: QUAL.STYLE.002 — vendor
+const x = '#0a84ff';
 line2`;
    expect(applySuppressions([f({ line: 3, rule_id: 'QUAL.STYLE.001' })], [changedWithSuppression(patch)])).toHaveLength(1);
  });

  it('handles files with no patch', () => {
    const out = applySuppressions([f({})], [{
      filename: 'src/a.ts', status: 'renamed', additions: 0, deletions: 0, changedLines: [],
    }]);
    expect(out).toHaveLength(1);
  });

  it('handles findings on files not in the changed set', () => {
    const out = applySuppressions([f({ file: 'src/other.ts' })], []);
    expect(out).toHaveLength(1);
  });
});

describe('capFindingsPerFile', () => {
  it('keeps higher-severity findings when capping', () => {
    const arr = [
      f({ severity: 'LOW', line: 1 }),
      f({ severity: 'HIGH', line: 2 }),
      f({ severity: 'MEDIUM', line: 3 }),
    ];
    const out = capFindingsPerFile(arr, 2);
    expect(out).toHaveLength(2);
    expect(out.map((x) => x.severity).sort()).toEqual(['HIGH', 'MEDIUM']);
  });

  it('caps independently per file', () => {
    const arr = [
      f({ file: 'a.ts', line: 1 }),
      f({ file: 'a.ts', line: 2 }),
      f({ file: 'b.ts', line: 1 }),
    ];
    expect(capFindingsPerFile(arr, 1)).toHaveLength(2);
  });
});
