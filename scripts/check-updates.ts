#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface SourceRow {
  id: string;
  full_name: string;
  update_frequency?: string | null;
  last_updated?: string | null;
  freshness_days?: number | null;
}

interface SeedSnapshot {
  sources?: SourceRow[];
}

interface FreshnessRow {
  source_id: string;
  source_name: string;
  update_frequency: string;
  last_updated: string | null;
  age_days: number | null;
  max_age_days: number;
  status: 'fresh' | 'stale' | 'unknown';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SEED_DIR = path.resolve(PROJECT_ROOT, 'data', 'seed');

function main(): void {
  const asOfArg = readOption('--as-of');
  const jsonOutputPathArg = readOption('--json-output');
  const asOfDate = asOfArg ? new Date(asOfArg) : new Date();

  if (Number.isNaN(asOfDate.valueOf())) {
    throw new Error(`Invalid --as-of date: ${asOfArg}`);
  }

  const sources = loadSources(SEED_DIR);
  const rows = sources.map((source) => toFreshnessRow(source, asOfDate));

  const summary = {
    checked_at: toIsoDate(asOfDate),
    total_sources: rows.length,
    fresh: rows.filter((row) => row.status === 'fresh').length,
    stale: rows.filter((row) => row.status === 'stale').length,
    unknown: rows.filter((row) => row.status === 'unknown').length,
    sources: rows,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (jsonOutputPathArg) {
    const outputPath = path.resolve(process.cwd(), jsonOutputPathArg);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf-8');
    console.error(`Wrote freshness report to ${outputPath}`);
  }
}

function readOption(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function loadSources(seedDir: string): SourceRow[] {
  if (!fs.existsSync(seedDir)) {
    throw new Error(`Seed directory not found: ${seedDir}`);
  }

  const jsonFiles = fs
    .readdirSync(seedDir)
    .filter((name) => name.endsWith('.json'))
    .sort();

  const sources: SourceRow[] = [];

  for (const jsonFile of jsonFiles) {
    const fullPath = path.join(seedDir, jsonFile);
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as SeedSnapshot;

    sources.push(...(parsed.sources ?? []));
  }

  return dedupeSources(sources);
}

function dedupeSources(rows: SourceRow[]): SourceRow[] {
  const byId = new Map<string, SourceRow>();

  for (const row of rows) {
    byId.set(row.id, row);
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function toFreshnessRow(source: SourceRow, asOfDate: Date): FreshnessRow {
  const maxAgeDays = source.freshness_days ?? defaultFreshnessDays(source.update_frequency);
  const normalizedLastUpdated = source.last_updated ? parseUtcDate(source.last_updated) : null;

  if (!normalizedLastUpdated) {
    return {
      source_id: source.id,
      source_name: source.full_name,
      update_frequency: source.update_frequency ?? 'unknown',
      last_updated: null,
      age_days: null,
      max_age_days: maxAgeDays,
      status: 'unknown',
    };
  }

  const ageMs = asOfDate.valueOf() - normalizedLastUpdated.valueOf();
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  return {
    source_id: source.id,
    source_name: source.full_name,
    update_frequency: source.update_frequency ?? 'unknown',
    last_updated: toIsoDate(normalizedLastUpdated),
    age_days: ageDays,
    max_age_days: maxAgeDays,
    status: ageDays <= maxAgeDays ? 'fresh' : 'stale',
  };
}

function defaultFreshnessDays(updateFrequency?: string | null): number {
  const normalized = (updateFrequency ?? '').toLowerCase();

  if (normalized === 'monthly') {
    return 45;
  }

  if (normalized === 'daily') {
    return 2;
  }

  return 365;
}

function parseUtcDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

main();
