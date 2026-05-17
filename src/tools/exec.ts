import { spawn } from 'child_process';

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run an external CLI (eslint, ts-prune, jscpd, markdownlint) and capture
 * stdout / stderr. Never throws on non-zero exit; analyzers use exit codes
 * to signal "findings present" which is not an error for our purposes.
 */
export function runCli(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs = 120_000
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: process.env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + e.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}
