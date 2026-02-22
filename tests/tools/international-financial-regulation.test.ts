import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
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
import { closeDomainTestDatabase, createDomainTestDatabase } from '../fixtures/domain-db';

describe('international financial regulation tools', () => {
  let db: Database;

  beforeAll(() => {
    db = createDomainTestDatabase();
  });

  afterAll(() => {
    closeDomainTestDatabase(db);
  });

  it('search_financial_regulation returns ranked matches', async () => {
    const result = await searchFinancialRegulation(db, { query: 'capital' });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('source_id');
    expect(result[0]).toHaveProperty('item_id');
    expect(result[0]).toHaveProperty('snippet');
  });

  it('get_provision returns provision with optional mappings', async () => {
    const result = await getProvision(db, {
      source_id: 'FATF_REC',
      item_id: 'R10',
      include_national_mappings: true,
      country_code: 'SWE',
    });

    expect(result).not.toBeNull();
    expect(result?.item_id).toBe('R10');
    expect(result?.national_mappings?.length).toBeGreaterThan(0);
  });

  it('get_basel_standard lists available standards without filters', async () => {
    const result = await getBaselStandard(db, {});

    expect(result.standards).toBeDefined();
    expect(result.standards?.some((standard) => standard.standard_id === 'BCBS239')).toBe(true);
  });

  it('get_basel_standard filters provisions by standard id', async () => {
    const result = await getBaselStandard(db, { standard_id: 'BCBS239' });

    expect(result.provisions).toBeDefined();
    expect(result.provisions?.length).toBeGreaterThan(0);
    expect(result.provisions?.every((provision) => provision.source_id === 'BASEL')).toBe(true);
  });

  it('get_fatf_recommendation resolves numeric code', async () => {
    const result = await getFatfRecommendation(db, { recommendation: 10 });

    expect(result.recommendation_code).toBe('R10');
    expect(result.provision?.item_id).toBe('R10');
  });

  it('check_fatf_status resolves by country code', async () => {
    const result = await checkFatfStatus(db, { country_code: 'IRN' });

    expect(result).not.toBeNull();
    expect(result?.status).toBe('high_risk');
  });

  it('get_mutual_evaluation_summary resolves jurisdiction summaries', async () => {
    const result = await getMutualEvaluationSummary(db, { jurisdiction_code: 'SWE' });

    expect(result.evaluations.length).toBe(1);
    expect(result.evaluations[0].jurisdiction_code).toBe('SWE');
    expect(result.evaluations[0].key_findings.length).toBeGreaterThan(0);
  });

  it('map_to_national_requirements returns country mappings', async () => {
    const result = await mapToNationalRequirements(db, { country_code: 'SWE' });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].country_code).toBe('SWE');
  });

  it('compare_requirements groups results by source', async () => {
    const result = await compareRequirements(db, { topic: 'risk' });

    expect(result.compared_sources.length).toBeGreaterThan(0);
    expect(result.comparisons.length).toBeGreaterThan(0);
  });

  it('list_sources returns summaries and item details', async () => {
    const summary = await listFinancialSources(db, {});
    expect(summary.sources?.length).toBeGreaterThan(0);

    const detail = await listFinancialSources(db, { source_id: 'BASEL' });
    expect(detail.source?.id).toBe('BASEL');
    expect(detail.items?.length).toBeGreaterThan(0);
  });

  it('about returns golden format with stats, freshness, disclaimer, network', () => {
    const result = aboutServer();
    expect(result.name).toContain('International Financial Regulation');
    expect(result.version).toBe('0.1.0');
    expect(result.category).toBe('domain_intelligence');
    expect(result.stats.total_items).toBe(10508);
    expect(result.stats.total_sources).toBe(7);
    expect(result.disclaimer).toContain('not professional advice');
    expect(result.network.name).toBe('Ansvar MCP Network');
    expect(result.network.directory).toBe('https://ansvar.ai/mcp');
  });

  it('check_data_freshness reports per-source freshness', async () => {
    const result = await checkDataFreshness(db, { as_of_date: '2026-02-22' });

    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.summary.fresh + result.summary.stale + result.summary.unknown).toBe(result.sources.length);
  });

  it('check_data_freshness includes update instructions', async () => {
    const result = await checkDataFreshness(db, { as_of_date: '2026-02-22' });
    expect(result).toHaveProperty('update_instructions');
    expect(result.update_instructions).toContain('workflow');
    expect(result.update_instructions).toContain('ingest.yml');
  });
});
