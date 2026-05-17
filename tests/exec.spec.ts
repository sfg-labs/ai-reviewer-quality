import { runCli } from '../src/tools/exec';

describe('runCli', () => {
  it('captures stdout from a successful command', async () => {
    const res = await runCli('node', ['-e', 'console.log("hi")'], process.cwd());
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('hi');
  });

  it('captures non-zero exit codes without throwing', async () => {
    const res = await runCli('node', ['-e', 'process.exit(7)'], process.cwd());
    expect(res.code).toBe(7);
  });

  it('captures stderr', async () => {
    const res = await runCli('node', ['-e', 'console.error("err")'], process.cwd());
    expect(res.stderr).toContain('err');
  });

  it('reports a code of -1 when the binary is missing', async () => {
    const res = await runCli('definitely_not_a_binary_xyz', [], process.cwd());
    expect(res.code).toBe(-1);
    expect(res.stderr.length).toBeGreaterThan(0);
  });

  it('kills the child on timeout', async () => {
    const res = await runCli('node', ['-e', 'setTimeout(() => {}, 5000)'], process.cwd(), 100);
    expect(res.code).not.toBe(0);
  }, 10_000);
});
