import * as core from '@actions/core';
import * as github from '@actions/github';

const createReviewMock = jest.fn().mockResolvedValue({ data: { id: 1 } });
const paginateMock = jest.fn();

// Mock Octokit so we control responses directly without network.
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    paginate: paginateMock,
    rest: {
      pulls: {
        listFiles: jest.fn(),
        createReview: createReviewMock,
      },
    },
  })),
}));

// Mock Anthropic SDK so the runner never tries a real network call.
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '[]' }] }),
    },
  }));
});

// Mock the static analyzers so we don't shell out during tests.
jest.mock('../src/tools/runner', () => ({
  buildAnalyzers: jest.fn().mockReturnValue([]),
  runAllAnalyzers: jest.fn().mockResolvedValue([
    {
      rule_id: 'QUAL.STYLE.001',
      severity: 'HIGH',
      confidence: 0.95,
      file: 'src/foo.ts',
      line: 5,
      explanation: 'eslint: prefer const',
      remediation: 'use const',
      citation_url: 'u',
      source: 'eslint',
      rule_pack_version: '1.0.0',
      analyzer_versions: { eslint: '8.57.0' },
    },
  ]),
}));

const { run } = require('../src/runner');

describe('run (end-to-end)', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    createReviewMock.mockClear();
    paginateMock.mockReset();
    paginateMock.mockResolvedValue([
      {
        filename: 'src/foo.ts',
        status: 'modified',
        additions: 1,
        deletions: 0,
        patch: '@@ -1,2 +1,3 @@\n line1\n+let foo = 1;\n line2',
      },
    ]);

    process.env.GITHUB_REPOSITORY = 'sfg-labs/nma-india-engine';
    process.env.GITHUB_WORKSPACE = process.cwd();
    process.env['INPUT_ANTHROPIC-API-KEY'] = 'sk-test';
    process.env['INPUT_GITHUB-TOKEN'] = 'gh_test';
    process.env['INPUT_CONFIG-PATH'] = '.github/ai-review.yml';
    process.env['INPUT_MODEL'] = 'claude-sonnet-4-6';
    process.env['INPUT_MAX-TOKENS'] = '50000';
    (github as { context: unknown }).context = {
      repo: { owner: 'sfg-labs', repo: 'nma-india-engine' },
      payload: {
        pull_request: {
          number: 42,
          head: { sha: 'abc123' },
        },
      },
    };
  });

  afterEach(() => {
    process.env = { ...origEnv };
    jest.restoreAllMocks();
  });

  it('posts a single COMMENT review with the static-analyzer finding', async () => {
    const setOutput = jest.spyOn(core, 'setOutput').mockImplementation(() => undefined);
    await run();
    expect(createReviewMock).toHaveBeenCalledTimes(1);
    const call = createReviewMock.mock.calls[0][0];
    expect(call.event).toBe('COMMENT');
    expect(call.comments?.[0].path).toBe('src/foo.ts');
    expect(setOutput).toHaveBeenCalledWith('verdict', 'COMMENT');
    expect(setOutput).toHaveBeenCalledWith('finding-count', '1');
  });

  it('skips politely when token budget is exceeded', async () => {
    process.env['INPUT_MAX-TOKENS'] = '1';
    const setOutput = jest.spyOn(core, 'setOutput').mockImplementation(() => undefined);
    await run();
    expect(createReviewMock).toHaveBeenCalledTimes(1);
    const body = createReviewMock.mock.calls[0][0].body as string;
    expect(body).toContain('skipped');
    expect(setOutput).toHaveBeenCalledWith('finding-count', '0');
  });

  it('does nothing when not running on a pull_request event', async () => {
    (github as { context: unknown }).context = {
      repo: { owner: 'sfg-labs', repo: 'nma-india-engine' },
      payload: {},
    };
    const infoSpy = jest.spyOn(core, 'info').mockImplementation(() => undefined);
    await run();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Not a pull request'));
    expect(createReviewMock).not.toHaveBeenCalled();
  });

  it('respects ai-review.yml disabling the quality reviewer', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cfgDir = path.join(process.cwd(), '.github');
    const cfgFile = path.join(cfgDir, 'ai-review.yml');
    fs.mkdirSync(cfgDir, { recursive: true });
    const existed = fs.existsSync(cfgFile);
    const original = existed ? fs.readFileSync(cfgFile, 'utf8') : null;
    fs.writeFileSync(cfgFile, 'quality:\n  enabled: false\n');
    try {
      const infoSpy = jest.spyOn(core, 'info').mockImplementation(() => undefined);
      await run();
      expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('disabled'));
      expect(createReviewMock).not.toHaveBeenCalled();
    } finally {
      if (original !== null) fs.writeFileSync(cfgFile, original);
      else fs.unlinkSync(cfgFile);
    }
  });

  it('fails gracefully when octokit throws', async () => {
    paginateMock.mockRejectedValueOnce(new Error('boom'));
    const setFailed = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined);
    await run();
    expect(setFailed).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('reports non-Error throws too', async () => {
    paginateMock.mockImplementationOnce(() => { throw 'string error'; });
    const setFailed = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined);
    await run();
    expect(setFailed).toHaveBeenCalledWith(expect.stringContaining('string error'));
  });
});
