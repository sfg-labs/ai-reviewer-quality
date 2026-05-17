import { ChangedFile, Finding } from '../types';
import { citationUrl } from '../config';
import { ANALYZER_VERSIONS, RULE_PACK_VERSION } from '../version';

interface MdViolation {
  fileName?: string;
  lineNumber: number;
  ruleNames?: string[];
  ruleDescription?: string;
  errorDetail?: string | null;
}

/**
 * Parse a `markdownlint-cli2 --output-json` report. Emits one finding
 * per violation on a changed line.
 *
 * markdownlint-cli2 outputs either a top-level array of violations
 * (each with `fileName`) or a `{ files: { name: [violation] } }`
 * map — both shapes handled here.
 */
export function parseMarkdownlintOutput(output: string, changed: ChangedFile[]): Finding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return [];
  }
  const violations: MdViolation[] = [];
  if (Array.isArray(parsed)) {
    for (const v of parsed) {
      violations.push(v as MdViolation);
    }
  } else if (parsed && typeof parsed === 'object') {
    const files = (parsed as { files?: Record<string, MdViolation[]> }).files;
    if (files) {
      for (const [fname, list] of Object.entries(files)) {
        for (const v of list) {
          violations.push({ ...v, fileName: v.fileName ?? fname });
        }
      }
    }
  }

  const changedMap = new Map(changed.map((f) => [f.filename, new Set(f.changedLines)]));
  const findings: Finding[] = [];
  for (const v of violations) {
    if (!v.fileName) continue;
    const touched = changedMap.get(v.fileName);
    if (!touched || !touched.has(v.lineNumber)) continue;
    const ruleName = (v.ruleNames && v.ruleNames[0]) ?? 'MD000';
    findings.push({
      rule_id: 'QUAL.DOC.001',
      severity: 'LOW',
      confidence: 0.95,
      file: v.fileName,
      line: v.lineNumber,
      explanation: `markdownlint (${ruleName}): ${v.ruleDescription ?? 'style violation'}${v.errorDetail ? ` — ${v.errorDetail}` : ''}.`,
      remediation: 'Fix the markdown style violation, or update `.markdownlint.json` if the rule is wrong for this repo.',
      citation_url: citationUrl('QUAL.DOC.001', RULE_PACK_VERSION),
      source: 'markdownlint',
      rule_pack_version: RULE_PACK_VERSION,
      analyzer_versions: { markdownlint: ANALYZER_VERSIONS.markdownlint },
    });
  }
  return findings;
}
