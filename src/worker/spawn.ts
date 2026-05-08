// Spawn abstraction. Tests inject a fake; production passes realSpawn.
// Always invokes child_process.spawn with shell:false so argv arrays are
// safe even when arguments contain spaces or characters that would otherwise
// require shell quoting.

import { spawn } from 'node:child_process';

export interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type SpawnFn = (
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
  }
) => Promise<SpawnResult>;

export const realSpawn: SpawnFn = (command, args, options = {}) =>
  new Promise<SpawnResult>((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let resolved = false;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
      stdio: 'pipe'
    });
    const timer = options.timeoutMs
      ? setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try {
              child.kill('SIGKILL');
            } catch {
              // already exited
            }
            reject(new Error(`spawn timed out after ${options.timeoutMs}ms`));
          }
        }, options.timeoutMs)
      : null;
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        resolve({ code: typeof code === 'number' ? code : -1, stdout, stderr });
      }
    });
  });
