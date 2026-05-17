import { parseMarkdownlintOutput } from '../src/tools/markdownlint';
import { ChangedFile } from '../src/types';

describe('parseMarkdownlintOutput', () => {
  const changed: ChangedFile[] = [
    {
      filename: 'README.md',
      status: 'modified',
      additions: 1,
      deletions: 0,
      changedLines: [7],
    },
  ];

  it('parses the array shape (one violation per item)', () => {
    const json = JSON.stringify([
      {
        fileName: 'README.md',
        lineNumber: 7,
        ruleNames: ['MD013', 'line-length'],
        ruleDescription: 'Line length',
        errorDetail: 'Expected: 80; Actual: 130',
      },
    ]);
    const findings = parseMarkdownlintOutput(json, changed);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule_id).toBe('QUAL.DOC.001');
    expect(findings[0].explanation).toContain('MD013');
  });

  it('parses the object-of-files shape', () => {
    const json = JSON.stringify({
      files: {
        'README.md': [
          { lineNumber: 7, ruleNames: ['MD009'], ruleDescription: 'Trailing space' },
        ],
      },
    });
    expect(parseMarkdownlintOutput(json, changed)).toHaveLength(1);
  });

  it('skips violations on unchanged lines', () => {
    const json = JSON.stringify([{ fileName: 'README.md', lineNumber: 999, ruleNames: ['MD001'] }]);
    expect(parseMarkdownlintOutput(json, changed)).toEqual([]);
  });

  it('skips violations on files outside the diff', () => {
    const json = JSON.stringify([{ fileName: 'OTHER.md', lineNumber: 7, ruleNames: ['MD001'] }]);
    expect(parseMarkdownlintOutput(json, changed)).toEqual([]);
  });

  it('returns empty on invalid JSON', () => {
    expect(parseMarkdownlintOutput('not json', changed)).toEqual([]);
  });

  it('returns empty when JSON has no recognisable shape', () => {
    expect(parseMarkdownlintOutput('null', changed)).toEqual([]);
  });

  it('handles violations missing a fileName gracefully', () => {
    const json = JSON.stringify([{ lineNumber: 7, ruleNames: ['MD001'] }]);
    expect(parseMarkdownlintOutput(json, changed)).toEqual([]);
  });

  it('handles missing ruleNames and errorDetail gracefully', () => {
    const json = JSON.stringify([
      { fileName: 'README.md', lineNumber: 7 },
    ]);
    const findings = parseMarkdownlintOutput(json, changed);
    expect(findings).toHaveLength(1);
    expect(findings[0].explanation).toContain('MD000');
  });
});
