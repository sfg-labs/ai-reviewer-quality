import type { Octokit } from '@octokit/rest';
import { Finding } from '../types';

/**
 * Render a single finding as a Markdown comment body suitable for
 * either an inline review comment or an issue comment.
 */
export function renderFindingBody(f: Finding): string {
  return [
    `**[${f.severity}] ${f.rule_id}** — confidence ${f.confidence.toFixed(2)}`,
    '',
    f.explanation,
    '',
    `**Fix:** ${f.remediation}`,
    '',
    `_source: ${f.source} · rule pack v${f.rule_pack_version}_`,
    `[Rule reference](${f.citation_url})`,
  ].join('\n');
}

/**
 * Build the structured review comment array expected by GitHub's
 * `POST /repos/{owner}/{repo}/pulls/{pull}/reviews` endpoint.
 *
 * Findings without a valid line number fall through to the summary
 * body and are filtered out here.
 */
export function buildInlineComments(findings: Finding[]): Array<{
  path: string;
  line: number;
  side: 'RIGHT';
  body: string;
}> {
  return findings
    .filter((f) => f.line > 0 && f.file)
    .map((f) => ({
      path: f.file,
      line: f.line,
      side: 'RIGHT' as const,
      body: renderFindingBody(f),
    }));
}

/**
 * Post the inline review comments to a PR. Splits large reviews into
 * multiple submissions of up to 50 comments each (GitHub soft limit).
 */
export async function postInlineReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  commitId: string,
  comments: Array<{ path: string; line: number; side: 'RIGHT'; body: string }>,
  summaryBody: string,
  event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES' = 'COMMENT'
): Promise<void> {
  const BATCH = 50;
  if (comments.length === 0) {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: commitId,
      event,
      body: summaryBody,
    });
    return;
  }
  for (let i = 0; i < comments.length; i += BATCH) {
    const batch = comments.slice(i, i + BATCH);
    const isLast = i + BATCH >= comments.length;
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: commitId,
      event: isLast ? event : 'COMMENT',
      body: isLast ? summaryBody : `AI review (batch ${Math.floor(i / BATCH) + 1})`,
      comments: batch,
    });
  }
}
