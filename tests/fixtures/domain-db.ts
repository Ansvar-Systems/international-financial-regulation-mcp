import Database from 'better-sqlite3';

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
    source_id TEXT NOT NULL,
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
    source TEXT NOT NULL,
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
    international_source_id TEXT NOT NULL,
    international_item_id TEXT NOT NULL,
    national_framework TEXT NOT NULL,
    national_reference TEXT NOT NULL,
    requirement_summary TEXT NOT NULL,
    status TEXT NOT NULL,
    gap_notes TEXT,
    evidence_url TEXT
  );
`;

export function createDomainTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

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

  const insertStatus = db.prepare(`
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
      national_framework, national_reference, requirement_summary, status, gap_notes, evidence_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSource.run(
    'BASEL',
    'Basel Committee standards and guidance',
    'Bank for International Settlements',
    'BCBS',
    'prudential_standard',
    'critical',
    'https://www.bis.org/bcbs/publ/index.htm',
    'on_change',
    '2025-12-15',
    365,
    'Basel standards coverage',
  );
  insertSource.run(
    'FATF_REC',
    'FATF Recommendations and Methodology',
    'Financial Action Task Force',
    'FATF-40',
    'aml_cft_standard',
    'critical',
    'https://www.fatf-gafi.org',
    'on_change',
    '2025-11-01',
    365,
    'FATF recommendations coverage',
  );
  insertSource.run(
    'FATF_LIST',
    'FATF High-Risk and Increased Monitoring Lists',
    'Financial Action Task Force',
    'FATF-LISTS',
    'jurisdiction_status',
    'critical',
    'https://www.fatf-gafi.org',
    'monthly',
    '2026-01-30',
    45,
    'FATF list snapshot coverage',
  );

  insertProvision.run(
    'BASEL:BCBS239:P1',
    'BASEL',
    'Principle 1',
    'BCBS239-P1',
    'Governance',
    'A bank should establish strong governance over risk data aggregation and reporting.',
    JSON.stringify(['governance', 'risk-data']),
    'should',
    'https://www.bis.org/publ/bcbs239.htm',
    JSON.stringify({ standard_id: 'BCBS239' }),
  );
  insertProvision.run(
    'BASEL:BASEL3:CCB',
    'BASEL',
    'Part A',
    'BASEL3-CAPITAL-BUFFER',
    'Capital conservation buffer',
    'Banks must maintain a capital conservation buffer above minimum capital requirements.',
    JSON.stringify(['capital', 'prudential']),
    'must',
    'https://www.bis.org/basel_framework/',
    JSON.stringify({ standard_id: 'BASEL3' }),
  );
  insertProvision.run(
    'FATF_REC:R10',
    'FATF_REC',
    'Recommendation 10',
    'R10',
    'Customer due diligence',
    'Financial institutions must undertake customer due diligence including beneficial ownership checks.',
    JSON.stringify(['aml', 'cdd', 'beneficial-ownership']),
    'must',
    'https://www.fatf-gafi.org',
    JSON.stringify({ recommendation_number: 10 }),
  );
  insertProvision.run(
    'FATF_REC:R16',
    'FATF_REC',
    'Recommendation 16',
    'R16',
    'Wire transfers',
    'Financial institutions must ensure originator and beneficiary information accompanies wire transfers.',
    JSON.stringify(['aml', 'payments']),
    'must',
    'https://www.fatf-gafi.org',
    JSON.stringify({ recommendation_number: 16 }),
  );

  insertDefinition.run(
    'FATF_REC',
    'beneficial owner',
    'the natural person who ultimately owns or controls a customer',
    'R10',
  );

  insertStatus.run(
    'IRN',
    'Iran',
    'black',
    'high_risk',
    '2026-01-30',
    'https://www.fatf-gafi.org',
    'Offline snapshot',
  );
  insertStatus.run(
    'SWE',
    'Sweden',
    'none',
    'not_listed',
    '2026-01-30',
    'https://www.fatf-gafi.org',
    'Offline snapshot',
  );

  insertEvaluation.run(
    'SWE',
    'Sweden',
    'FATF',
    '2017-12-15',
    'Substantial effectiveness',
    'Sweden demonstrates a generally robust AML/CFT framework.',
    JSON.stringify(['Strong domestic cooperation']),
    JSON.stringify(['Enhance beneficial ownership verification controls']),
    'https://www.fatf-gafi.org',
  );

  insertMapping.run(
    'SWE',
    'Sweden',
    'FATF_REC',
    'R10',
    'Penningtvattslag (2017:630)',
    'Chapter 3 Sections 1-5',
    'Requires customer due diligence measures.',
    'implemented',
    null,
    'https://www.riksdagen.se',
  );

  return db;
}

export function closeDomainTestDatabase(db: Database.Database): void {
  db.close();
}
