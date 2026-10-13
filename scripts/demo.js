// Explicit no-provider rehearsal, even if the shell already contains credentials.
process.env.DEMO_MODE = '1';
process.env.SIMULATE_LOST_CAPTURE = process.argv.includes('--recovery') ? '1' : '';
await import('../src/server.js');
