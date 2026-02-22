import type { Database } from 'better-sqlite3';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

interface ProvisionRow {
  rowid: number;
  provision_uid: string;
  source_id: string;
  part: string | null;
  item_id: string;
  title: string | null;
  text: string;
  topic_tags: string;
  requirement_level: string;
  url: string | null;
  metadata: string | null;
}

interface SearchRow {
  source_id: string;
  item_id: string;
  title: string | null;
  part: string | null;
  snippet: string;
  relevance: number;
  requirement_level: string;
  topic_tags: string;
}

interface SourceSummaryRow {
  id: string;
  full_name: string;
  authority: string;
  identifier: string | null;
  category: string;
  priority: string;
  official_portal: string | null;
  update_frequency: string | null;
  last_updated: string | null;
  freshness_days: number | null;
  coverage_note: string | null;
  provision_count: number;
  definition_count: number;
}

interface MappingRow {
  country_code: string;
  country_name: string;
  international_source_id: string;
  international_item_id: string;
  national_framework: string;
  national_reference: string;
  requirement_summary: string;
  status: string;
  gap_notes: string | null;
  evidence_url: string | null;
}

interface FatfStatusRow {
  country_code: string;
  country_name: string;
  list_type: string;
  status: string;
  as_of_date: string;
  source_url: string;
  notes: string | null;
}

interface MutualEvaluationRow {
  jurisdiction_code: string;
  jurisdiction_name: string;
  assessment_body: string;
  publication_date: string;
  overall_rating: string;
  executive_summary: string;
  key_findings: string;
  priority_actions: string;
  source_url: string | null;
}

export interface ProvisionRecord {
  provision_uid: string;
  source_id: string;
  part: string | null;
  item_id: string;
  title: string | null;
  text: string;
  topic_tags: string[];
  requirement_level: string;
  url: string | null;
  metadata: Record<string, unknown> | null;
}

export interface SearchFinancialRegulationInput {
  query: string;
  sources?: string[];
  topics?: string[];
  include_guidance?: boolean;
  limit?: number;
}

export interface SearchFinancialRegulationResult {
  source_id: string;
  item_id: string;
  title: string | null;
  part: string | null;
  snippet: string;
  relevance: number;
  requirement_level: string;
  topic_tags: string[];
}

export interface GetProvisionInput {
  source_id: string;
  item_id: string;
  include_national_mappings?: boolean;
  country_code?: string;
}

export interface GetProvisionResult extends ProvisionRecord {
  national_mappings: NationalRequirementMapping[] | null;
}

export interface GetBaselStandardInput {
  standard_id?: string;
  query?: string;
  limit?: number;
}

export interface BaselStandardSummary {
  standard_id: string;
  item_count: number;
}

export interface GetBaselStandardResult {
  standards?: BaselStandardSummary[];
  provisions?: ProvisionRecord[];
}

export interface GetFatfRecommendationInput {
  recommendation: string | number;
}

export interface FatfRecommendationResult {
  recommendation_code: string;
  recommendation_number: number | null;
  provision: ProvisionRecord | null;
}

export interface CheckFatfStatusInput {
  country_code?: string;
  country_name?: string;
}

export interface FatfStatusResult {
  country_code: string;
  country_name: string;
  list_type: string;
  status: string;
  as_of_date: string;
  source_url: string;
  notes: string | null;
}

export interface GetMutualEvaluationSummaryInput {
  jurisdiction_code?: string;
  jurisdiction_name?: string;
  limit?: number;
}

export interface MutualEvaluationSummary {
  jurisdiction_code: string;
  jurisdiction_name: string;
  assessment_body: string;
  publication_date: string;
  overall_rating: string;
  executive_summary: string;
  key_findings: string[];
  priority_actions: string[];
  source_url: string | null;
}

export interface GetMutualEvaluationSummaryResult {
  evaluations: MutualEvaluationSummary[];
}

export interface MapToNationalRequirementsInput {
  country_code: string;
  international_source_id?: string;
  international_item_id?: string;
  status?: 'implemented' | 'partial' | 'gap';
  limit?: number;
}

