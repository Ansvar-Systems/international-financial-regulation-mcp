#!/usr/bin/env tsx
/**
 * Check data freshness for CI/CD.
 * Used by: check-freshness.yml (daily GitHub Actions)
 *
 * Reads data/coverage.json, checks each source's last_refresh against its
 * expected frequency. Writes:
 *   .freshness-stale   -- "true" or "false"
 *   .freshness-report  -- markdown report for GitHub issue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const COVERAGE_PATH = path.join(projectRoot, 'data', 'coverage.json');

interface CoverageSource {
  id: string;
  name: string;
  last_refresh: string;
  refresh_frequency: string;
}

const FREQUENCY_DAYS: Record<string, number> = {
  daily: 2,
  weekly: 10,
  monthly: 45,
  quarterly: 120,
  annual: 400,
};

function main(): void {
  if (!fs.existsSync(COVERAGE_PATH)) {
    console.error('[check-freshness] coverage.json not found');
    fs.writeFileSync(path.join(projectRoot, '.freshness-stale'), 'true');
    fs.writeFileSync(path.join(projectRoot, '.freshness-report'), '# Freshness Report\n\ncoverage.json not found -- cannot check freshness.\n');
    process.exit(0);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, 'utf-8'));
  const sources: CoverageSource[] = coverage.sources ?? [];
  const now = new Date();
  const lines: string[] = ['# Data Freshness Report', '', `Checked: ${now.toISOString()}`, '', '| Source | Last Refresh | Max Age | Age (days) | Status |', '|--------|-------------|---------|-----------|--------|'];

  let staleCount = 0;

  for (const source of sources) {
    const maxDays = FREQUENCY_DAYS[source.refresh_frequency] ?? 365;
    let ageDays = -1;
    let status = 'unknown';

    if (source.last_refresh && source.last_refresh !== 'unknown') {
      const lastDate = new Date(`${source.last_refresh}T00:00:00Z`);
      ageDays = Math.floor((now.getTime() - lastDate.getTime()) / (86400000));

      if (ageDays <= maxDays) {
        status = 'Current';
      } else if (ageDays <= maxDays * 1.2) {
        status = 'Due soon';
      } else {
        status = `OVERDUE (${ageDays - maxDays}d)`;
        staleCount++;
      }
    } else {
      status = 'Unknown';
      staleCount++;
    }

    lines.push(`| ${source.name} | ${source.last_refresh} | ${maxDays}d | ${ageDays >= 0 ? ageDays : '?'} | ${status} |`);
  }

  lines.push('', `**Stale sources:** ${staleCount}/${sources.length}`);

  if (staleCount > 0) {
    lines.push('', 'To trigger a forced update:', '```', 'gh workflow run ingest.yml --repo Ansvar-Systems/international-financial-regulation-mcp -f force=true', '```');
  }

  const report = lines.join('\n');
  console.log(report);

  fs.writeFileSync(path.join(projectRoot, '.freshness-stale'), String(staleCount > 0));
  fs.writeFileSync(path.join(projectRoot, '.freshness-report'), report);
}

main();
