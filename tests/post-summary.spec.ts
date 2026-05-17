import { countBySeverity, renderSummary } from '../src/github/post-summary';
import { Finding, ReviewBundle } from '../src/types';

function makeFinding(severity: Finding['severity']): Finding {
  return {
    rule_id: 'QUAL.STYLE.001',
    severity,
    confidence: 0.9,
    file: 'src/a.ts',
    line: 1,
    explanation: 'e', remediation: 'r', citation_url: 'u',
    source: 'eslint',
    rule_pack_version: '1.0.0',
    analyzer_versions: {},
  };
}

describe('countBySeverity', () => {
  it('counts each severity bucket', () => {
    const out = countBySeverity([makeFinding('LOW'), makeFinding('HIGH'), makeFinding('HIGH')]);
    expect(out.HIGH).toBe(2);
    expect(out.LOW).toBe(1);
    expect(out.CRITICAL).toBe(0);
    expect(out.MEDIUM).toBe(0);
  });
});

describe('renderSummary', () => {
  const baseBundle: ReviewBundle = {
    verdict: 'COMMENT',
    findings: [],
    skipped: false,
    rulePackVersion: '1.0.0',
    analyzerVersions: { eslint: '8.57.0' },
  };

  it('renders an empty-findings success summary', () => {
    const s = renderSummary(baseBundle);
    expect(s).toContain('No quality findings');
    expect(s).toContain('rule pack v1.0.0');
    expect(s).toContain('eslint@8.57.0');
  });

  it('renders a findings table with totals', () => {
    const s = renderSummary({ ...baseBundle, findings: [makeFinding('HIGH'), makeFinding('LOW')] });
    expect(s).toContain('| HIGH | 1 |');
    expect(s).toContain('| LOW | 1 |');
    expect(s).toContain('| **Total** | **2** |');
    expect(s).toContain('ai-review-ignore');
  });

  it('renders a skipped summary with reason', () => {
    const s = renderSummary({ ...baseBundle, skipped: true, skipReason: 'too big' });
    expect(s).toContain('skipped');
    expect(s).toContain('too big');
  });

  it('renders a default skipped summary when reason is missing', () => {
    const s = renderSummary({ ...baseBundle, skipped: true });
    expect(s).toContain('exceeded');
  });

  it('handles each severity bucket in countBySeverity table render', () => {
    const findings = [makeFinding('CRITICAL'), makeFinding('MEDIUM'), makeFinding('LOW')];
    const s = renderSummary({ ...baseBundle, findings });
    expect(s).toContain('| CRITICAL | 1 |');
    expect(s).toContain('| MEDIUM | 1 |');
    expect(s).toContain('| LOW | 1 |');
  });
});
