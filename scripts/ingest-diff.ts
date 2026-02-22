#!/usr/bin/env tsx
/**
 * Diff fetched data against current database.
 * Used by: ingest.yml (GitHub Actions)
 *
 * Compares seed file hashes against stored hashes in data/.source-hashes.json.
 * Writes:
 *   .ingest-changed  -- "true" or "false"
 *   .ingest-summary  -- human-readable change summary
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const SEED_DIR = path.join(projectRoot, 'data', 'seed');
const HASHES_FILE = path.join(projectRoot, 'data', '.source-hashes.json');

interface SourceHashes {
  last_check: string;
  sources: Record<string, string>;
}

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function loadStoredHashes(): SourceHashes {
  if (!fs.existsSync(HASHES_FILE)) {
    return { last_check: '', sources: {} };
  }
  return JSON.parse(fs.readFileSync(HASHES_FILE, 'utf-8')) as SourceHashes;
}

function main(): void {
  const stored = loadStoredHashes();
  const current: Record<string, string> = {};
  const changes: string[] = [];

  if (!fs.existsSync(SEED_DIR)) {
    console.log('[ingest-diff] No seed directory found -- marking as changed.');
    fs.writeFileSync(path.join(projectRoot, '.ingest-changed'), 'true');
    fs.writeFileSync(path.join(projectRoot, '.ingest-summary'), 'No seed directory -- full rebuild needed');
    return;
  }

  const seedFiles = fs.readdirSync(SEED_DIR).filter(f => f.endsWith('.json')).sort();

  for (const file of seedFiles) {
    const filePath = path.join(SEED_DIR, file);
    const hash = hashFile(filePath);
    current[file] = hash;

    if (!stored.sources[file]) {
      changes.push(`NEW: ${file}`);
    } else if (stored.sources[file] !== hash) {
      changes.push(`CHANGED: ${file}`);
    }
  }

  // Check for removed files
  for (const file of Object.keys(stored.sources)) {
    if (!current[file]) {
      changes.push(`REMOVED: ${file}`);
    }
  }

  const changed = changes.length > 0;
  const summary = changed
    ? `${changes.length} change(s): ${changes.join(', ')}`
    : 'No changes detected';

  console.log(`[ingest-diff] ${summary}`);

  fs.writeFileSync(path.join(projectRoot, '.ingest-changed'), String(changed));
  fs.writeFileSync(path.join(projectRoot, '.ingest-summary'), summary);

  // Update stored hashes
  const updated: SourceHashes = {
    last_check: new Date().toISOString(),
    sources: current,
  };
  fs.writeFileSync(HASHES_FILE, JSON.stringify(updated, null, 2));
}

main();
