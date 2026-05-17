import { ChangedFile, Finding } from '../types';
import { runCli } from './exec';
import { parseEslintOutput } from './eslint';
import { parseTsPruneOutput } from './ts-prune';
import { parseJscpdOutput } from './jscpd';
import { parseMarkdownlintOutput } from './markdownlint';

export interface AnalyzerRunner {
  name: string;
  run(workspace: string, changed: ChangedFile[]): Promise<Finding[]>;
}

/**
 * Build the set of analyzer runners. Each runner is independent and
 * isolated to a CLI invocation — failures in one analyzer never block
 * the others.
 */
export function buildAnalyzers(): AnalyzerRunner[] {
  return [
    {
      name: 'eslint',
      async run(workspace, changed) {
        const files = changed
          .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f.filename) && f.status !== 'removed')
          .map((f) => f.filename);
        if (files.length === 0) return [];
        const { stdout } = await runCli('npx', ['--no-install', 'eslint', '-f', 'json', ...files], workspace);
        return parseEslintOutput(stdout, changed);
      },
    },
    {
      name: 'ts-prune',
      async run(workspace, changed) {
        if (!changed.some((f) => /\.(ts|tsx)$/.test(f.filename))) return [];
        const { stdout } = await runCli('npx', ['--no-install', 'ts-prune'], workspace);
        return parseTsPruneOutput(stdout, changed);
      },
    },
    {
      name: 'jscpd',
      async run(workspace, changed) {
        const tsFiles = changed.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f.filename) && f.status !== 'removed');
        if (tsFiles.length === 0) return [];
        const { stdout } = await runCli(
          'npx',
          ['--no-install', 'jscpd', '--silent', '--reporters', 'json', '--output', '/tmp/jscpd', '.'],
          workspace
        );
        return parseJscpdOutput(stdout, changed);
      },
    },
    {
      name: 'markdownlint',
      async run(workspace, changed) {
        const mdFiles = changed.filter((f) => /\.md$/.test(f.filename) && f.status !== 'removed').map((f) => f.filename);
        if (mdFiles.length === 0) return [];
        const { stdout } = await runCli('npx', ['--no-install', 'markdownlint-cli2', '--json', ...mdFiles], workspace);
        return parseMarkdownlintOutput(stdout, changed);
      },
    },
  ];
}

/** Run every analyzer in parallel and concatenate their findings. */
export async function runAllAnalyzers(
  analyzers: AnalyzerRunner[],
  workspace: string,
  changed: ChangedFile[]
): Promise<Finding[]> {
  const results = await Promise.allSettled(analyzers.map((a) => a.run(workspace, changed)));
  const findings: Finding[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') findings.push(...r.value);
  }
  return findings;
}
