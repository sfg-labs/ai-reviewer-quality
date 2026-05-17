import parseDiff from 'parse-diff';
import type { Octokit } from '@octokit/rest';
import { ChangedFile } from '../types';

/**
 * Fetch the list of files changed in a pull request with their patches
 * and the set of line numbers that were added or modified.
 */
export async function fetchChangedFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<ChangedFile[]> {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  return files.map((f) => ({
    filename: f.filename,
    status: f.status,
    patch: f.patch,
    additions: f.additions,
    deletions: f.deletions,
    changedLines: f.patch ? extractChangedLines(f.patch) : [],
  }));
}

/**
 * Parse a unified diff hunk and return all 1-based line numbers from the
 * NEW file that were added or modified. Used to scope analyzer findings
 * to lines actually touched by the PR.
 */
export function extractChangedLines(patch: string): number[] {
  const lines: number[] = [];
  // parse-diff expects a file header; if we received only hunks, fabricate one.
  const wrapped = patch.startsWith('diff --git') || patch.startsWith('---')
    ? patch
    : `diff --git a/x b/x\n--- a/x\n+++ b/x\n${patch}`;
  const files = parseDiff(wrapped);
  for (const file of files) {
    for (const chunk of file.chunks) {
      for (const change of chunk.changes) {
        if (change.type === 'add') {
          lines.push(change.ln);
        } else if (change.type === 'normal') {
          // context line — not changed, ignore
        }
      }
    }
  }
  return Array.from(new Set(lines)).sort((a, b) => a - b);
}

/**
 * Compute a rough token estimate for a list of changed files. Used to
 * enforce the max-tokens budget before invoking the Claude reasoner.
 *
 * Heuristic: ~4 characters per token, plus 200 tokens overhead per file.
 */
export function estimateTokens(files: ChangedFile[]): number {
  let total = 0;
  for (const f of files) {
    total += 200;
    if (f.patch) total += Math.ceil(f.patch.length / 4);
  }
  return total;
}