export interface NationalRequirementMapping {
  country_code: string;
  country_name: string;
  international_source_id: string;
  international_item_id: string;
  national_framework: string;
  national_reference: string;
  requirement_summary: string;
  status: string;
  gap_notes: string | null;
  evidence_url: string | null;
}

export interface CompareRequirementsInput {
  topic: string;
  sources?: string[];
  limit_per_source?: number;
  include_guidance?: boolean;
}

export interface CompareRequirementsResult {
  topic: string;
  compared_sources: string[];
  comparisons: Array<{
    source_id: string;
    items: SearchFinancialRegulationResult[];
  }>;
}

export interface ListSourcesInput {
  source_id?: string;
  include_items?: boolean;
  limit?: number;
}

export interface SourceSummary {
  id: string;
  full_name: string;
  authority: string;
  identifier: string | null;
  category: string;
  priority: string;
  official_portal: string | null;
  update_frequency: string | null;
  last_updated: string | null;
  freshness_days: number | null;
  freshness_status: 'fresh' | 'stale' | 'unknown';
  provision_count: number;
  definition_count: number;
  coverage_note: string | null;
}

export interface ListSourcesResult {
  sources?: SourceSummary[];
  source?: SourceSummary | null;
  items?: Array<{
    item_id: string;
    title: string | null;
    part: string | null;
    requirement_level: string;
    url: string | null;
  }>;
}

export interface AboutResult {
  name: string;
  version: string;
  category: string;
  description: string;
  stats: {
    total_items: number;
    total_sources: number;
    database_size_mb: number;
  };
  data_sources: Array<{
    name: string;
    url: string;
    authority: string;
  }>;
  freshness: {
    last_ingestion: string;
    database_built: string;
  };
  disclaimer: string;
  network: {
    name: string;
    directory: string;
    total_servers: number;
  };
}

export interface CheckDataFreshnessInput {
  as_of_date?: string;
  threshold_days?: number;
}

export interface CheckDataFreshnessResult {
  checked_at: string;
  threshold_override_days: number | null;
  summary: {
    fresh: number;
    stale: number;
    unknown: number;
  };
  sources: Array<{
    source_id: string;
    source_name: string;
    last_updated: string | null;
    age_days: number | null;
    max_age_days: number;
    status: 'fresh' | 'stale' | 'unknown';
  }>;
  update_instructions: string;
}

