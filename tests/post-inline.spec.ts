import { buildInlineComments, postInlineReview, renderFindingBody } from '../src/github/post-inline';
import { Finding } from '../src/types';

const sample: Finding = {
  rule_id: 'QUAL.STYLE.001',
  severity: 'HIGH',
  confidence: 0.9,
  file: 'src/a.ts',
  line: 5,
  explanation: 'because',
  remediation: 'fix it',
  citation_url: 'https://x/y',
  source: 'eslint',
  rule_pack_version: '1.0.0',
  analyzer_versions: { eslint: '8.57.0' },
};

describe('renderFindingBody', () => {
  it('includes severity, rule_id, explanation, remediation', () => {
    const body = renderFindingBody(sample);
    expect(body).toContain('[HIGH] QUAL.STYLE.001');
    expect(body).toContain('because');
    expect(body).toContain('fix it');
    expect(body).toContain('https://x/y');
  });
});

describe('buildInlineComments', () => {
  it('skips findings without a line or file', () => {
    const items = buildInlineComments([sample, { ...sample, line: 0 }, { ...sample, file: '' }]);
    expect(items).toHaveLength(1);
    expect(items[0].path).toBe('src/a.ts');
    expect(items[0].side).toBe('RIGHT');
  });
});

describe('postInlineReview', () => {
  function fakeOctokit() {
    const create = jest.fn().mockResolvedValue({ data: {} });
    return { create, octokit: { rest: { pulls: { createReview: create } } } as never };
  }

  it('posts a single review when there are no comments', async () => {
    const { create, octokit } = fakeOctokit();
    await postInlineReview(octokit, 'o', 'r', 1, 'sha', [], 'summary');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].body).toBe('summary');
    expect(create.mock.calls[0][0].comments).toBeUndefined();
  });

  it('posts one batch when comments fit in a single batch', async () => {
    const { create, octokit } = fakeOctokit();
    const comments = buildInlineComments([sample, { ...sample, line: 6 }]);
    await postInlineReview(octokit, 'o', 'r', 1, 'sha', comments, 'summary');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].event).toBe('COMMENT');
  });

  it('splits into multiple batches when comments exceed 50', async () => {
    const { create, octokit } = fakeOctokit();
    const comments = Array.from({ length: 75 }, (_, i) => ({
      path: 'src/a.ts', line: i + 1, side: 'RIGHT' as const, body: 'b',
    }));
    await postInlineReview(octokit, 'o', 'r', 1, 'sha', comments, 'summary');
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].body).toBe('summary');
  });
});
