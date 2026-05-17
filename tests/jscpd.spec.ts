import { parseJscpdOutput } from '../src/tools/jscpd';
import { ChangedFile } from '../src/types';

describe('parseJscpdOutput', () => {
  const changed: ChangedFile[] = [
    {
      filename: 'src/foo.ts',
      status: 'modified',
      additions: 5,
      deletions: 0,
      changedLines: [10, 11, 12, 13, 14],
    },
  ];

  it('emits QUAL.CLONE.001 when the duplicate overlaps changed lines', () => {
    const report = {
      duplicates: [
        {
          format: 'typescript',
          lines: 6,
          firstFile: { name: 'src/foo.ts', start: 10, end: 15 },
          secondFile: { name: 'src/bar.ts', start: 40, end: 45 },
        },
      ],
    };
    const findings = parseJscpdOutput(JSON.stringify(report), changed);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule_id).toBe('QUAL.CLONE.001');
    expect(findings[0].line).toBe(10);
    expect(findings[0].source).toBe('jscpd');
  });

  it('skips duplicates whose lines were not modified', () => {
    const report = {
      duplicates: [
        {
          format: 'typescript',
          lines: 6,
          firstFile: { name: 'src/foo.ts', start: 200, end: 205 },
          secondFile: { name: 'src/bar.ts', start: 40, end: 45 },
        },
      ],
    };
    expect(parseJscpdOutput(JSON.stringify(report), changed)).toEqual([]);
  });

  it('skips files not in changed set', () => {
    const report = {
      duplicates: [
        {
          format: 'typescript',
          lines: 6,
          firstFile: { name: 'src/baz.ts', start: 10, end: 15 },
          secondFile: { name: 'src/bar.ts', start: 40, end: 45 },
        },
      ],
    };
    expect(parseJscpdOutput(JSON.stringify(report), changed)).toEqual([]);
  });

  it('returns empty on invalid JSON', () => {
    expect(parseJscpdOutput('not json', changed)).toEqual([]);
  });

  it('returns empty when no duplicates field present', () => {
    expect(parseJscpdOutput('{}', changed)).toEqual([]);
  });
});
