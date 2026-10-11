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
