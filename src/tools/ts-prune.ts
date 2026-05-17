import { ChangedFile, Finding } from '../types';
import { citationUrl } from '../config';
import { ANALYZER_VERSIONS, RULE_PACK_VERSION } from '../version';

/**
 * Parse `ts-prune` output. Each line is of the form:
 *
 *   src/foo.ts:42 - bar
 *   src/foo.ts:42 - default (used in module)
 *
 * Findings emitted only for lines added or modified in this PR so we
 * never blame contributors for pre-existing dead exports.
 *
 * Entries with `(used in module)` are skipped — they're not truly dead.
 */
export function parseTsPruneOutput(output: string, changed: ChangedFile[]): Finding[] {
  const changedMap = new Map(changed.map((f) => [f.filename, new Set(f.changedLines)]));
  const findings: Finding[] = [];

  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.includes('(used in module)')) continue;
    const match = line.match(/^(.+?):(\d+)\s*-\s*(.+)$/);
    if (!match) continue;
    const file = match[1];
    const lineNum = parseInt(match[2], 10);
    const symbol = match[3];

    const touched = changedMap.get(file);
    if (!touched || !touched.has(lineNum)) continue;

    findings.push({
      rule_id: 'QUAL.DEAD.001',
      severity: 'LOW',
      confidence: 0.85,
      file,
      line: lineNum,
      explanation: `Exported symbol \`${symbol}\` is not referenced anywhere in the codebase.`,
      remediation: 'Remove the export if unused, or add a consumer. If intentionally part of a public API, mark it `@public`.',
      citation_url: citationUrl('QUAL.DEAD.001', RULE_PACK_VERSION),
      source: 'ts-prune',
      rule_pack_version: RULE_PACK_VERSION,
      analyzer_versions: { 'ts-prune': ANALYZER_VERSIONS['ts-prune'] },
    });
  }
  return findings;
}
