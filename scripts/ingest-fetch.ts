#!/usr/bin/env tsx
/**
 * Fetch latest data from upstream sources.
 * Used by: ingest.yml (GitHub Actions automated ingestion)
 *
 * This delegates to the existing ingest.ts pipeline which fetches from
 * BIS APIs, FATF dumps, FSB/IAIS sitemaps, and IOSCO sources.
 */

import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('[ingest-fetch] Starting upstream data fetch...');

try {
  // Delegate to existing ingest.ts which handles all source fetching
  execFileSync('npx', ['tsx', 'scripts/ingest.ts'], {
    cwd: projectRoot,
    stdio: 'inherit',
    timeout: 300_000, // 5 min timeout
  });

  console.log('[ingest-fetch] Fetch complete.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ingest-fetch] Fetch failed: ${message}`);
  // Don't exit 1 if upstream is down -- log warning, exit 0
  // This prevents CI from failing on transient upstream issues
  if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT') || message.includes('fetch failed')) {
    console.warn('[ingest-fetch] Upstream appears down -- skipping this cycle.');
    process.exit(0);
  }
  process.exit(1);
}
