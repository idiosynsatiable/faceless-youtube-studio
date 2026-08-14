import { spawn } from 'node:child_process';

const nextBinary = 'node_modules/next/dist/bin/next';
const tsxBinary = 'node_modules/.bin/tsx';
const port = process.env.PORT ?? '3000';

const children = [
  {
    name: 'web',
    child: spawn(process.execPath, [nextBinary, 'start', '-p', port], {
      stdio: 'inherit',
      env: process.env
    })
  },
  {
    name: 'worker',
    child: spawn(process.execPath, ['--enable-source-maps', tsxBinary, 'src/worker/index.ts'], {
      stdio: 'inherit',
      env: process.env
    })
  }
];

let terminating = false;

function stopAll(signal) {
  if (terminating) return;
  terminating = true;
  for (const { child } of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stopAll(signal));
}

for (const { name, child } of children) {
  child.on('error', (error) => {
    console.error(`railway ${name} process could not start`, error);
    stopAll('SIGTERM');
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (!terminating) {
      console.error(`railway ${name} process exited unexpectedly`, { code, signal });
      process.exitCode = code && code > 0 ? code : 1;
      stopAll('SIGTERM');
    }
  });
}

await new Promise((resolve) => {
  const check = setInterval(() => {
    if (children.every(({ child }) => child.exitCode !== null || child.killed)) {
      clearInterval(check);
      resolve();
    }
  }, 250);
});

process.exit(process.exitCode ?? 0);
