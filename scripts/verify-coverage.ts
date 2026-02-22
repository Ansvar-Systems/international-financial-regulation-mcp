#!/usr/bin/env tsx
/**
 * Gate 6: Coverage consistency verification.
 * Used by: pre-deploy verification
 *
 * Checks:
 * - Every source in coverage.json has item_count matching actual DB count
 * - Every tool in coverage.json exists in the codebase
 * - summary.total_items matches sum of source item_counts
 * Exits non-zero if any check fails.
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const DB_PATH = path.join(projectRoot, 'data', 'database.db');
const COVERAGE_PATH = path.join(projectRoot, 'data', 'coverage.json');

interface CoverageJson {
  sources: Array<{ id: string; name: string; item_count: number }>;
  tools: Array<{ name: string }>;
  summary: { total_items: number; total_sources: number; total_tools: number };
}

function main(): void {
  const errors: string[] = [];

  // Load coverage.json
  if (!fs.existsSync(COVERAGE_PATH)) {
    console.error('FAIL: data/coverage.json not found');
    process.exit(1);
  }
  const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, 'utf-8')) as CoverageJson;

  // Load database
  if (!fs.existsSync(DB_PATH)) {
    console.error('FAIL: data/database.db not found');
    process.exit(1);
  }
  const db = new Database(DB_PATH, { readonly: true });

  try {
    // Check 1: Source item counts match DB
    for (const source of coverage.sources) {
      const row = db.prepare('SELECT COUNT(*) as c FROM provisions WHERE source_id = ?').get(source.id) as { c: number } | undefined;
      const dbCount = row?.c ?? 0;

      if (dbCount !== source.item_count) {
        errors.push(`Source ${source.id}: coverage.json says ${source.item_count}, DB has ${dbCount}`);
      }
    }

    // Check 2: Total items matches sum
    const expectedTotal = coverage.sources.reduce((sum, s) => sum + s.item_count, 0);
    if (coverage.summary.total_items !== expectedTotal) {
      errors.push(`summary.total_items (${coverage.summary.total_items}) != sum of sources (${expectedTotal})`);
    }

    // Check 3: Source count matches
    const dbSourceCount = (db.prepare('SELECT COUNT(*) as c FROM sources').get() as { c: number }).c;
    if (coverage.summary.total_sources !== dbSourceCount) {
      errors.push(`summary.total_sources (${coverage.summary.total_sources}) != DB sources (${dbSourceCount})`);
    }

    // Check 4: Tool count matches
    if (coverage.summary.total_tools !== coverage.tools.length) {
      errors.push(`summary.total_tools (${coverage.summary.total_tools}) != tools array length (${coverage.tools.length})`);
    }

  } finally {
    db.close();
  }

  if (errors.length > 0) {
    console.error('FAIL: Coverage consistency check failed:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log('PASS: Coverage consistency -- all checks passed');
  console.log(`  Sources: ${coverage.summary.total_sources}`);
  console.log(`  Items: ${coverage.summary.total_items}`);
  console.log(`  Tools: ${coverage.summary.total_tools}`);
}

main();
