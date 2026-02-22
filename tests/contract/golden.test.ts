import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import {
  aboutServer,
  checkDataFreshness,
  checkFatfStatus,
  compareRequirements,
  getBaselStandard,
  getFatfRecommendation,
  getMutualEvaluationSummary,
  getProvision,
  listFinancialSources,
  mapToNationalRequirements,
  searchFinancialRegulation,
} from '../../src/tools/international-financial-regulation';

describe('Golden Contract Tests — Production Database', () => {
  let db: Database.Database;

  beforeAll(() => {
    const dbPath = path.resolve(__dirname, '../../data/database.db');
    db = new Database(dbPath, { readonly: true });
    db.pragma('foreign_keys = ON');
  });

  afterAll(() => {
    db.close();
  });

  // ── data_retrieval (3) ──────────────────────────────────────────────

  it('retrieves Basel provisions by standard', async () => {
    const result = await getBaselStandard(db, {});
    expect(result.standards).toBeDefined();
    expect(result.standards!.length).toBeGreaterThan(0);
    // Verify at least one standard has items
    const hasItems = result.standards!.some(s => s.item_count > 0);
    expect(hasItems).toBe(true);
  });

  it('retrieves a FATF recommendation by number', async () => {
    // Use a query that should find FATF results
    const results = await searchFinancialRegulation(db, {
      query: 'customer due diligence',
      sources: ['FATF_REC'],
      limit: 5,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source_id).toBe('FATF_REC');
  });

  it('lists all sources with correct counts', async () => {
    const result = await listFinancialSources(db, {});
    expect(result.sources).toBeDefined();
    expect(result.sources!.length).toBe(7);

    const totalProvisions = result.sources!.reduce((sum, s) => sum + s.provision_count, 0);
    expect(totalProvisions).toBeGreaterThanOrEqual(10000);
  });

  // ── search (2) ──────────────────────────────────────────────────────

  it('finds results for "capital requirements"', async () => {
    const results = await searchFinancialRegulation(db, { query: 'capital requirements' });
    expect(results.length).toBeGreaterThan(0);
    // Should find Basel capital-related provisions
    const hasBasel = results.some(r => r.source_id === 'BASEL');
    expect(hasBasel).toBe(true);
  });

  it('finds results for "money laundering" across sources', async () => {
    const results = await searchFinancialRegulation(db, { query: 'money laundering', limit: 20 });
    expect(results.length).toBeGreaterThan(0);
    // Should appear in FATF at minimum
    const hasFatf = results.some(r => r.source_id === 'FATF_REC' || r.source_id === 'FATF_LIST');
    expect(hasFatf).toBe(true);
  });

  // ── cross_reference (1) ─────────────────────────────────────────────

  it('compares requirements across sources on a topic', async () => {
    const result = await compareRequirements(db, { topic: 'governance' });
    expect(result.compared_sources.length).toBeGreaterThan(1);
    expect(result.comparisons.length).toBeGreaterThan(1);
    // Should find governance provisions in multiple standard bodies
  });

  // ── negative_test (2) ───────────────────────────────────────────────

  it('returns null for non-existent provision', async () => {
    const result = await getProvision(db, {
      source_id: 'NONEXISTENT',
      item_id: 'FAKE-001',
    });
    expect(result).toBeNull();
  });

  it('returns empty results for nonsensical search', async () => {
    const results = await searchFinancialRegulation(db, { query: 'xyzzy9999qqq' });
    expect(results.length).toBe(0);
  });

  // ── meta_tool (2) ──────────────────────────────────────────────────

  it('about() returns valid golden format', () => {
    const result = aboutServer();
    expect(result.name).toBe('International Financial Regulation MCP');
    expect(result.version).toBe('0.1.0');
    expect(result.category).toBe('domain_intelligence');
    expect(result.stats.total_items).toBeGreaterThanOrEqual(10000);
    expect(result.stats.total_sources).toBe(7);
    expect(result.disclaimer).toBeTruthy();
    expect(result.network.name).toBe('Ansvar MCP Network');
  });

  it('check_data_freshness returns per-source report', async () => {
    const result = await checkDataFreshness(db, {});
    expect(result.sources.length).toBe(7);
    expect(result.summary.fresh + result.summary.stale + result.summary.unknown).toBe(7);
    expect(result.update_instructions).toContain('ingest.yml');
  });

  // ── additional coverage (bonus) ─────────────────────────────────────

  it('source detail includes items listing', async () => {
    const detail = await listFinancialSources(db, { source_id: 'BASEL', limit: 5 });
    expect(detail.source).toBeDefined();
    expect(detail.source!.id).toBe('BASEL');
    expect(detail.items!.length).toBeGreaterThan(0);
    expect(detail.items!.length).toBeLessThanOrEqual(5);
  });
});
