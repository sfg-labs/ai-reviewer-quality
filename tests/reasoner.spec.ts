import { buildPrompt, extractJsonArray, extractText, normalizeFinding, reason, QUALITY_SYSTEM_PROMPT } from '../src/claude/reasoner';
import { ChangedFile } from '../src/types';

describe('extractJsonArray', () => {
  it('parses a bare JSON array', () => {
    expect(extractJsonArray('[{"a":1}]')).toEqual([{ a: 1 }]);
  });

  it('parses an array wrapped in a fenced block', () => {
    expect(extractJsonArray('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }]);
  });

  it('parses an array surrounded by prose', () => {
    expect(extractJsonArray('Here are the findings:\n[{"a":1}]\nThanks!')).toEqual([{ a: 1 }]);
  });

  it('returns empty when no array is present', () => {
    expect(extractJsonArray('no findings')).toEqual([]);
  });

  it('returns empty when the embedded JSON is malformed', () => {
    expect(extractJsonArray('[{a:1}]')).toEqual([]);
  });

  it('returns empty when the JSON parses to a non-array', () => {
    // Will not match the [ ... ] pattern, falls through to empty.
    expect(extractJsonArray('{"a":1}')).toEqual([]);
  });

  it('returns empty when the candidate slice happens to be a non-array literal', () => {
    // The slice from `[` to `]` produces `[1, 2]` here, parses to array — keep distinct from above.
    expect(extractJsonArray('[1, 2]')).toEqual([1, 2]);
  });
});

describe('normalizeFinding', () => {
  const changed: ChangedFile[] = [
    { filename: 'src/a.ts', status: 'modified', additions: 1, deletions: 0, changedLines: [10] },
  ];

  const base = {
    rule_id: 'QUAL.NAMING.001',
    severity: 'low',
    confidence: 0.8,
    file: 'src/a.ts',
    line: 10,
    explanation: 'bad name',
    remediation: 'rename it',
  };

  it('normalises a valid finding', () => {
    const f = normalizeFinding(base, changed);
    expect(f).not.toBeNull();
    expect(f!.severity).toBe('LOW');
    expect(f!.source).toBe('claude');
    expect(f!.citation_url).toContain('QUAL.NAMING.001');
  });

  it('clamps confidence into [0, 1]', () => {
    expect(normalizeFinding({ ...base, confidence: -2 }, changed)!.confidence).toBe(0);
    expect(normalizeFinding({ ...base, confidence: 3 }, changed)!.confidence).toBe(1);
  });

  it('defaults confidence when missing', () => {
    expect(normalizeFinding({ ...base, confidence: undefined }, changed)!.confidence).toBe(0.7);
  });

  it('rejects unknown rule ids', () => {
    expect(normalizeFinding({ ...base, rule_id: 'NOT_REAL' }, changed)).toBeNull();
  });

  it('rejects missing file or line', () => {
    expect(normalizeFinding({ ...base, file: '' }, changed)).toBeNull();
    expect(normalizeFinding({ ...base, line: 0 }, changed)).toBeNull();
  });

  it('rejects missing explanation or remediation', () => {
    expect(normalizeFinding({ ...base, explanation: '' }, changed)).toBeNull();
    expect(normalizeFinding({ ...base, remediation: '' }, changed)).toBeNull();
  });

  it('rejects invalid severity', () => {
    expect(normalizeFinding({ ...base, severity: 'BOGUS' }, changed)).toBeNull();
  });

  it('rejects findings on files outside the diff', () => {
    expect(normalizeFinding({ ...base, file: 'src/other.ts' }, changed)).toBeNull();
  });

  it('rejects findings on lines outside the diff', () => {
    expect(normalizeFinding({ ...base, line: 99 }, changed)).toBeNull();
  });

  it('defaults severity to MEDIUM when missing', () => {
    const f = normalizeFinding({ ...base, severity: undefined }, changed);
    expect(f!.severity).toBe('MEDIUM');
  });
});

describe('buildPrompt', () => {
  it('includes filename and patch in the prompt', () => {
    const p = buildPrompt([
      { filename: 'src/x.ts', status: 'added', additions: 2, deletions: 0, patch: 'PATCH', changedLines: [1, 2] },
    ]);
    expect(p).toContain('src/x.ts');
    expect(p).toContain('PATCH');
  });

  it('handles files without a patch', () => {
    const p = buildPrompt([
      { filename: 'logo.png', status: 'modified', additions: 0, deletions: 0, changedLines: [] },
    ]);
    expect(p).toContain('binary or renamed only');
  });
});

describe('extractText', () => {
  it('joins all text blocks', () => {
    expect(extractText({ content: [
      { type: 'text', text: 'a' },
      { type: 'tool_use' },
      { type: 'text', text: 'b' },
    ] })).toBe('a\nb');
  });

  it('returns empty for nullish input', () => {
    expect(extractText(undefined)).toBe('');
    expect(extractText('string')).toBe('');
    expect(extractText({})).toBe('');
  });
});

describe('QUALITY_SYSTEM_PROMPT', () => {
  it('mentions all 13 rule ids', () => {
    const ids = [
      'QUAL.SOLID.001', 'QUAL.DEAD.001', 'QUAL.CLONE.001', 'QUAL.TEST.001', 'QUAL.DOC.001',
      'QUAL.DEP.001', 'QUAL.DEP.002', 'QUAL.STYLE.001', 'QUAL.STYLE.002', 'QUAL.NAMING.001',
      'QUAL.A11Y.001', 'QUAL.IMPORT.001', 'QUAL.COMMENT.001',
    ];
    for (const id of ids) expect(QUALITY_SYSTEM_PROMPT).toContain(id);
  });
});

describe('reason', () => {
  const changed: ChangedFile[] = [
    { filename: 'src/a.ts', status: 'modified', additions: 1, deletions: 0, patch: '+ stuff', changedLines: [3] },
  ];

  it('returns validated findings from the model', async () => {
    const fakeClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: '[{"rule_id":"QUAL.NAMING.001","severity":"LOW","confidence":0.7,"file":"src/a.ts","line":3,"explanation":"e","remediation":"r"}]' }],
        }),
      },
    } as never;
    const findings = await reason(changed, { apiKey: 'k', model: 'm', maxTokens: 100 }, fakeClient);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule_id).toBe('QUAL.NAMING.001');
  });

  it('returns empty when the model throws', async () => {
    const fakeClient = {
      messages: {
        create: jest.fn().mockRejectedValue(new Error('boom')),
      },
    } as never;
    expect(await reason(changed, { apiKey: 'k', model: 'm', maxTokens: 100 }, fakeClient)).toEqual([]);
  });

  it('batches changes when there are many files', async () => {
    const many: ChangedFile[] = Array.from({ length: 23 }, (_, i) => ({
      filename: `src/f${i}.ts`,
      status: 'modified',
      additions: 1,
      deletions: 0,
      patch: '+ x',
      changedLines: [1],
    }));
    const create = jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '[]' }] });
    const fakeClient = { messages: { create } } as never;
    await reason(many, { apiKey: 'k', model: 'm', maxTokens: 100, batchSize: 10 }, fakeClient);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('drops findings the model returned but that fail normalisation', async () => {
    const fakeClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: '[{"rule_id":"NOT_REAL","severity":"LOW","file":"src/a.ts","line":3}]' }],
        }),
      },
    } as never;
    expect(await reason(changed, { apiKey: 'k', model: 'm', maxTokens: 100 }, fakeClient)).toEqual([]);
  });
});
