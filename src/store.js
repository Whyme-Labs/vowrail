import { randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, readdirSync,
  unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Small local journal of the existing Map state, not a hosted database. */
export class FileJournal {
  constructor(directory, { collection = 'intents' } = {}) {
    if (!['intents', 'orders'].includes(collection)) throw Error('Unsupported journal collection');
    this.collection = collection;
    this.kind = 'local-file-journal';
    this.directory = resolve(directory);
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const records = readdirSync(this.directory).filter(name => /^[0-9]{16}\.json$/.test(name)).sort();
    this.revision = records.length ? Number(records.at(-1).slice(0, 16)) : 0;
    this.snapshot = [];
    if (records.length) {
      const data = JSON.parse(readFileSync(join(this.directory, records.at(-1)), 'utf8'));
      if (data.version !== 1 || data.revision !== this.revision || !Array.isArray(data[collection])) {
        throw Error('Invalid local journal; preserve it for investigation');
      }
      this.snapshot = data[collection];
    }
  }

  load() { return structuredClone(this.snapshot); }

  save(records) {
    const revision = this.revision + 1;
    if (!Number.isSafeInteger(revision)) throw Error('Local journal revision exhausted');
    const staged = join(this.directory, '.pending-' + randomUUID());
    const committed = join(this.directory, String(revision).padStart(16, '0') + '.json');
    let fd;
    try {
      fd = openSync(staged, 'wx', 0o600);
      writeFileSync(fd, JSON.stringify({ version: 1, revision, [this.collection]: records }));
      fsyncSync(fd);
      closeSync(fd); fd = undefined;
      // Linking an already-flushed file publishes it without replacing any record.
      // A stale writer cannot claim the same next revision and must fail closed.
      linkSync(staged, committed);
      const directoryFd = openSync(this.directory, 'r');
      try { fsyncSync(directoryFd); } finally { closeSync(directoryFd); }
      this.revision = revision;
      this.snapshot = structuredClone(records);
    } finally {
      if (fd !== undefined) closeSync(fd);
      try { unlinkSync(staged); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
}
