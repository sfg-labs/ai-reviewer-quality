import { Finding, ReviewBundle, Severity } from '../types';

const SEVERITY_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Render the summary body posted at the top of the review. Includes
 * a finding count table, the verdict, analyzer versions used, and an
 * explicit note that the quality reviewer never blocks merge.
 */
export function renderSummary(bundle: ReviewBundle): string {
  if (bundle.skipped) {
    return [
      '## AI Quality Review — skipped',
      '',
      bundle.skipReason ?? 'PR exceeded the configured analysis budget.',
      '',
      `_rule pack v${bundle.rulePackVersion}_`,
    ].join('\n');
  }

  const counts = countBySeverity(bundle.findings);
  const lines: string[] = [];
  lines.push('## AI Quality Review');
  lines.push('');
  lines.push(`**Verdict:** ${bundle.verdict} _(quality findings never block merge)_`);
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|---|---|');
  for (const sev of SEVERITY_ORDER) {
    lines.push(`| ${sev} | ${counts[sev] ?? 0} |`);
  }
  lines.push(`| **Total** | **${bundle.findings.length}** |`);
  lines.push('');
  if (bundle.findings.length === 0) {
    lines.push('No quality findings on this PR — nice work!');
  } else {
    lines.push('See inline comments for details. Suppress a finding by adding:');
    lines.push('');
    lines.push('```');
    lines.push('// ai-review-ignore: <RULE_ID> — <reason>');
    lines.push('```');
    lines.push('');
    lines.push('on the line above the flagged code.');
  }
  lines.push('');
  lines.push(`_rule pack v${bundle.rulePackVersion} · analyzers: ${formatAnalyzers(bundle.analyzerVersions)}_`);
  return lines.join('\n');
}

/** Group findings by severity for the summary table. */
export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const f of findings) counts[f.severity]++;
  return counts;
}

function formatAnalyzers(versions: Record<string, string>): string {
  return Object.entries(versions)
    .map(([name, v]) => `${name}@${v}`)
    .join(', ');
}
