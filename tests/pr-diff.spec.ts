import { extractChangedLines, fetchChangedFiles, estimateTokens } from '../src/github/pr-diff';
import { MULTI_HUNK_PATCH, PATCH_DELETION_ONLY, SIMPLE_TS_PATCH } from './fixtures/diffs';

describe('extractChangedLines', () => {
  it('returns added line numbers from a simple patch', () => {
    const lines = extractChangedLines(SIMPLE_TS_PATCH);
    expect(lines).toEqual([2, 3, 4, 5]);
  });

  it('handles multi-hunk patches correctly', () => {
    const lines = extractChangedLines(MULTI_HUNK_PATCH);
    expect(lines).toContain(2);
    expect(lines).toContain(22);
    expect(lines).toContain(23);
  });

  it('returns empty for deletion-only patches', () => {
    const lines = extractChangedLines(PATCH_DELETION_ONLY);
    expect(lines).toEqual([]);
  });

  it('returns empty when the patch is unparseable', () => {
    expect(extractChangedLines('not a diff')).toEqual([]);
  });

  it('accepts a patch already prefixed with diff --git', () => {
    const patch = `diff --git a/x b/x
--- a/x
+++ b/x
@@ -1,1 +1,2 @@
 line1
+line2`;
    expect(extractChangedLines(patch)).toEqual([2]);
  });
});

describe('estimateTokens', () => {
  it('accounts for overhead per file', () => {
    expect(estimateTokens([])).toBe(0);
    expect(estimateTokens([{
      filename: 'a.ts', status: 'modified', additions: 0, deletions: 0, changedLines: [],
    }])).toBe(200);
  });

  it('grows with patch size', () => {
    const small = estimateTokens([{
      filename: 'a.ts', status: 'modified', patch: 'x'.repeat(400), additions: 1, deletions: 0, changedLines: [],
    }]);
    expect(small).toBe(200 + 100);
  });
});

describe('fetchChangedFiles', () => {
  it('paginates and maps each file', async () => {
    const paginated = [
      {
        filename: 'src/foo.ts',
        status: 'modified',
        additions: 4,
        deletions: 0,
        patch: SIMPLE_TS_PATCH,
      },
    ];
    const octokit = {
      paginate: jest.fn().mockResolvedValue(paginated),
      rest: { pulls: { listFiles: jest.fn() } },
    } as never;
    const out = await fetchChangedFiles(octokit, 'sfg-labs', 'foo', 12);
    expect(out).toHaveLength(1);
    expect(out[0].filename).toBe('src/foo.ts');
    expect(out[0].changedLines.length).toBeGreaterThan(0);
  });

  it('handles files without a patch (binary / rename)', async () => {
    const octokit = {
      paginate: jest.fn().mockResolvedValue([
        { filename: 'logo.png', status: 'modified', additions: 0, deletions: 0 },
      ]),
      rest: { pulls: { listFiles: jest.fn() } },
    } as never;
    const out = await fetchChangedFiles(octokit, 'a', 'b', 1);
    expect(out[0].changedLines).toEqual([]);
  });
});
