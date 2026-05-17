import * as exec from '../src/tools/exec';
import { buildAnalyzers, runAllAnalyzers } from '../src/tools/runner';
import { ChangedFile } from '../src/types';

describe('buildAnalyzers / runAllAnalyzers', () => {
  const TS_FILE: ChangedFile = {
    filename: 'src/foo.ts',
    status: 'modified',
    additions: 1,
    deletions: 0,
    changedLines: [5],
  };
  const MD_FILE: ChangedFile = {
    filename: 'README.md',
    status: 'modified',
    additions: 1,
    deletions: 0,
    changedLines: [7],
  };

  it('produces exactly 4 analyzers', () => {
    expect(buildAnalyzers().map((a) => a.name)).toEqual([
      'eslint', 'ts-prune', 'jscpd', 'markdownlint',
    ]);
  });

  it('eslint analyzer short-circuits when no TS/JS file changed', async () => {
    const spy = jest.spyOn(exec, 'runCli').mockResolvedValue({ code: 0, stdout: '[]', stderr: '' });
    const [eslint] = buildAnalyzers();
    const out = await eslint.run('/tmp', [MD_FILE]);
    expect(out).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('ts-prune analyzer short-circuits when no TS file', async () => {
    const spy = jest.spyOn(exec, 'runCli').mockResolvedValue({ code: 0, stdout: '', stderr: '' });
    const tsPrune = buildAnalyzers()[1];
    expect(await tsPrune.run('/tmp', [MD_FILE])).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('jscpd analyzer short-circuits when no TS/JS file', async () => {
    const spy = jest.spyOn(exec, 'runCli').mockResolvedValue({ code: 0, stdout: '{}', stderr: '' });
    const jscpd = buildAnalyzers()[2];
    expect(await jscpd.run('/tmp', [MD_FILE])).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('markdownlint analyzer short-circuits when no md file', async () => {
    const spy = jest.spyOn(exec, 'runCli').mockResolvedValue({ code: 0, stdout: '[]', stderr: '' });
    const md = buildAnalyzers()[3];
    expect(await md.run('/tmp', [TS_FILE])).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('each analyzer invokes its CLI when relevant files present', async () => {
    const spy = jest.spyOn(exec, 'runCli').mockImplementation(async (_cmd: string, args: string[]) => {
      if (args.includes('eslint')) return { code: 0, stdout: '[]', stderr: '' };
      if (args.includes('ts-prune')) return { code: 0, stdout: '', stderr: '' };
      if (args.includes('jscpd')) return { code: 0, stdout: '{}', stderr: '' };
      if (args.includes('markdownlint-cli2')) return { code: 0, stdout: '[]', stderr: '' };
      return { code: 0, stdout: '', stderr: '' };
    });

    const analyzers = buildAnalyzers();
    for (const a of analyzers) {
      await a.run('/tmp', [TS_FILE, MD_FILE]);
    }
    expect(spy).toHaveBeenCalledTimes(4);
    spy.mockRestore();
  });

  it('runAllAnalyzers tolerates an analyzer that throws', async () => {
    const analyzers = [
      { name: 'a', run: async () => [] },
      { name: 'b', run: async () => { throw new Error('x'); } },
    ];
    const out = await runAllAnalyzers(analyzers, '/tmp', [TS_FILE]);
    expect(out).toEqual([]);
  });

  it('runAllAnalyzers concatenates findings from all analyzers', async () => {
    const f = (id: string) => ({
      rule_id: id, severity: 'LOW' as const, confidence: 0.7,
      file: 'src/foo.ts', line: 5, explanation: 'e', remediation: 'r',
      citation_url: 'u', source: 'eslint' as const,
      rule_pack_version: '1.0.0', analyzer_versions: {},
    });
    const analyzers = [
      { name: 'a', run: async () => [f('QUAL.STYLE.001')] },
      { name: 'b', run: async () => [f('QUAL.DEAD.001')] },
    ];
    const out = await runAllAnalyzers(analyzers, '/tmp', [TS_FILE]);
    expect(out).toHaveLength(2);
  });
});