export async function searchFinancialRegulation(
  db: Database,
  input: SearchFinancialRegulationInput,
): Promise<SearchFinancialRegulationResult[]> {
  const query = input.query?.trim();
  if (!query) {
    return [];
  }

  const limit = clampLimit(input.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const includeGuidance = input.include_guidance ?? true;
  const sources = normalizeStringArray(input.sources);
  const topics = normalizeStringArray(input.topics).map((topic) => topic.toLowerCase());

  let sql = `
    SELECT
      p.source_id,
      p.item_id,
      p.title,
      p.part,
      snippet(provisions_fts, 3, '>>>', '<<<', '...', 28) AS snippet,
      bm25(provisions_fts) AS relevance,
      p.requirement_level,
      p.topic_tags
    FROM provisions_fts
    INNER JOIN provisions p ON p.rowid = provisions_fts.rowid
    WHERE provisions_fts MATCH ?
  `;

  const params: Array<string | number> = [escapeFtsQuery(query)];

  if (sources.length > 0) {
    sql += ` AND p.source_id IN (${sources.map(() => '?').join(', ')})`;
    params.push(...sources);
  }

  if (!includeGuidance) {
    sql += ` AND p.requirement_level != 'guidance'`;
  }

  if (topics.length > 0) {
    const topicConditions = topics.map(() => 'LOWER(p.topic_tags) LIKE ?').join(' OR ');
    sql += ` AND (${topicConditions})`;
    params.push(...topics.map((topic) => `%${topic}%`));
  }

  sql += ' ORDER BY relevance ASC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as SearchRow[];

  return rows.map((row) => ({
    source_id: row.source_id,
    item_id: row.item_id,
    title: row.title,
    part: row.part,
    snippet: row.snippet,
    relevance: row.relevance,
    requirement_level: row.requirement_level,
    topic_tags: parseJsonArray(row.topic_tags),
  }));
}

export async function getProvision(
  db: Database,
  input: GetProvisionInput,
): Promise<GetProvisionResult | null> {
  const sourceId = input.source_id?.trim();
  const itemId = input.item_id?.trim();

  if (!sourceId) {
    throw new Error('source_id is required');
  }

  if (!itemId) {
    throw new Error('item_id is required');
  }

  const row = db
    .prepare(
      `
      SELECT rowid, provision_uid, source_id, part, item_id, title, text,
             topic_tags, requirement_level, url, metadata
      FROM provisions
      WHERE source_id = ? AND item_id = ?
    `,
    )
    .get(sourceId, itemId) as ProvisionRow | undefined;

  if (!row) {
    return null;
  }

  let mappings: NationalRequirementMapping[] | null = null;
  if (input.include_national_mappings) {
    mappings = await queryNationalMappings(db, {
      country_code: input.country_code,
      source_id: sourceId,
      item_id: itemId,
      limit: MAX_LIMIT,
    });
  }

  return {
    ...mapProvisionRow(row),
    national_mappings: mappings,
  };
}

export async function getBaselStandard(
  db: Database,
  input: GetBaselStandardInput,
): Promise<GetBaselStandardResult> {
  const limit = clampLimit(input.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const standardId = input.standard_id?.trim();
  const query = input.query?.trim();

  if (!standardId && !query) {
    const rows = db
      .prepare(
        `
        SELECT
          COALESCE(json_extract(metadata, '$.standard_id'), 'UNSPECIFIED') AS standard_id,
          COUNT(*) AS item_count
        FROM provisions
        WHERE source_id = 'BASEL'
        GROUP BY COALESCE(json_extract(metadata, '$.standard_id'), 'UNSPECIFIED')
        ORDER BY standard_id
      `,
      )
      .all() as Array<{ standard_id: string; item_count: number }>;

    return {
      standards: rows.map((row) => ({
        standard_id: row.standard_id,
        item_count: row.item_count,
      })),
    };
  }

  let sql = `
    SELECT rowid, provision_uid, source_id, part, item_id, title, text,
           topic_tags, requirement_level, url, metadata
    FROM provisions
    WHERE source_id = 'BASEL'
  `;

  const params: Array<string | number> = [];

  if (standardId) {
    sql += `
      AND (
        item_id = ?
        OR provision_uid = ?
        OR LOWER(COALESCE(json_extract(metadata, '$.standard_id'), '')) = LOWER(?)
      )
    `;
    params.push(standardId, standardId, standardId);
  }

  if (query) {
    sql += `
      AND rowid IN (
        SELECT rowid FROM provisions_fts WHERE provisions_fts MATCH ?
      )
    `;
    params.push(escapeFtsQuery(query));
  }

  sql += ' ORDER BY item_id LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as ProvisionRow[];

  return {
    provisions: rows.map(mapProvisionRow),
  };
}

export async function getFatfRecommendation(
  db: Database,
  input: GetFatfRecommendationInput,
): Promise<FatfRecommendationResult> {
  const normalized = normalizeFatfRecommendation(input.recommendation);

  if (!normalized.code) {
    throw new Error('recommendation must be a FATF recommendation code like "R10" or a numeric value');
  }

  const params: Array<string | number> = [normalized.code];
  let sql = `
    SELECT rowid, provision_uid, source_id, part, item_id, title, text,
           topic_tags, requirement_level, url, metadata
    FROM provisions
    WHERE source_id = 'FATF_REC'
      AND item_id = ?
  `;

  if (normalized.number !== null) {
    sql += ` OR (source_id = 'FATF_REC' AND json_extract(metadata, '$.recommendation_number') = ?)`;
    params.push(normalized.number);
  }

  sql += ' LIMIT 1';

  const row = db.prepare(sql).get(...params) as ProvisionRow | undefined;

  return {
    recommendation_code: normalized.code,
    recommendation_number: normalized.number,
    provision: row ? mapProvisionRow(row) : null,
  };
}

export async function checkFatfStatus(
  db: Database,
  input: CheckFatfStatusInput,
): Promise<FatfStatusResult | null> {
  const countryCode = input.country_code?.trim().toUpperCase();
  const countryName = input.country_name?.trim();

  if (!countryCode && !countryName) {
    throw new Error('country_code or country_name is required');
  }

  let row: FatfStatusRow | undefined;

  if (countryCode) {
    row = db
      .prepare(
        `
        SELECT country_code, country_name, list_type, status, as_of_date, source_url, notes
        FROM fatf_country_status
        WHERE country_code = ?
      `,
      )
      .get(countryCode) as FatfStatusRow | undefined;
  }

  if (!row && countryName) {
    row = db
      .prepare(
        `
        SELECT country_code, country_name, list_type, status, as_of_date, source_url, notes
        FROM fatf_country_status
        WHERE LOWER(country_name) = LOWER(?)
           OR LOWER(country_name) LIKE LOWER(?)
        ORDER BY country_name
        LIMIT 1
      `,
      )
      .get(countryName, `%${countryName}%`) as FatfStatusRow | undefined;
  }

  return row ?? null;
}

export async function getMutualEvaluationSummary(
  db: Database,
  input: GetMutualEvaluationSummaryInput,
): Promise<GetMutualEvaluationSummaryResult> {
  const jurisdictionCode = input.jurisdiction_code?.trim().toUpperCase();
  const jurisdictionName = input.jurisdiction_name?.trim();
  const limit = clampLimit(input.limit, DEFAULT_LIMIT, MAX_LIMIT);

  let sql = `
    SELECT
      jurisdiction_code,
      jurisdiction_name,
      assessment_body,
      publication_date,
      overall_rating,
      executive_summary,
      key_findings,
      priority_actions,
      source_url
    FROM mutual_evaluations
  `;

  const params: Array<string | number> = [];

  if (jurisdictionCode || jurisdictionName) {
    sql += ' WHERE ';
    const conditions: string[] = [];

    if (jurisdictionCode) {
      conditions.push('jurisdiction_code = ?');
      params.push(jurisdictionCode);
    }

    if (jurisdictionName) {
      conditions.push('LOWER(jurisdiction_name) = LOWER(?)');
      params.push(jurisdictionName);
    }

    sql += conditions.join(' OR ');
  }

  sql += ' ORDER BY publication_date DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as MutualEvaluationRow[];

  return {
    evaluations: rows.map((row) => ({
      jurisdiction_code: row.jurisdiction_code,
      jurisdiction_name: row.jurisdiction_name,
      assessment_body: row.assessment_body,
      publication_date: row.publication_date,
      overall_rating: row.overall_rating,
      executive_summary: row.executive_summary,
      key_findings: parseJsonArray(row.key_findings),
      priority_actions: parseJsonArray(row.priority_actions),
      source_url: row.source_url,
    })),
  };
}

export async function mapToNationalRequirements(
  db: Database,
  input: MapToNationalRequirementsInput,
): Promise<NationalRequirementMapping[]> {
  const countryCode = input.country_code?.trim().toUpperCase();

  if (!countryCode) {
    throw new Error('country_code is required');
  }

  const limit = clampLimit(input.limit, DEFAULT_LIMIT, MAX_LIMIT);
  return queryNationalMappings(db, {
    country_code: countryCode,
    source_id: input.international_source_id,
    item_id: input.international_item_id,
    status: input.status,
    limit,
  });
}

export async function compareRequirements(
  db: Database,
  input: CompareRequirementsInput,
): Promise<CompareRequirementsResult> {
  const topic = input.topic?.trim();

  if (!topic) {
    throw new Error('topic is required');
  }

  const limitPerSource = clampLimit(input.limit_per_source, 3, 10);

  const matches = await searchFinancialRegulation(db, {
    query: topic,
    sources: input.sources,
    include_guidance: input.include_guidance ?? true,
    limit: MAX_LIMIT,
  });

  const grouped = new Map<string, SearchFinancialRegulationResult[]>();

  for (const match of matches) {
    if (!grouped.has(match.source_id)) {
      grouped.set(match.source_id, []);
    }

    const sourceMatches = grouped.get(match.source_id)!;
    if (sourceMatches.length < limitPerSource) {
      sourceMatches.push(match);
    }
  }

  const comparisons = [...grouped.entries()].map(([sourceId, items]) => ({
    source_id: sourceId,
    items,
  }));

  return {
    topic,
    compared_sources: comparisons.map((comparison) => comparison.source_id),
    comparisons,
  };
}

export async function listFinancialSources(
  db: Database,
  input: ListSourcesInput,
): Promise<ListSourcesResult> {
  const sourceId = input.source_id?.trim().toUpperCase();
  const limit = clampLimit(input.limit, DEFAULT_LIMIT, MAX_LIMIT);

  if (!sourceId) {
    const rows = db
      .prepare(
        `
        SELECT
          s.id,
          s.full_name,
          s.authority,
          s.identifier,
          s.category,
          s.priority,
          s.official_portal,
          s.update_frequency,
          s.last_updated,
          s.freshness_days,
          s.coverage_note,
          COUNT(DISTINCT p.rowid) AS provision_count,
          COUNT(DISTINCT d.id) AS definition_count
        FROM sources s
        LEFT JOIN provisions p ON p.source_id = s.id
        LEFT JOIN definitions d ON d.source = s.id
        GROUP BY
          s.id,
          s.full_name,
          s.authority,
          s.identifier,
          s.category,
          s.priority,
          s.official_portal,
          s.update_frequency,
          s.last_updated,
          s.freshness_days,
          s.coverage_note
        ORDER BY
          CASE s.priority
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            ELSE 2
          END,
          s.id
      `,
      )
      .all() as SourceSummaryRow[];

    return {
      sources: rows.map((row) => mapSourceSummary(row, new Date())),
    };
  }

  const sourceRow = db
    .prepare(
      `
      SELECT
        s.id,
        s.full_name,
        s.authority,
        s.identifier,
        s.category,
        s.priority,
        s.official_portal,
        s.update_frequency,
        s.last_updated,
        s.freshness_days,
        s.coverage_note,
        COUNT(DISTINCT p.rowid) AS provision_count,
        COUNT(DISTINCT d.id) AS definition_count
      FROM sources s
      LEFT JOIN provisions p ON p.source_id = s.id
      LEFT JOIN definitions d ON d.source = s.id
      WHERE s.id = ?
      GROUP BY
        s.id,
        s.full_name,
        s.authority,
        s.identifier,
        s.category,
        s.priority,
        s.official_portal,
        s.update_frequency,
        s.last_updated,
        s.freshness_days,
        s.coverage_note
    `,
    )
    .get(sourceId) as SourceSummaryRow | undefined;

  if (!sourceRow) {
    return { source: null, items: [] };
  }

  const includeItems = input.include_items ?? true;
  const items = includeItems
    ? (db
        .prepare(
          `
          SELECT item_id, title, part, requirement_level, url
          FROM provisions
          WHERE source_id = ?
          ORDER BY item_id
          LIMIT ?
        `,
        )
        .all(sourceId, limit) as Array<{
          item_id: string;
          title: string | null;
          part: string | null;
          requirement_level: string;
          url: string | null;
        }>)
    : [];

  return {
    source: mapSourceSummary(sourceRow, new Date()),
    items,
  };
}

export function aboutServer(): AboutResult {
  return {
    name: 'International Financial Regulation MCP',
    version: '0.1.0',
    category: 'domain_intelligence',
    description: 'Structured access to Basel, FATF, IOSCO, IAIS, FSB, and CPMI-IOSCO regulatory standards and publications.',
    stats: {
      total_items: 10508,
      total_sources: 7,
      database_size_mb: 15,
    },
    data_sources: [
      { name: 'Basel Committee standards', url: 'https://www.bis.org/bcbs/publ/index.htm', authority: 'Bank for International Settlements' },
      { name: 'FATF Recommendations', url: 'https://www.fatf-gafi.org', authority: 'Financial Action Task Force' },
      { name: 'FATF High-Risk Lists', url: 'https://www.fatf-gafi.org/en/countries/black-and-grey-lists.html', authority: 'Financial Action Task Force' },
      { name: 'IOSCO Principles', url: 'https://www.iosco.org', authority: 'International Organization of Securities Commissions' },
      { name: 'IAIS Insurance Core Principles', url: 'https://www.iaisweb.org', authority: 'International Association of Insurance Supervisors' },
      { name: 'FSB Key Attributes', url: 'https://www.fsb.org', authority: 'Financial Stability Board' },
      { name: 'CPMI-IOSCO PFMI', url: 'https://www.bis.org/cpmi/publ/index.htm', authority: 'BIS and IOSCO' },
    ],
    freshness: {
      last_ingestion: '2026-02-22',
      database_built: '2026-02-22',
    },
    disclaimer: 'This is a reference tool, not professional advice. Verify critical data against authoritative sources.',
    network: {
      name: 'Ansvar MCP Network',
      directory: 'https://ansvar.ai/mcp',
      total_servers: 81,
    },
  };
}

export async function checkDataFreshness(
  db: Database,
  input: CheckDataFreshnessInput,
): Promise<CheckDataFreshnessResult> {
  const asOfDate = input.as_of_date ? parseDateOnly(input.as_of_date) : new Date();

  if (!asOfDate) {
    throw new Error('as_of_date must be formatted as YYYY-MM-DD');
  }

  const rows = db
    .prepare(
      `
      SELECT
        id,
        full_name,
        last_updated,
        freshness_days
      FROM sources
      ORDER BY id
    `,
    )
    .all() as Array<{
    id: string;
    full_name: string;
    last_updated: string | null;
    freshness_days: number | null;
  }>;

  const reportRows = rows.map((row) => {
    const maxAgeDays = input.threshold_days ?? row.freshness_days ?? 365;

    if (!row.last_updated) {
      return {
        source_id: row.id,
        source_name: row.full_name,
        last_updated: null,
        age_days: null,
        max_age_days: maxAgeDays,
        status: 'unknown' as const,
      };
    }

    const parsedLastUpdated = parseDateOnly(row.last_updated);
    if (!parsedLastUpdated) {
      return {
        source_id: row.id,
        source_name: row.full_name,
        last_updated: row.last_updated,
        age_days: null,
        max_age_days: maxAgeDays,
        status: 'unknown' as const,
      };
    }

    const ageDays = daysBetween(parsedLastUpdated, asOfDate);

    return {
      source_id: row.id,
      source_name: row.full_name,
      last_updated: row.last_updated,
      age_days: ageDays,
      max_age_days: maxAgeDays,
      status: ageDays <= maxAgeDays ? ('fresh' as const) : ('stale' as const),
    };
  });

  return {
    checked_at: toIsoDate(asOfDate),
    threshold_override_days: input.threshold_days ?? null,
    summary: {
      fresh: reportRows.filter((row) => row.status === 'fresh').length,
      stale: reportRows.filter((row) => row.status === 'stale').length,
      unknown: reportRows.filter((row) => row.status === 'unknown').length,
    },
    sources: reportRows,
    update_instructions: 'To trigger a forced update:\ngh workflow run ingest.yml --repo Ansvar-Systems/international-financial-regulation-mcp -f force=true\n\nOr visit: https://github.com/Ansvar-Systems/international-financial-regulation-mcp/actions/workflows/ingest.yml',
  };
}

function mapProvisionRow(row: ProvisionRow): ProvisionRecord {
  return {
    provision_uid: row.provision_uid,
    source_id: row.source_id,
    part: row.part,
    item_id: row.item_id,
    title: row.title,
    text: row.text,
    topic_tags: parseJsonArray(row.topic_tags),
    requirement_level: row.requirement_level,
    url: row.url,
    metadata: parseJsonObject(row.metadata),
  };
}

function mapSourceSummary(row: SourceSummaryRow, asOfDate: Date): SourceSummary {
  const freshness = computeFreshnessStatus(row.last_updated, row.freshness_days, asOfDate);

  return {
    id: row.id,
    full_name: row.full_name,
    authority: row.authority,
    identifier: row.identifier,
    category: row.category,
    priority: row.priority,
    official_portal: row.official_portal,
    update_frequency: row.update_frequency,
    last_updated: row.last_updated,
    freshness_days: row.freshness_days,
    freshness_status: freshness,
    provision_count: row.provision_count,
    definition_count: row.definition_count,
    coverage_note: row.coverage_note,
  };
}

function computeFreshnessStatus(
  lastUpdated: string | null,
  freshnessDays: number | null,
  asOfDate: Date,
): 'fresh' | 'stale' | 'unknown' {
  if (!lastUpdated) {
    return 'unknown';
  }

  const parsedLastUpdated = parseDateOnly(lastUpdated);
  if (!parsedLastUpdated) {
    return 'unknown';
  }

  const ageDays = daysBetween(parsedLastUpdated, asOfDate);
  const maxAgeDays = freshnessDays ?? 365;
  return ageDays <= maxAgeDays ? 'fresh' : 'stale';
}

function normalizeFatfRecommendation(value: string | number): {
  code: string;
  number: number | null;
} {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const numeric = Math.floor(value);
    return {
      code: `R${numeric}`,
      number: numeric,
    };
  }

  const text = String(value ?? '').trim().toUpperCase();
  if (!text) {
    return { code: '', number: null };
  }

  const digits = text.replace(/[^0-9]/g, '');
  const numeric = digits ? Number.parseInt(digits, 10) : null;

  if (/^R\d+$/.test(text)) {
    return {
      code: text,
      number: numeric,
    };
  }

  if (/^\d+$/.test(text)) {
    return {
      code: `R${text}`,
      number: numeric,
    };
  }

  return {
    code: text,
    number: numeric,
  };
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => (typeof item === 'string' ? item : String(item)))
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

function parseDateOnly(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.valueOf() - start.valueOf();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function normalizeStringArray(values?: string[]): string[] {
  if (!values) {
    return [];
  }

  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return [...new Set(normalized)];
}

function escapeFtsQuery(query: string): string {
  return query.replace(/[()^*:]/g, (char) => `"${char}"`);
}

function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  const rounded = Math.floor(value);
  if (rounded < 1) {
    return 1;
  }

  if (rounded > max) {
    return max;
  }

  return rounded;
}

async function queryNationalMappings(
  db: Database,
  input: {
    country_code?: string;
    source_id?: string;
    item_id?: string;
    status?: string;
    limit: number;
  },
): Promise<NationalRequirementMapping[]> {
  let sql = `
    SELECT
      country_code,
      country_name,
      international_source_id,
      international_item_id,
      national_framework,
      national_reference,
      requirement_summary,
      status,
      gap_notes,
      evidence_url
    FROM national_mappings
    WHERE 1 = 1
  `;

  const params: Array<string | number> = [];

  if (input.country_code) {
    sql += ' AND country_code = ?';
    params.push(input.country_code.toUpperCase());
  }

  if (input.source_id) {
    sql += ' AND international_source_id = ?';
    params.push(input.source_id.trim().toUpperCase());
  }

  if (input.item_id) {
    sql += ' AND international_item_id = ?';
    params.push(input.item_id.trim());
  }

  if (input.status) {
    sql += ' AND LOWER(status) = LOWER(?)';
    params.push(input.status);
  }

  sql += ' ORDER BY international_source_id, international_item_id, national_framework LIMIT ?';
  params.push(input.limit);

  const rows = db.prepare(sql).all(...params) as MappingRow[];
  return rows.map((row) => ({
    country_code: row.country_code,
    country_name: row.country_name,
    international_source_id: row.international_source_id,
    international_item_id: row.international_item_id,
    national_framework: row.national_framework,
    national_reference: row.national_reference,
    requirement_summary: row.requirement_summary,
    status: row.status,
    gap_notes: row.gap_notes,
    evidence_url: row.evidence_url,
  }));
}
