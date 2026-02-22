#!/usr/bin/env tsx
/**
 * Regenerate data/coverage.json from current database state.
 * Used by: ingest.yml (after DB rebuild)
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

function main(): void {
  if (!fs.existsSync(DB_PATH)) {
    console.error('[update-coverage] Database not found at', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  try {
    const sources = db.prepare(`
      SELECT s.id, s.full_name, s.authority, s.official_portal, s.last_updated,
             s.update_frequency, s.freshness_days, s.coverage_note,
             COUNT(p.rowid) AS item_count
      FROM sources s
      LEFT JOIN provisions p ON p.source_id = s.id
      GROUP BY s.id
      ORDER BY s.id
    `).all() as Array<{
      id: string; full_name: string; authority: string; official_portal: string | null;
      last_updated: string | null; update_frequency: string | null;
      freshness_days: number | null; coverage_note: string | null; item_count: number;
    }>;

    const totalItems = sources.reduce((sum, s) => sum + s.item_count, 0);
    const dbStat = fs.statSync(DB_PATH);
    const dbSizeMb = Math.round(dbStat.size / (1024 * 1024));

    // Read existing coverage to preserve gaps and tools
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(COVERAGE_PATH)) {
      existing = JSON.parse(fs.readFileSync(COVERAGE_PATH, 'utf-8'));
    }

    const coverage = {
      schema_version: '1.0',
      mcp_name: 'International Financial Regulation MCP',
      mcp_type: 'domain_intelligence',
      coverage_date: new Date().toISOString().slice(0, 10),
      database_version: '0.1.0',
      sources: sources.map(s => ({
        id: s.id,
        name: s.full_name,
        authority: s.authority,
        url: s.official_portal ?? '',
        version: s.last_updated ?? 'unknown',
        item_count: s.item_count,
        item_type: 'provision',
        last_refresh: s.last_updated ?? 'unknown',
        refresh_frequency: 'monthly',
        completeness: s.id === 'FATF_REC' ? 'full' : s.id === 'FATF_LIST' ? 'snapshot' : 'partial',
        completeness_note: s.coverage_note ?? '',
      })),
      gaps: (existing as any).gaps ?? [],
      tools: (existing as any).tools ?? [],
      summary: {
        total_tools: 11,
        total_sources: sources.length,
        total_items: totalItems,
        db_size_mb: dbSizeMb,
        known_gaps: ((existing as any).gaps ?? []).length,
        gaps_planned: ((existing as any).gaps ?? []).filter((g: any) => g.planned).length,
      },
    };

    fs.writeFileSync(COVERAGE_PATH, JSON.stringify(coverage, null, 2) + '\n');
    console.log(`[update-coverage] Updated coverage.json: ${sources.length} sources, ${totalItems} items, ${dbSizeMb} MB`);
  } finally {
    db.close();
  }
}

main();
