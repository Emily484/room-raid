import { readdirSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';

const dir = path.resolve(new URL(import.meta.url).pathname, '..');

const files = readdirSync(dir).filter(f => f.endsWith('.mjs') && f !== 'run-all-tests.mjs').sort();

async function runFile(file) {
  const full = path.join(dir, file);
  console.log(`\n=== Running ${file} ===`);

  return new Promise((resolve) => {
    const child = spawn('node', [full], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });

    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });

    const timeoutMs = 10000; // 10s per test
    const timer = setTimeout(() => {
      console.log(`\n--- Timeout reached for ${file}, killing process ---`);
      child.kill('SIGTERM');
      // give it a moment, then force kill
      setTimeout(() => child.kill('SIGKILL'), 2000);
    }, timeoutMs);

    child.on('exit', (code, signal) => {
      clearTimeout(timer);

      if (code === 0) {
        console.log(`=> PASS ${file}`);
        resolve({ file, ok: true });
      } else {
        console.log(`=> FAIL ${file} exit=${code} signal=${signal}`);
        resolve({ file, ok: false, code, signal, stdout, stderr });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      console.log(`=> ERROR ${file}`, err);
      resolve({ file, ok: false, err });
    });
  });
}

(async function main(){
  let passed = 0;
  let failed = 0;

  for (const f of files) {
    const res = await runFile(f);
    if (res.ok) passed++; else failed++;
  }

  console.log('\nSummary: ', passed, 'passed,', failed, 'failed.');

  if (failed > 0) process.exit(1);
})();
