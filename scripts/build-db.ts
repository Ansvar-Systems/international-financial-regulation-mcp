#!/usr/bin/env tsx
/**
 * Build the SQLite database for the International Financial Regulation MCP.
 *
 * Tables derived from src/tools/international-financial-regulation.ts interfaces:
 *   - sources            (regulatory body metadata)
 *   - provisions         (individual regulatory provisions / articles)
 *   - provisions_fts     (FTS5 full-text search on provisions)
 *   - definitions        (term definitions extracted from regulatory text)
 *   - national_mappings  (maps international provisions to country-level requirements)
 *   - fatf_country_status (FATF high-risk / increased monitoring lists)
 *   - mutual_evaluations (FATF mutual evaluation summaries per jurisdiction)
 *   - db_metadata        (build metadata)
 *
 * Seed data is loaded from data/seed/*.json if present.
 * Run: npx tsx scripts/build-db.ts
 */

import Database from 'better-sqlite3';
import { existsSync, unlinkSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH =
  process.env.INTERNATIONAL_FINANCIAL_REGULATION_DB_PATH ??
  join(__dirname, '..', 'data', 'database.db');

/* ------------------------------------------------------------------ */
/*  Schema                                                            */
/* ------------------------------------------------------------------ */

const SCHEMA = `
-- Regulatory source metadata
CREATE TABLE sources (
  id              TEXT PRIMARY KEY,
  full_name       TEXT NOT NULL,
  authority       TEXT NOT NULL,
  identifier      TEXT,
  category        TEXT NOT NULL DEFAULT 'standard',
  priority        TEXT NOT NULL DEFAULT 'high',
  official_portal TEXT,
  update_frequency TEXT,
  last_updated    TEXT,
  freshness_days  INTEGER,
  coverage_note   TEXT
);

-- Individual regulatory provisions / articles
CREATE TABLE provisions (
  provision_uid     TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL REFERENCES sources(id),
  part              TEXT,
  item_id           TEXT NOT NULL,
  title             TEXT,
  text              TEXT NOT NULL,
  topic_tags        TEXT NOT NULL DEFAULT '[]',
  requirement_level TEXT NOT NULL DEFAULT 'mandatory',
  url               TEXT,
  metadata          TEXT
);

CREATE INDEX idx_provisions_source ON provisions(source_id);
CREATE INDEX idx_provisions_item   ON provisions(source_id, item_id);

-- FTS5 full-text index on provisions
-- Column order matters: 0=source_id, 1=item_id, 2=title, 3=text
-- The snippet() call in searchFinancialRegulation uses column index 3 (text)
CREATE VIRTUAL TABLE provisions_fts USING fts5(
  source_id,
  item_id,
  title,
  text,
  content='provisions',
  content_rowid='rowid',
  tokenize='unicode61'
);

CREATE TRIGGER provisions_ai AFTER INSERT ON provisions BEGIN
  INSERT INTO provisions_fts(rowid, source_id, item_id, title, text)
    VALUES (new.rowid, new.source_id, new.item_id, new.title, new.text);
END;

CREATE TRIGGER provisions_ad AFTER DELETE ON provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, source_id, item_id, title, text)
    VALUES ('delete', old.rowid, old.source_id, old.item_id, old.title, old.text);
END;

CREATE TRIGGER provisions_au AFTER UPDATE ON provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, source_id, item_id, title, text)
    VALUES ('delete', old.rowid, old.source_id, old.item_id, old.title, old.text);
  INSERT INTO provisions_fts(rowid, source_id, item_id, title, text)
    VALUES (new.rowid, new.source_id, new.item_id, new.title, new.text);
END;

-- Term definitions extracted from regulatory texts
CREATE TABLE definitions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  term       TEXT NOT NULL,
  definition TEXT NOT NULL,
  source     TEXT NOT NULL REFERENCES sources(id),
  url        TEXT
);

CREATE INDEX idx_definitions_source ON definitions(source);

-- Mapping international provisions to national/country-level requirements
CREATE TABLE national_mappings (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code            TEXT NOT NULL,
  country_name            TEXT NOT NULL,
  international_source_id TEXT NOT NULL,
  international_item_id   TEXT,
  national_framework      TEXT,
  national_reference      TEXT,
  requirement_summary     TEXT,
  status                  TEXT DEFAULT 'implemented',
  gap_notes               TEXT,
  evidence_url            TEXT
);

CREATE INDEX idx_national_mappings_country ON national_mappings(country_code);
CREATE INDEX idx_national_mappings_source  ON national_mappings(international_source_id, international_item_id);

-- FATF high-risk / increased monitoring country status
CREATE TABLE fatf_country_status (
  country_code TEXT PRIMARY KEY,
  country_name TEXT NOT NULL,
  list_type    TEXT NOT NULL,
  status       TEXT NOT NULL,
  as_of_date   TEXT,
  source_url   TEXT,
  notes        TEXT
);

-- FATF mutual evaluation summaries
CREATE TABLE mutual_evaluations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  jurisdiction_code TEXT NOT NULL,
  jurisdiction_name TEXT NOT NULL,
  assessment_body   TEXT NOT NULL DEFAULT 'FATF',
  publication_date  TEXT,
  overall_rating    TEXT,
  executive_summary TEXT,
  key_findings      TEXT NOT NULL DEFAULT '[]',
  priority_actions  TEXT NOT NULL DEFAULT '[]',
  source_url        TEXT
);

CREATE INDEX idx_mutual_evaluations_jurisdiction ON mutual_evaluations(jurisdiction_code);

-- Build metadata
CREATE TABLE db_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

/* ------------------------------------------------------------------ */
/*  Seed data interfaces                                              */
/* ------------------------------------------------------------------ */

interface SeedSource {
  id: string;
  full_name: string;
  authority: string;
  identifier?: string;
  category?: string;
  priority?: string;
  official_portal?: string;
  update_frequency?: string;
  last_updated?: string;
  freshness_days?: number;
  coverage_note?: string;
}

interface SeedProvision {
  provision_uid: string;
  source_id: string;
  part?: string;
  item_id: string;
  title?: string;
  text: string;
  topic_tags?: string[];
  requirement_level?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

interface SeedDefinition {
  term: string;
  definition: string;
  source: string;
  url?: string;
}

interface SeedNationalMapping {
  country_code: string;
  country_name: string;
  international_source_id: string;
  international_item_id: string;
  national_framework: string;
  national_reference: string;
  requirement_summary: string;
  status?: string;
  gap_notes?: string;
  evidence_url?: string;
}

interface SeedFatfStatus {
  country_code: string;
  country_name: string;
  list_type: string;
  status: string;
  as_of_date: string;
  source_url: string;
  notes?: string;
}

interface SeedMutualEvaluation {
  jurisdiction_code: string;
  jurisdiction_name: string;
  assessment_body: string;
  publication_date: string;
  overall_rating: string;
  executive_summary: string;
  key_findings?: string[];
  priority_actions?: string[];
  source_url?: string;
}

interface SeedData {
  sources?: SeedSource[];
  provisions?: SeedProvision[];
  definitions?: SeedDefinition[];
  national_mappings?: SeedNationalMapping[];
  fatf_country_status?: SeedFatfStatus[];
  mutual_evaluations?: SeedMutualEvaluation[];
}

/* ------------------------------------------------------------------ */
/*  Builder                                                           */
/* ------------------------------------------------------------------ */

export function buildDatabase(dbPath: string = DB_PATH): void {
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = DELETE');
  db.pragma('foreign_keys = OFF');
  db.exec(SCHEMA);

  // ---- Prepared statements ----

  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO sources (id, full_name, authority, identifier, category, priority,
      official_portal, update_frequency, last_updated, freshness_days, coverage_note)
    VALUES (@id, @full_name, @authority, @identifier, @category, @priority,
      @official_portal, @update_frequency, @last_updated, @freshness_days, @coverage_note)
  `);

  const insertProvision = db.prepare(`
    INSERT OR REPLACE INTO provisions (provision_uid, source_id, part, item_id, title, text,
      topic_tags, requirement_level, url, metadata)
    VALUES (@provision_uid, @source_id, @part, @item_id, @title, @text,
      @topic_tags, @requirement_level, @url, @metadata)
  `);

  const insertDefinition = db.prepare(`
    INSERT OR IGNORE INTO definitions (term, definition, source, url)
    VALUES (@term, @definition, @source, @url)
  `);

  const insertNationalMapping = db.prepare(`
    INSERT INTO national_mappings (country_code, country_name, international_source_id,
      international_item_id, national_framework, national_reference, requirement_summary,
      status, gap_notes, evidence_url)
    VALUES (@country_code, @country_name, @international_source_id,
      @international_item_id, @national_framework, @national_reference, @requirement_summary,
      @status, @gap_notes, @evidence_url)
  `);

  const insertFatfStatus = db.prepare(`
    INSERT OR REPLACE INTO fatf_country_status (country_code, country_name, list_type, status,
      as_of_date, source_url, notes)
    VALUES (@country_code, @country_name, @list_type, @status,
      @as_of_date, @source_url, @notes)
  `);

  const insertMutualEvaluation = db.prepare(`
    INSERT INTO mutual_evaluations (jurisdiction_code, jurisdiction_name, assessment_body,
      publication_date, overall_rating, executive_summary, key_findings, priority_actions, source_url)
    VALUES (@jurisdiction_code, @jurisdiction_name, @assessment_body,
      @publication_date, @overall_rating, @executive_summary, @key_findings, @priority_actions, @source_url)
  `);

  // ---- Load seed data ----

  const seedDir = join(__dirname, '..', 'data', 'seed');
  let totalProvisions = 0;
  let totalSources = 0;
  let totalDefinitions = 0;

  if (existsSync(seedDir)) {
    // Load base files first (sources), then expanded/supplementary (provisions that reference them)
    const seedFiles = readdirSync(seedDir)
      .filter((f) => f.endsWith('.json'))
      .sort((a, b) => {
        const aIsSupp = a.startsWith('expanded-') || a.startsWith('supplementary-');
        const bIsSupp = b.startsWith('expanded-') || b.startsWith('supplementary-');
        if (aIsSupp !== bIsSupp) return aIsSupp ? 1 : -1;
        return a.localeCompare(b);
      });

    db.transaction(() => {
      for (const file of seedFiles) {
        console.log(`  Loading seed file: ${file}`);
        const data: SeedData = JSON.parse(readFileSync(join(seedDir, file), 'utf-8'));

        if (data.sources) {
          for (const s of data.sources) {
            insertSource.run({
              id: s.id,
              full_name: s.full_name,
              authority: s.authority,
              identifier: s.identifier ?? null,
              category: s.category ?? 'standard',
              priority: s.priority ?? 'high',
              official_portal: s.official_portal ?? null,
              update_frequency: s.update_frequency ?? null,
              last_updated: s.last_updated ?? null,
              freshness_days: s.freshness_days ?? null,
              coverage_note: s.coverage_note ?? null,
            });
            totalSources++;
          }
        }

        if (data.provisions) {
          for (const p of data.provisions) {
            insertProvision.run({
              provision_uid: p.provision_uid,
              source_id: p.source_id,
              part: p.part ?? null,
              item_id: p.item_id,
              title: p.title ?? null,
              text: p.text,
              topic_tags: JSON.stringify(p.topic_tags ?? []),
              requirement_level: p.requirement_level ?? 'mandatory',
              url: p.url ?? null,
              metadata: p.metadata ? JSON.stringify(p.metadata) : null,
            });
            totalProvisions++;
          }
        }

        if (data.definitions) {
          for (const d of data.definitions) {
            insertDefinition.run({
              term: d.term,
              definition: d.definition,
              source: d.source ?? d.source_id ?? 'UNKNOWN',
              url: d.url ?? null,
            });
            totalDefinitions++;
          }
        }

        if (data.national_mappings) {
          for (const m of data.national_mappings) {
            insertNationalMapping.run({
              country_code: m.country_code,
              country_name: m.country_name,
              international_source_id: m.international_source_id,
              international_item_id: m.international_item_id ?? null,
              national_framework: m.national_framework ?? null,
              national_reference: m.national_reference ?? null,
              requirement_summary: m.requirement_summary ?? null,
              status: m.status ?? 'implemented',
              gap_notes: m.gap_notes ?? null,
              evidence_url: m.evidence_url ?? null,
            });
          }
        }

        if (data.fatf_country_status) {
          for (const f of data.fatf_country_status) {
            insertFatfStatus.run({
              country_code: f.country_code ?? f.jurisdiction_code,
              country_name: f.country_name ?? f.jurisdiction_name,
              list_type: f.list_type ?? f.category ?? 'monitored',
              status: f.status,
              as_of_date: f.as_of_date,
              source_url: f.source_url,
              notes: f.notes ?? null,
            });
          }
        }

        if (data.mutual_evaluations) {
          for (const me of data.mutual_evaluations) {
            insertMutualEvaluation.run({
              jurisdiction_code: me.jurisdiction_code ?? me.country_code,
              jurisdiction_name: me.jurisdiction_name ?? me.country_name,
              assessment_body: me.assessment_body ?? me.round ?? 'FATF',
              publication_date: me.publication_date ?? me.year ?? null,
              overall_rating: me.overall_rating ?? null,
              executive_summary: me.executive_summary ?? null,
              key_findings: JSON.stringify(me.key_findings ?? me.ratings ?? []),
              priority_actions: JSON.stringify(me.priority_actions ?? []),
              source_url: me.source_url ?? null,
            });
          }
        }
      }
    })();
  } else {
    console.log('  No data/seed/ directory found — creating empty database with schema only.');
  }

  // ---- Write metadata ----

  const insertMeta = db.prepare('INSERT INTO db_metadata (key, value) VALUES (?, ?)');
  db.transaction(() => {
    insertMeta.run('tier', 'offline-first');
    insertMeta.run('schema_version', '1');
    insertMeta.run('built_at', new Date().toISOString());
    insertMeta.run('builder', 'build-db.ts');
    insertMeta.run('domain', 'international-financial-regulation');
    insertMeta.run('source', 'Basel Committee, FATF, IOSCO, IAIS, FSB, CPMI-IOSCO');
    insertMeta.run('licence', 'Apache-2.0');
  })();

  // ---- Finalize ----

  db.pragma('journal_mode = DELETE');
  db.exec('ANALYZE');
  db.exec('VACUUM');
  db.close();

  console.log(`Database built: ${dbPath}`);
  console.log(`  Sources:     ${totalSources}`);
  console.log(`  Provisions:  ${totalProvisions}`);
  console.log(`  Definitions: ${totalDefinitions}`);
}

// CLI entry point
const scriptPath = process.argv[1];
if (scriptPath && import.meta.url.endsWith(scriptPath.replace(/\\/g, '/'))) {
  buildDatabase();
}
