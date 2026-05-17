import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import { loadConfig } from './config';
import { fetchChangedFiles, estimateTokens } from './github/pr-diff';
import { buildInlineComments, postInlineReview } from './github/post-inline';
import { renderSummary } from './github/post-summary';
import { buildAnalyzers, runAllAnalyzers } from './tools/runner';
import { reason } from './claude/reasoner';
import { applyConfig, applySuppressions, capFindingsPerFile, computeVerdict, dedupeFindings } from './aggregator';
import { ReviewBundle } from './types';
import { ANALYZER_VERSIONS, RULE_PACK_VERSION } from './version';

/**
 * Main entry point for the GitHub Action. Wires the inputs to the
 * pipeline and posts a single review at the end.
 */
export async function run(): Promise<void> {
  try {
    const apiKey = core.getInput('anthropic-api-key', { required: true });
    const ghToken = core.getInput('github-token', { required: true });
    const configPath = core.getInput('config-path') || '.github/ai-review.yml';
    const model = core.getInput('model') || 'claude-sonnet-4-6';
    const maxTokens = parseInt(core.getInput('max-tokens') || '50000', 10);

    const ctx = github.context;
    if (!ctx.payload.pull_request) {
      core.info('Not a pull request event — skipping.');
      return;
    }

    const owner = ctx.repo.owner;
    const repo = ctx.repo.repo;
    const pullNumber = ctx.payload.pull_request.number;
    const commitId = (ctx.payload.pull_request as unknown as { head: { sha: string } }).head.sha;
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd();

    const config = loadConfig(configPath, workspace);
    if (!config.enabled) {
      core.info('Quality review disabled via ai-review.yml — skipping.');
      return;
    }

    const octokit = new Octokit({ auth: ghToken });
    const changed = await fetchChangedFiles(octokit, owner, repo, pullNumber);

    const tokenEstimate = estimateTokens(changed);
    if (tokenEstimate > maxTokens) {
      const skipBundle: ReviewBundle = {
        verdict: 'COMMENT',
        findings: [],
        skipped: true,
        skipReason: `PR exceeds the ${maxTokens}-token budget (~${tokenEstimate} tokens). Split into smaller PRs for a full review.`,
        rulePackVersion: RULE_PACK_VERSION,
        analyzerVersions: ANALYZER_VERSIONS,
      };
      await postInlineReview(octokit, owner, repo, pullNumber, commitId, [], renderSummary(skipBundle), 'COMMENT');
      core.setOutput('verdict', 'COMMENT');
      core.setOutput('finding-count', '0');
      return;
    }

    const analyzers = buildAnalyzers();
    const [staticFindings, claudeFindings] = await Promise.all([
      runAllAnalyzers(analyzers, workspace, changed),
      reason(changed, { apiKey, model, maxTokens: 4096 }),
    ]);

    const merged = [...staticFindings, ...claudeFindings];
    const deduped = dedupeFindings(merged);
    const configured = applyConfig(deduped, config);
    const suppressed = applySuppressions(configured, changed);
    const capped = capFindingsPerFile(suppressed, config.maxFindingsPerFile);

    const verdict = computeVerdict(capped);
    const bundle: ReviewBundle = {
      verdict,
      findings: capped,
      skipped: false,
      rulePackVersion: RULE_PACK_VERSION,
      analyzerVersions: ANALYZER_VERSIONS,
    };

    const inline = buildInlineComments(capped);
    await postInlineReview(octokit, owner, repo, pullNumber, commitId, inline, renderSummary(bundle), 'COMMENT');

    core.setOutput('verdict', verdict);
    core.setOutput('finding-count', String(capped.length));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    core.setFailed(`ai-reviewer-quality failed: ${msg}`);
  }
}

// Only auto-run when invoked as the action entry point. Tests import
// run() and the individual modules directly.
if (require.main === module) {
  void run();
}
