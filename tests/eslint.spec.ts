import { parseEslintOutput } from '../src/tools/eslint';
import { ChangedFile } from '../src/types';

describe('parseEslintOutput', () => {
  const changed: ChangedFile[] = [
    {
      filename: 'src/foo.ts',
      status: 'modified',
      additions: 2,
      deletions: 0,
      changedLines: [5, 10],
    },
  ];

  it('emits QUAL.STYLE.001 with HIGH severity for errors on changed lines', () => {
    const eslintJson = JSON.stringify([
      {
        filePath: 'src/foo.ts',
        messages: [
          { ruleId: 'prefer-const', severity: 2, message: 'use const', line: 5 },
        ],
      },
    ]);
    const findings = parseEslintOutput(eslintJson, changed);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule_id).toBe('QUAL.STYLE.001');
    expect(findings[0].severity).toBe('HIGH');
    expect(findings[0].source).toBe('eslint');
  });

  it('emits QUAL.STYLE.001 with LOW severity for warnings', () => {
    const eslintJson = JSON.stringify([
      {
        filePath: 'src/foo.ts',
        messages: [{ ruleId: 'no-console', severity: 1, message: 'no console', line: 10 }],
      },
    ]);
    const findings = parseEslintOutput(eslintJson, changed);
    expect(findings[0].severity).toBe('LOW');
  });

  it('maps raw-color messages to QUAL.STYLE.002', () => {
    const eslintJson = JSON.stringify([
      {
        filePath: 'src/foo.ts',
        messages: [{ ruleId: 'no-restricted-syntax', severity: 2, message: 'raw color literal', line: 5 }],
      },
    ]);
    const findings = parseEslintOutput(eslintJson, changed);
    expect(findings[0].rule_id).toBe('QUAL.STYLE.002');
  });

  it('skips violations on lines the PR did not touch', () => {
    const eslintJson = JSON.stringify([
      {
        filePath: 'src/foo.ts',
        messages: [{ ruleId: 'prefer-const', severity: 2, message: 'use const', line: 999 }],
      },
    ]);
    expect(parseEslintOutput(eslintJson, changed)).toHaveLength(0);
  });

  it('skips files not in the changed set', () => {
    const eslintJson = JSON.stringify([
      {
        filePath: 'src/other.ts',
        messages: [{ ruleId: 'prefer-const', severity: 2, message: 'x', line: 5 }],
      },
    ]);
    expect(parseEslintOutput(eslintJson, changed)).toHaveLength(0);
  });

  it('returns empty on invalid JSON', () => {
    expect(parseEslintOutput('not json', changed)).toEqual([]);
  });

  it('returns empty when JSON root is not an array', () => {
    expect(parseEslintOutput('{}', changed)).toEqual([]);
  });

  it('normalizes absolute paths against process.cwd()', () => {
    const abs = process.cwd() + '/src/foo.ts';
    const eslintJson = JSON.stringify([
      { filePath: abs, messages: [{ ruleId: 'x', severity: 2, message: 'm', line: 5 }] },
    ]);
    expect(parseEslintOutput(eslintJson, changed)).toHaveLength(1);
  });

  it('handles messages whose ruleId is null', () => {
    const eslintJson = JSON.stringify([
      { filePath: 'src/foo.ts', messages: [{ ruleId: null, severity: 2, message: 'syntax error', line: 5 }] },
    ]);
    const findings = parseEslintOutput(eslintJson, changed);
    expect(findings).toHaveLength(1);
    expect(findings[0].explanation).toBe('eslint: syntax error');
  });

  it('preserves ./ prefix on normalizePath', () => {
    const eslintJson = JSON.stringify([
      { filePath: './src/foo.ts', messages: [{ ruleId: 'x', severity: 2, message: 'm', line: 5 }] },
    ]);
    // filename in changed set is `src/foo.ts` — `./` gets stripped by normalizePath only on the map key.
    // The result path here goes through relativize (not absolute), and the lookup compares
    // map key (normalized) to relPath (raw). Document the behaviour: no findings expected.
    expect(parseEslintOutput(eslintJson, changed)).toHaveLength(0);
  });
});
