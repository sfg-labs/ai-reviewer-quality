import { ChangedFile, Finding, Severity } from '../types';
import { citationUrl } from '../config';
import { ANALYZER_VERSIONS, RULE_PACK_VERSION } from '../version';

interface EslintMessage {
  ruleId: string | null;
  severity: number; // 1 = warning, 2 = error
  message: string;
  line: number;
  endLine?: number;
  column?: number;
}

interface EslintFileResult {
  filePath: string;
  messages: EslintMessage[];
}

/**
 * Parse an `eslint -f json` payload into our {@link Finding} shape.
 *
 * - Errors map to `QUAL.STYLE.001` at HIGH severity.
 * - Warnings map to `QUAL.STYLE.001` at LOW severity.
 * - Custom raw-color rule (`no-restricted-syntax` flagged with "raw color")
 *   maps to `QUAL.STYLE.002`.
 * - The matchers are restricted to lines touched by the PR so we don't
 *   complain about pre-existing code.
 */
export function parseEslintOutput(output: string, changed: ChangedFile[]): Finding[] {
  let parsed: EslintFileResult[];
  try {
    parsed = JSON.parse(output);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const changedMap = new Map(changed.map((f) => [normalizePath(f.filename), new Set(f.changedLines)]));
  const findings: Finding[] = [];

  for (const file of parsed) {
    const relPath = relativize(file.filePath);
    const touched = changedMap.get(relPath);
    if (!touched) continue;
    for (const msg of file.messages) {
      if (!touched.has(msg.line)) continue;
      const isRawColor = (msg.ruleId ?? '').includes('color') || /raw color/i.test(msg.message);
      const ruleId = isRawColor ? 'QUAL.STYLE.002' : 'QUAL.STYLE.001';
      const severity: Severity = msg.severity === 2 ? 'HIGH' : 'LOW';
      findings.push({
        rule_id: ruleId,
        severity,
        confidence: 0.95,
        file: relPath,
        line: msg.line,
        end_line: msg.endLine,
        explanation: `eslint${msg.ruleId ? ` (${msg.ruleId})` : ''}: ${msg.message}`,
        remediation:
          ruleId === 'QUAL.STYLE.002'
            ? 'Replace the raw color with a design-system token (see Op Principle #4).'
            : 'Resolve the eslint violation; run `npm run lint -- --fix` if it is auto-fixable.',
        citation_url: citationUrl(ruleId, RULE_PACK_VERSION),
        source: 'eslint',
        rule_pack_version: RULE_PACK_VERSION,
        analyzer_versions: { eslint: ANALYZER_VERSIONS.eslint },
      });
    }
  }
  return findings;
}

function relativize(p: string): string {
  const cwd = process.cwd();
  if (p.startsWith(cwd)) return p.slice(cwd.length + 1);
  return p;
}

function normalizePath(p: string): string {
  return p.replace(/^\.\//, '');
}
