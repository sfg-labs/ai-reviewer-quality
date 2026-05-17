import { ChangedFile, Finding } from '../types';
import { citationUrl } from '../config';
import { ANALYZER_VERSIONS, RULE_PACK_VERSION } from '../version';

interface JscpdDuplicate {
  format: string;
  lines: number;
  fragment?: string;
  tokens?: number;
  firstFile: { name: string; start: number; end: number };
  secondFile: { name: string; start: number; end: number };
}

interface JscpdReport {
  statistics?: { total?: { percentage?: number } };
  duplicates?: JscpdDuplicate[];
}

/**
 * Parse a `jscpd --reporters json` report. Emits one finding per
 * duplicate fragment whose first occurrence lives on a line the PR
 * touched.
 */
export function parseJscpdOutput(output: string, changed: ChangedFile[]): Finding[] {
  let parsed: JscpdReport;
  try {
    parsed = JSON.parse(output);
  } catch {
    return [];
  }
  const dupes = parsed.duplicates ?? [];
  const changedMap = new Map(changed.map((f) => [f.filename, new Set(f.changedLines)]));
  const findings: Finding[] = [];

  for (const d of dupes) {
    const file = d.firstFile.name;
    const touched = changedMap.get(file);
    if (!touched) continue;
    // Did any of the duplicate's lines change in this PR?
    let firstChangedLine = -1;
    for (let l = d.firstFile.start; l <= d.firstFile.end; l++) {
      if (touched.has(l)) {
        firstChangedLine = l;
        break;
      }
    }
    if (firstChangedLine === -1) continue;

    findings.push({
      rule_id: 'QUAL.CLONE.001',
      severity: 'MEDIUM',
      confidence: 0.9,
      file,
      line: firstChangedLine,
      end_line: d.firstFile.end,
      explanation: `Duplicate block (${d.lines} lines) also appears at \`${d.secondFile.name}:${d.secondFile.start}-${d.secondFile.end}\`.`,
      remediation: 'Extract a shared helper or component so both call sites reference one implementation.',
      citation_url: citationUrl('QUAL.CLONE.001', RULE_PACK_VERSION),
      source: 'jscpd',
      rule_pack_version: RULE_PACK_VERSION,
      analyzer_versions: { jscpd: ANALYZER_VERSIONS.jscpd },
    });
  }
  return findings;
}
