import { parseTsPruneOutput } from '../src/tools/ts-prune';
import { ChangedFile } from '../src/types';

describe('parseTsPruneOutput', () => {
  const changed: ChangedFile[] = [
    {
      filename: 'src/foo.ts',
      status: 'modified',
      additions: 1,
      deletions: 0,
      changedLines: [42],
    },
  ];

  it('emits QUAL.DEAD.001 for an unreferenced symbol on a changed line', () => {
    const output = 'src/foo.ts:42 - unusedHelper\n';
    const findings = parseTsPruneOutput(output, changed);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule_id).toBe('QUAL.DEAD.001');
    expect(findings[0].severity).toBe('LOW');
    expect(findings[0].explanation).toContain('unusedHelper');
  });

  it('skips entries marked "used in module"', () => {
    const output = 'src/foo.ts:42 - default (used in module)\n';
    expect(parseTsPruneOutput(output, changed)).toEqual([]);
  });

  it('skips lines not touched by the PR', () => {
    const output = 'src/foo.ts:9999 - dead\n';
    expect(parseTsPruneOutput(output, changed)).toEqual([]);
  });

  it('skips files not in the changed set', () => {
    const output = 'src/other.ts:42 - dead\n';
    expect(parseTsPruneOutput(output, changed)).toEqual([]);
  });

  it('ignores empty and malformed lines', () => {
    const output = '\n   \ngibberish without colon\n';
    expect(parseTsPruneOutput(output, changed)).toEqual([]);
  });
});
