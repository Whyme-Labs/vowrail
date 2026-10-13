import { readFile, writeFile, mkdir, mkdtemp, chmod, rm } from 'node:fs/promises';
import { parseEnv, promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Deliberately excludes every legacy setting, buyer password and unrelated environment value. */
export function deploymentSecrets(env, signingSecret) {
  const keys = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'OPENROUTER_API_KEY'];
  const missing = keys.filter(key => typeof env[key] !== 'string' || !env[key].length);
  if (missing.length) throw Error('Missing existing server credentials: ' + missing.join(', '));
  if (!/^[0-9a-f]{64}$/.test(signingSecret)) throw Error('Invalid session signing secret');
  return Object.fromEntries([...keys.map(key => [key, env[key]]), ['SESSION_SECRET', signingSecret]]);
}

async function main() {
  const git = promisify(execFile);
  const { stdout: dirty } = await git('git', ['status', '--porcelain']);
  if (dirty) throw Error('Commit and verify the deployment source before uploading it');
  const { stdout: head } = await git('git', ['rev-parse', 'HEAD']);
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  if (config.name !== 'vowrail-judges' || config.account_id !== '1e0170aaabc90ecf5f466128d1f0466a') {
    throw Error('Deployment target differs from the owner-approved Worker and account');
  }
  const local = parseEnv(await readFile('.env', 'utf8'));
  const keyDirectory = resolve('.vowrail/workers');
  await mkdir(keyDirectory, { recursive: true, mode: 0o700 });
  const keyPath = join(keyDirectory, 'session-secret');
  try { await writeFile(keyPath, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const secrets = deploymentSecrets(local, (await readFile(keyPath, 'utf8')).trim());
  const directory = await mkdtemp(join(tmpdir(), 'vowrail-worker-secrets-'));
  await chmod(directory, 0o700);
  try {
    const path = join(directory, 'secrets.json');
    await writeFile(path, JSON.stringify(secrets), { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ worker: config.name, sourceCommit: head.trim(), secretNames: Object.keys(secrets), valuesPrinted: false }));
    const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--secrets-file', path,
      '--var', 'SOURCE_COMMIT:' + head.trim(), '--message', 'Vowrail judge deployment ' + head.trim().slice(0, 12)],
    { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, WRANGLER_LOG: 'info', WRANGLER_SEND_METRICS: 'false' } });
    const result = await new Promise((resolveResult, reject) => { child.once('error', reject); child.once('exit', (code, signal) => resolveResult({ code, signal })); });
    if (result.code !== 0) throw Error('Wrangler deployment did not complete');
  } finally { await rm(directory, { recursive: true, force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
