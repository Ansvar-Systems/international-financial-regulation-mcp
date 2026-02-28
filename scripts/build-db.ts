#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

type JsonObject = Record<string, unknown>;

interface SourceRow {
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
}

interface ProvisionRow {
  provision_uid: string;
  source_id: string;
  part: string | null;
  item_id: string;
  title: string | null;
  text: string;
  topic_tags: string[];
  requirement_level: string;
  url: string | null;
  metadata: JsonObject | null;
}

interface DefinitionRow {
  source: string;
  term: string;
  definition: string;
  defining_item: string | null;
}

interface FatfCountryStatusRow {
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
  key_findings: string[];
  priority_actions: string[];
  source_url: string | null;
}

interface NationalMappingRow {
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

interface SeedSnapshot {
  sources?: SourceRow[];
  provisions?: ProvisionRow[];
  definitions?: DefinitionRow[];
  fatf_country_status?: FatfCountryStatusRow[];
  mutual_evaluations?: MutualEvaluationRow[];
  national_mappings?: NationalMappingRow[];
}

interface AggregatedData {
  sources: SourceRow[];
  provisions: ProvisionRow[];
  definitions: DefinitionRow[];
  fatf_country_status: FatfCountryStatusRow[];
  mutual_evaluations: MutualEvaluationRow[];
  national_mappings: NationalMappingRow[];
}

const SCHEMA = `
  CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    authority TEXT NOT NULL,
    identifier TEXT,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    official_portal TEXT,
    update_frequency TEXT,
    last_updated TEXT,
    freshness_days INTEGER,
    coverage_note TEXT
  );

  CREATE TABLE provisions (
    rowid INTEGER PRIMARY KEY,
    provision_uid TEXT NOT NULL UNIQUE,
    source_id TEXT NOT NULL REFERENCES sources(id),
    part TEXT,
    item_id TEXT NOT NULL,
    title TEXT,
    text TEXT NOT NULL,
    topic_tags TEXT NOT NULL,
    requirement_level TEXT NOT NULL,
    url TEXT,
    metadata TEXT,
    UNIQUE(source_id, item_id)
  );

  CREATE VIRTUAL TABLE provisions_fts USING fts5(
    source_id,
    item_id,
    title,
    text,
    part,
    topic_tags,
    content='provisions',
    content_rowid='rowid'
  );

  CREATE TRIGGER provisions_ai AFTER INSERT ON provisions BEGIN
    INSERT INTO provisions_fts(rowid, source_id, item_id, title, text, part, topic_tags)
    VALUES (new.rowid, new.source_id, new.item_id, new.title, new.text, new.part, new.topic_tags);
  END;

  CREATE TRIGGER provisions_ad AFTER DELETE ON provisions BEGIN
    INSERT INTO provisions_fts(provisions_fts, rowid, source_id, item_id, title, text, part, topic_tags)
    VALUES ('delete', old.rowid, old.source_id, old.item_id, old.title, old.text, old.part, old.topic_tags);
  END;

  CREATE TRIGGER provisions_au AFTER UPDATE ON provisions BEGIN
    INSERT INTO provisions_fts(provisions_fts, rowid, source_id, item_id, title, text, part, topic_tags)
    VALUES ('delete', old.rowid, old.source_id, old.item_id, old.title, old.text, old.part, old.topic_tags);
    INSERT INTO provisions_fts(rowid, source_id, item_id, title, text, part, topic_tags)
    VALUES (new.rowid, new.source_id, new.item_id, new.title, new.text, new.part, new.topic_tags);
  END;

  CREATE TABLE definitions (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL REFERENCES sources(id),
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    defining_item TEXT,
    UNIQUE(source, term)
  );

  CREATE TABLE fatf_country_status (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    list_type TEXT NOT NULL,
    status TEXT NOT NULL,
    as_of_date TEXT NOT NULL,
    source_url TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE mutual_evaluations (
    jurisdiction_code TEXT PRIMARY KEY,
    jurisdiction_name TEXT NOT NULL,
    assessment_body TEXT NOT NULL,
    publication_date TEXT NOT NULL,
    overall_rating TEXT NOT NULL,
    executive_summary TEXT NOT NULL,
    key_findings TEXT NOT NULL,
    priority_actions TEXT NOT NULL,
    source_url TEXT
  );

  CREATE TABLE national_mappings (
    id INTEGER PRIMARY KEY,
    country_code TEXT NOT NULL,
    country_name TEXT NOT NULL,
    international_source_id TEXT NOT NULL REFERENCES sources(id),
    international_item_id TEXT NOT NULL,
    national_framework TEXT NOT NULL,
    national_reference TEXT NOT NULL,
    requirement_summary TEXT NOT NULL,
    status TEXT NOT NULL,
    gap_notes TEXT,
    evidence_url TEXT,
    UNIQUE(country_code, international_source_id, international_item_id, national_reference)
  );

  CREATE INDEX idx_provisions_source_item ON provisions(source_id, item_id);
  CREATE INDEX idx_mappings_country ON national_mappings(country_code);
  CREATE INDEX idx_mappings_international ON national_mappings(international_source_id, international_item_id);
`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SEED_DIR = path.resolve(PROJECT_ROOT, 'data', 'seed');
const DEFAULT_DB_PATH = path.resolve(PROJECT_ROOT, 'data', 'database.db');

function main(): void {
  const data = loadSeedData(DEFAULT_SEED_DIR);

  fs.mkdirSync(path.dirname(DEFAULT_DB_PATH), { recursive: true });
  fs.rmSync(DEFAULT_DB_PATH, { force: true });

  const db = new Database(DEFAULT_DB_PATH);

  try {
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
    insertData(db, data);

    const provisionCount = db.prepare('SELECT COUNT(*) AS count FROM provisions').get() as { count: number };
    const sourceCount = db.prepare('SELECT COUNT(*) AS count FROM sources').get() as { count: number };

    console.log('Database build complete.');
    console.log(`Path: ${DEFAULT_DB_PATH}`);
    console.log(`Sources: ${sourceCount.count}`);
    console.log(`Provisions: ${provisionCount.count}`);
    console.log(`Definitions: ${data.definitions.length}`);
    console.log(`FATF statuses: ${data.fatf_country_status.length}`);
    console.log(`Mutual evaluations: ${data.mutual_evaluations.length}`);
    console.log(`National mappings: ${data.national_mappings.length}`);
  } finally {
    db.close();
  }
}

function loadSeedData(seedDir: string): AggregatedData {
  if (!fs.existsSync(seedDir)) {
    throw new Error(`Seed directory not found: ${seedDir}`);
  }

  const seedFiles = fs
    .readdirSync(seedDir)
    .filter((name) => name.endsWith('.json'))
    .sort();

  if (seedFiles.length === 0) {
    throw new Error(`No seed JSON files found in ${seedDir}`);
  }

  const aggregated: AggregatedData = {
    sources: [],
    provisions: [],
    definitions: [],
    fatf_country_status: [],
    mutual_evaluations: [],
    national_mappings: [],
  };

  for (const fileName of seedFiles) {
    const fullPath = path.join(seedDir, fileName);
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as SeedSnapshot;

    aggregated.sources.push(...(parsed.sources ?? []));
    aggregated.provisions.push(...(parsed.provisions ?? []));
    aggregated.definitions.push(...(parsed.definitions ?? []));
    aggregated.fatf_country_status.push(...(parsed.fatf_country_status ?? []));
    aggregated.mutual_evaluations.push(...(parsed.mutual_evaluations ?? []));
    aggregated.national_mappings.push(...(parsed.national_mappings ?? []));
  }

  return aggregated;
}

function insertData(db: Database.Database, data: AggregatedData): void {
  const insertAll = db.transaction(() => {
    const insertSource = db.prepare(`
      INSERT INTO sources (
        id, full_name, authority, identifier, category, priority,
        official_portal, update_frequency, last_updated, freshness_days, coverage_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertProvision = db.prepare(`
      INSERT INTO provisions (
        provision_uid, source_id, part, item_id, title, text,
        topic_tags, requirement_level, url, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDefinition = db.prepare(`
      INSERT INTO definitions (source, term, definition, defining_item)
      VALUES (?, ?, ?, ?)
    `);

    const insertFatfStatus = db.prepare(`
      INSERT INTO fatf_country_status (
        country_code, country_name, list_type, status, as_of_date, source_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEvaluation = db.prepare(`
      INSERT INTO mutual_evaluations (
        jurisdiction_code, jurisdiction_name, assessment_body, publication_date,
        overall_rating, executive_summary, key_findings, priority_actions, source_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMapping = db.prepare(`
      INSERT INTO national_mappings (
        country_code, country_name, international_source_id, international_item_id,
        national_framework, national_reference, requirement_summary,
        status, gap_notes, evidence_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const source of data.sources) {
      insertSource.run(
        source.id,
        source.full_name,
        source.authority,
        source.identifier,
        source.category,
        source.priority,
        source.official_portal,
        source.update_frequency,
        source.last_updated,
        source.freshness_days,
        source.coverage_note,
      );
    }

    for (const provision of data.provisions) {
      insertProvision.run(
        provision.provision_uid,
        provision.source_id,
        provision.part,
        provision.item_id,
        provision.title,
        provision.text,
        JSON.stringify(provision.topic_tags ?? []),
        provision.requirement_level,
        provision.url,
        provision.metadata ? JSON.stringify(provision.metadata) : null,
      );
    }

    for (const definition of data.definitions) {
      insertDefinition.run(
        definition.source,
        definition.term,
        definition.definition,
        definition.defining_item,
      );
    }

    for (const status of data.fatf_country_status) {
      insertFatfStatus.run(
        status.country_code,
        status.country_name,
        status.list_type,
        status.status,
        status.as_of_date,
        status.source_url,
        status.notes,
      );
    }

    for (const evaluation of data.mutual_evaluations) {
      insertEvaluation.run(
        evaluation.jurisdiction_code,
        evaluation.jurisdiction_name,
        evaluation.assessment_body,
        evaluation.publication_date,
        evaluation.overall_rating,
        evaluation.executive_summary,
        JSON.stringify(evaluation.key_findings ?? []),
        JSON.stringify(evaluation.priority_actions ?? []),
        evaluation.source_url,
      );
    }

    for (const mapping of data.national_mappings) {
      insertMapping.run(
        mapping.country_code,
        mapping.country_name,
        mapping.international_source_id,
        mapping.international_item_id,
        mapping.national_framework,
        mapping.national_reference,
        mapping.requirement_summary,
        mapping.status,
        mapping.gap_notes,
        mapping.evidence_url,
      );
    }
  });

  insertAll();
}

main();
