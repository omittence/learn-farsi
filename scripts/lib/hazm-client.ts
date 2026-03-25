import { spawn, type ChildProcess } from 'child_process';
import { createInterface, type Interface } from 'readline';
import { resolve } from 'path';

export interface HazmToken {
  surface: string;
  lemma: string;
  pos: string;
  pos_tag: string;
  dep_head: number;
  dep_rel: string;
}

export interface HazmSentence {
  text: string;
  tokens: HazmToken[];
}

export interface HazmResult {
  normalized_text: string;
  sentences: HazmSentence[];
}

interface HazmClient {
  analyze(text: string, splitOnNewlines?: boolean): Promise<HazmResult>;
  stop(): Promise<void>;
}

export async function startHazm(): Promise<HazmClient> {
  const scriptPath = resolve(process.cwd(), 'scripts/hazm_service.py');

  const proc: ChildProcess = spawn('python', [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const rl: Interface = createInterface({ input: proc.stdout! });

  // Forward stderr for debugging
  proc.stderr!.on('data', (chunk: Buffer) => {
    process.stderr.write(`[hazm] ${chunk.toString()}`);
  });

  // Wait for the "ready" signal
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('hazm_service failed to start within 30s')),
      30_000,
    );

    const onLine = (line: string) => {
      try {
        const msg = JSON.parse(line);
        if (msg.status === 'ready') {
          clearTimeout(timeout);
          rl.removeListener('line', onLine);
          resolve();
        }
      } catch {
        // not JSON yet, ignore
      }
    };

    rl.on('line', onLine);

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to spawn hazm_service: ${err.message}`));
    });

    proc.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`hazm_service exited with code ${code} during startup`));
    });
  });

  // Pending request queue (sequential, one at a time)
  let pending: {
    resolve: (result: HazmResult) => void;
    reject: (err: Error) => void;
  } | null = null;

  rl.on('line', (line: string) => {
    if (!pending) return;
    const { resolve: res, reject: rej } = pending;
    pending = null;

    try {
      const parsed = JSON.parse(line);
      if (parsed.error) {
        rej(new Error(`hazm error: ${parsed.error}`));
      } else {
        res(parsed as HazmResult);
      }
    } catch (e) {
      rej(new Error(`Failed to parse hazm response: ${line}`));
    }
  });

  async function analyze(
    text: string,
    splitOnNewlines = false,
  ): Promise<HazmResult> {
    if (!proc.stdin!.writable) {
      throw new Error('hazm_service stdin is not writable');
    }

    return new Promise<HazmResult>((resolve, reject) => {
      pending = { resolve, reject };
      const req = JSON.stringify({ text, split_on_newlines: splitOnNewlines });
      proc.stdin!.write(req + '\n');
    });
  }

  async function stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      proc.on('exit', () => resolve());
      proc.stdin!.end();
      // Force kill after 5s if it hasn't exited
      setTimeout(() => {
        proc.kill('SIGKILL');
        resolve();
      }, 5_000);
    });
  }

  return { analyze, stop };
}
