import { minimatch } from 'minimatch';
import { ChangedFile, Finding, ReviewConfig, Severity, Verdict } from './types';

/**
 * Quality reviewer's verdict policy:
 *
 * > **COMMENT always** — the quality reviewer never blocks merge.
 *
 * This is intentional: code-quality is advisory. Security and QA are
 * the gating reviewers in the sibling actions.
 */
export function computeVerdict(_findings: Finding[]): Verdict {
  return 'COMMENT';
}

/**
 * Dedupe findings by (rule_id, file, line). When two analyzers raise
 * the same point, the one with higher confidence wins, with severity
 * order as a tiebreaker.
 */
export function dedupeFindings(findings: Finding[]): Finding[] {
  const map = new Map<string, Finding>();
  for (const f of findings) {
    const key = `${f.rule_id}|${f.file}|${f.line}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, f);
      continue;
    }
    if (f.confidence > existing.confidence || (f.confidence === existing.confidence && severityRank(f.severity) > severityRank(existing.severity))) {
      map.set(key, f);
    }
  }
  return Array.from(map.values());
}

function severityRank(s: Severity): number {
  switch (s) {
    case 'CRITICAL': return 4;
    case 'HIGH': return 3;
    case 'MEDIUM': return 2;
    case 'LOW': return 1;
  }
}

/**
 * Apply per-repo configuration overrides. A rule can be disabled or
 * have its severity reassigned, and entire path globs can be excluded.
 */
export function applyConfig(findings: Finding[], config: ReviewConfig): Finding[] {
  return findings
    .filter((f) => {
      const override = config.ruleOverrides[f.rule_id];
      if (override?.enabled === false) return false;
      for (const pattern of config.excludePaths) {
        if (minimatch(f.file, pattern, { dot: true })) return false;
      }
      return true;
    })
    .map((f) => {
      const override = config.ruleOverrides[f.rule_id];
      return override?.severity ? { ...f, severity: override.severity } : f;
    });
}

/**
 * Honor in-source suppression comments of the form
 *
 *   // ai-review-ignore: QUAL.STYLE.001 — reason
 *
 * placed on the line immediately above (or on) a finding.
 *
 * The suppression must reference the exact rule_id to take effect.
 */
export function applySuppressions(findings: Finding[], changed: ChangedFile[]): Finding[] {
  const suppressionsByFile = new Map<string, Map<number, Set<string>>>();
  for (const f of changed) {
    if (!f.patch) continue;
    const byLine = new Map<number, Set<string>>();
    const lines = f.patch.split('\n');
    let newLine = 0;
    for (const raw of lines) {
      if (raw.startsWith('@@')) {
        const match = raw.match(/\+(\d+)/);
        if (match) newLine = parseInt(match[1], 10) - 1;
        continue;
      }
      if (raw.startsWith('-')) continue;
      if (raw.startsWith('+') || raw.startsWith(' ')) {
        newLine++;
        const m = raw.match(/ai-review-ignore:\s*([A-Z0-9.]+)/);
        if (m) {
          const ruleId = m[1];
          for (const target of [newLine, newLine + 1]) {
            if (!byLine.has(target)) byLine.set(target, new Set());
            byLine.get(target)!.add(ruleId);
          }
        }
      }
    }
    suppressionsByFile.set(f.filename, byLine);
  }
  return findings.filter((f) => {
    const byLine = suppressionsByFile.get(f.file);
    if (!byLine) return true;
    const set = byLine.get(f.line);
    return !(set && set.has(f.rule_id));
  });
}

/** Cap findings per file so a single noisy file can't dominate the review. */
export function capFindingsPerFile(findings: Finding[], max: number): Finding[] {
  const counts = new Map<string, number>();
  const out: Finding[] = [];
  // Sort by severity then confidence so the most important ones survive.
  const sorted = [...findings].sort((a, b) => {
    const s = severityRank(b.severity) - severityRank(a.severity);
    return s !== 0 ? s : b.confidence - a.confidence;
  });
  for (const f of sorted) {
    const c = counts.get(f.file) ?? 0;
    if (c >= max) continue;
    counts.set(f.file, c + 1);
    out.push(f);
  }
  return out;
}
