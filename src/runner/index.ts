import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAutonomyLoop } from '@/autonomy/index';
import { runWorkerLoop } from '@/worker/index';

function log(message: string): void {
  process.stdout.write(`${new Date().toISOString()} [media-runner] ${message}\n`);
}

export async function runMediaRunner(): Promise<void> {
  const workerSignal = { aborted: false };
  for (const name of ['SIGTERM', 'SIGINT']) {
    process.on(name, () => {
      workerSignal.aborted = true;
      log(`received ${name}; draining worker and autonomy controller`);
    });
  }

  log('starting co-located FFmpeg worker + autonomous controller');
  const worker = runWorkerLoop({
    shutdownSignal: workerSignal,
    log: (message) => log(`[worker] ${message}`)
  });
  const autonomy = runAutonomyLoop();

  const results = await Promise.allSettled([worker, autonomy]);
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failure) throw failure.reason;
  log('media runner stopped cleanly');
}

const invokedAs = process.argv[1] ? path.resolve(process.argv[1]) : '';
const thisModule = path.resolve(fileURLToPath(import.meta.url));
if (invokedAs && invokedAs === thisModule) {
  runMediaRunner().catch((err) => {
    process.stderr.write(`[media-runner] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  });
}
