import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('../scripts/qualify-free-models.js', import.meta.url));
for (const platformLimit of [false, true]) {
  test('qualification runner ' + (platformLimit ? 'stops on platform limit' : 'backs off once for provider capacity'), () => {
    const directory = mkdtempSync(join(tmpdir(), 'vowrail-qualification-test-'));
    try {
      const preload = join(directory, 'preload.mjs');
      writeFileSync(preload, `
        let calls = 0;
        const realTimer = globalThis.setTimeout;
        globalThis.setTimeout = (fn, ms, ...args) => {
          if (ms >= 30000) { console.error('SYNTHETIC_BACKOFF_' + ms); return realTimer(fn, 0, ...args); }
          return realTimer(fn, ms, ...args);
        };
        globalThis.fetch = async (url, options) => {
          if (url === 'https://openrouter.ai/api/v1/models') return Response.json({ data: [{
            id: 'nvidia/nemotron-3.5-lightning:free', pricing: { prompt: '0', completion: '0' },
            supported_parameters: ['max_tokens', 'temperature', 'reasoning'], reasoning: { mandatory: false }
          }] });
          if (url !== 'https://openrouter.ai/api/v1/chat/completions') throw Error('Unexpected transport');
          const body = JSON.parse(options.body);
          if (body.provider.max_price.prompt !== 0 || body.provider.allow_fallbacks !== false) throw Error('Unsafe route');
          calls++;
          if (calls === 1) return Response.json({ error: { code: 429, message: 'Synthetic limit',
            metadata: { provider_name: 'Nvidia', provider_code: 429 } } }, { status: 429,
            headers: ${platformLimit ? "{ 'Retry-After': '1', 'X-RateLimit-Remaining': '0' }" : "{ 'Retry-After': '1' }"} });
          if (calls > 2) throw Error('Exceeded bounded retry');
          const input = JSON.parse(body.messages[1].content);
          return Response.json({ model: body.model, provider: 'Synthetic fixture', usage: { cost: 0 },
            choices: [{ message: { content: JSON.stringify({ offerId: input.offers[0].offerId, reason: 'Synthetic fixture' }) } }] });
        };
      `);
      const run = spawnSync(process.execPath, ['--import', preload, script, '--execute',
        '--model=nvidia/nemotron-3.5-lightning:free', '--cases=delivery-preference', '--retry-transient'], {
        cwd: directory, env: { OPENROUTER_API_KEY: 'synthetic-key' }, encoding: 'utf8', timeout: 3000
      });
      assert.equal(run.status, 0, run.stderr);
      const report = JSON.parse(run.stdout);
      assert.equal(report.inferenceRequests, platformLimit ? 1 : 2);
      assert.equal(report.runnerRetries, platformLimit ? 0 : 1);
      assert.equal(report.actualAdvisoryResults, platformLimit ? 0 : 1);
      assert.equal(report.stoppedForAccountOrPricingConstraint, platformLimit);
      assert.equal(run.stderr.includes('SYNTHETIC_BACKOFF_30000'), !platformLimit);
      assert.equal(report.cases.at(-1).checks.checkout, null);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
}
