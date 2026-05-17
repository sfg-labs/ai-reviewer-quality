/**
 * Shared type definitions for the AI quality reviewer.
 *
 * All findings emitted by static analyzers converge on the
 * {@link Finding} shape so the aggregator can dedupe, suppress, and
 * post a uniform review.
 */

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Verdict = 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES';
export type Source = 'eslint' | 'ts-prune' | 'jscpd' | 'markdownlint';

/** A single review finding. */
export interface Finding {
  rule_id: string;
  severity: Severity;
  confidence: number;
  file: string;
  line: number;
  end_line?: number;
  explanation: string;
  remediation: string;
  citation_url: string;
  source: Source;
  rule_pack_version: string;
  analyzer_versions: Record<string, string>;
}

/** A single file changed in a pull request. */
export interface ChangedFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | string;
  patch?: string;
  additions: number;
  deletions: number;
  changedLines: number[]; // 1-based line numbers that were added or modified
}

/** Per-repo overrides loaded from `.github/ai-review.yml`. */
export interface ReviewConfig {
  enabled: boolean;
  excludePaths: string[];
  rulePackVersion?: string;
  ruleOverrides: Record<string, { severity?: Severity; enabled?: boolean }>;
  maxFindingsPerFile: number;
}

export const DEFAULT_CONFIG: ReviewConfig = {
  enabled: true,
  excludePaths: ['dist/**', 'build/**', 'node_modules/**', 'coverage/**', '**/*.min.js'],
  ruleOverrides: {},
  maxFindingsPerFile: 25,
};

/** Result of the aggregation step ready for posting to GitHub. */
export interface ReviewBundle {
  verdict: Verdict;
  findings: Finding[];
  skipped: boolean;
  skipReason?: string;
  rulePackVersion: string;
  analyzerVersions: Record<string, string>;
}
