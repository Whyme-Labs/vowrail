import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentSecrets } from '../scripts/deploy-workers.js';

test('Workers upload contains only the approved server credentials and session key', () => {
  const env = { PAYPAL_CLIENT_ID: 'synthetic-client', PAYPAL_CLIENT_SECRET: 'synthetic-secret', OPENROUTER_API_KEY: 'synthetic-key',
    BUYER_PASSWORD: 'must-not-upload', AI_API_KEY: 'unrelated-legacy-key', CLOUDFLARE_API_TOKEN: 'must-not-upload', OTHER_PROJECT: 'must-not-upload' };
  const values = deploymentSecrets(env, '0'.repeat(64));
  assert.deepEqual(Object.keys(values).sort(), ['OPENROUTER_API_KEY', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'SESSION_SECRET']);
  assert.equal(values.PAYPAL_CLIENT_SECRET, env.PAYPAL_CLIENT_SECRET);
  assert.throws(() => deploymentSecrets({ ...env, OPENROUTER_API_KEY: '' }, '0'.repeat(64)), /Missing existing server credentials: OPENROUTER_API_KEY/);
  assert.throws(() => deploymentSecrets(env, 'short'), /Invalid session signing secret/);
});
