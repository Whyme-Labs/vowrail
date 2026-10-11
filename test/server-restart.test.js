import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

test('server entry point uses the local journal by default and survives a normal restart', { timeout: 30000 }, async t => {
  const dir = mkdtempSync(join(tmpdir(), 'vowrail-server-'));
  let child;
  const stop = () => new Promise(resolve => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', resolve); child.kill('SIGTERM');
  });
  t.after(async () => { await stop(); rmSync(dir, { recursive: true, force: true }); });
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  async function start() {
    child = spawn(process.execPath, [fileURLToPath(new URL('../src/server.js', import.meta.url))], {
      cwd: dir, env: { HOST: '127.0.0.1', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe']
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(Error('Local server startup exceeded 10 seconds')); }, 10000);
      let output = '';
      child.stdout.on('data', data => {
        output += data;
        if (output.includes('Vowrail local demo at')) { clearTimeout(timer); resolve(); }
      });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(Error('Local server exited: ' + code)); });
    });
  }
  const base = 'http://127.0.0.1:' + port;
  await start();
  const created = await fetch(base + '/api/intents', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: 'Synthetic restart order', quantity: 1, maxTotalMinor: 10000, maxRounds: 1 }) });
  assert.equal(created.status, 201);
  const intent = await created.json();
  assert.ok(existsSync(join(dir, '.vowrail', 'journal')));
  await stop(); await start();
  const restored = await (await fetch(base + '/api/intents/' + intent.intentId)).json();
  assert.deepEqual(restored, intent);
  const health = await (await fetch(base + '/api/health')).json();
  assert.equal(health.store, 'local-file-journal');
  assert.equal(health.paypalConfigured, false);
  assert.equal(health.aiConfigured, false);
});

test('simulation server entry ignores inherited provider configuration and never attempts external fetch', { timeout: 30000 }, async t => {
  const dir = mkdtempSync(join(tmpdir(), 'vowrail-demo-entry-'));
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const serverUrl = new URL('../src/server.js', import.meta.url).href;
  let output = '';
  const child = spawn(process.execPath, ['--input-type=module', '-e',
    'globalThis.fetch = () => { console.error("EXTERNAL_FETCH_ATTEMPT"); throw Error("No provider calls allowed"); }; await import(' + JSON.stringify(serverUrl) + ');'], {
    cwd: dir, env: { HOST: '127.0.0.1', PORT: String(port), DEMO_MODE: '1',
      AI_API_KEY: 'synthetic-unused', AI_MODEL: 'synthetic-unused', AI_MERCHANTS: '1',
      AI_BASE_URL: 'invalid-unused', PAYPAL_CLIENT_ID: 'synthetic-unused', PAYPAL_CLIENT_SECRET: 'synthetic-unused',
      PUBLIC_BASE_URL: 'https://unused.example' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stderr.on('data', data => { output += data; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) await new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); });
    rmSync(dir, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(Error('Demo startup exceeded 10 seconds')); }, 10000);
    child.stdout.on('data', data => { output += data; if (output.includes('Vowrail local demo at')) { clearTimeout(timer); resolve(); } });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(Error('Demo server exited: ' + code)); });
  });
  const base = 'http://127.0.0.1:' + port;
  const health = await (await fetch(base + '/api/health')).json();
  assert.equal(health.aiConfigured, false); assert.equal(health.paypalConfigured, false); assert.equal(health.checkoutMode, 'simulation');
  const post = async (path, body = {}, headers = {}) => (await fetch(base + path, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })).json();
  const intent = await post('/api/intents', { item: 'Synthetic full demo', quantity: 100, maxTotalMinor: 22000, maxRounds: 2 });
  const path = '/api/intents/' + intent.intentId;
  await post(path + '/rounds', {}, { 'Idempotency-Key': 'demo-entry-round' });
  const advice = await post(path + '/recommend');
  assert.equal(advice.mode, 'deterministic');
  const box = (await post(path + '/checkout', { offerId: advice.offerId })).checkout;
  await post(path + '/simulation-approval', { orderId: box.orderId });
  assert.equal((await post(path + '/capture', { orderId: box.orderId })).state, 'COMPLETED');
  assert.ok(existsSync(join(dir, '.vowrail/simulation/gateway')));
  assert.ok(existsSync(join(dir, '.vowrail/simulation/provider')));
  assert.equal(existsSync(join(dir, '.vowrail/journal')), false);
  assert.equal(output.includes('EXTERNAL_FETCH_ATTEMPT'), false);
});
