#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type JsonObject = Record<string, unknown>;

type SourceId = 'BASEL' | 'FATF_REC' | 'FATF_LIST' | 'IOSCO' | 'IAIS' | 'FSB' | 'CPMI_IOSCO';

interface SourceRow {
  id: SourceId;
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
  source_id: SourceId;
  part: string | null;
  item_id: string;
  title: string | null;
  text: string;
  topic_tags: string[];
  requirement_level: 'must' | 'should' | 'guidance';
  url: string | null;
  metadata: JsonObject | null;
}

interface DefinitionRow {
  source: SourceId;
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
  international_source_id: SourceId;
  international_item_id: string;
  national_framework: string;
  national_reference: string;
  requirement_summary: string;
  status: string;
  gap_notes: string | null;
  evidence_url: string | null;
}

interface SeedSnapshot {
  snapshot_id?: string;
  generated_on?: string;
  note?: string;
  sources?: SourceRow[];
  provisions?: ProvisionRow[];
  definitions?: DefinitionRow[];
  fatf_country_status?: FatfCountryStatusRow[];
  mutual_evaluations?: MutualEvaluationRow[];
  national_mappings?: NationalMappingRow[];
}

interface BisDocumentEntry {
  path?: string;
  publication_timestamp?: string;
  publication_start_date?: string;
  short_title?: string;
  recurse_category?: string[];
  publication_type?: string;
  publication_status?: string;
  topics?: string[];
  sources?: string[];
}

interface BisDocumentListResponse {
  list?: Record<string, BisDocumentEntry>;
}

interface BisStandardChapter {
  id?: number;
  name?: string;
  title?: string;
  description?: string;
  revision_track_content?: string;
  in_force_at?: string;
  out_force_at?: string;
  removed_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface BisStandard {
  id?: number;
  name?: string;
  title?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  chapters?: BisStandardChapter[];
}

interface PfmiEntry {
  id_cms?: string;
  submitted_date?: string;
  jurisdiction?: string;
  authority?: string;
  fmi_type?: string;
  principle_id?: string;
  rating?: string;
  rating_date?: string;
  principle?: string;
  key_consideration?: string;
  implementation_measure?: string;
  key_conclusions?: string;
  l2_report_href?: string;
}

interface FatfFacetedEntry {
  path?: string;
  title?: string;
  publicationDate?: number | string | null;
  description?: string | null;
  imagePath?: string | null;
}

interface FatfFacetedSnapshot {
  total?: number;
  limit?: number;
  fetched?: number;
  fetchedAt?: string;
  results?: FatfFacetedEntry[];
}

interface IoscoDumpEntry {
  url?: string;
  title?: string | null;
  section?: string | null;
  publicationDate?: number | string | null;
  sourcePage?: string | null;
  description?: string | null;
}

interface IoscoDumpSnapshot {
  generatedAt?: string;
  total?: number;
  entries?: IoscoDumpEntry[];
}

interface IngestionWarning {
  source: SourceId | 'GLOBAL';
  message: string;
}

interface SourceIngestionStats {
  sourceId: SourceId;
  count: number;
  lastUpdated: string | null;
  coverageNote: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SEED_DIR = path.resolve(PROJECT_ROOT, 'data', 'seed');
const CORE_SEED_PATH = path.join(SEED_DIR, 'core.json');
const FATF_FACETED_PATH = path.resolve(PROJECT_ROOT, 'data', 'fatf-faceted-results.json');
const IOSCO_V2_DUMP_PATH = path.resolve(PROJECT_ROOT, 'data', 'iosco-v2-links.json');
const HTTP_TIMEOUT_MS = 45_000;
const USER_AGENT =
  '@ansvar/international-financial-regulation-mcp-ingester (+https://github.com/Ansvar-Systems/international-financial-regulation-mcp)';

const SOURCE_BASE: Record<SourceId, Omit<SourceRow, 'last_updated' | 'coverage_note'>> = {
  BASEL: {
    id: 'BASEL',
    full_name: 'Basel Committee standards and guidance',
    authority: 'Bank for International Settlements',
    identifier: 'BCBS',
    category: 'prudential_standard',
    priority: 'critical',
    official_portal: 'https://www.bis.org/bcbs/publ/index.htm',
    update_frequency: 'on_change',
    freshness_days: 365,
  },
  FATF_REC: {
    id: 'FATF_REC',
    full_name: 'FATF Recommendations and Methodology',
    authority: 'Financial Action Task Force',
    identifier: 'FATF-40',
    category: 'aml_cft_standard',
    priority: 'critical',
    official_portal: 'https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Fatf-recommendations.html',
    update_frequency: 'on_change',
    freshness_days: 365,
  },
  FATF_LIST: {
    id: 'FATF_LIST',
    full_name: 'FATF High-Risk and Increased Monitoring Lists',
    authority: 'Financial Action Task Force',
    identifier: 'FATF-LISTS',
    category: 'jurisdiction_status',
    priority: 'critical',
    official_portal: 'https://www.fatf-gafi.org/en/countries/black-and-grey-lists.html',
    update_frequency: 'monthly',
    freshness_days: 45,
  },
  IOSCO: {
    id: 'IOSCO',
    full_name: 'IOSCO Principles and publications',
    authority: 'International Organization of Securities Commissions',
    identifier: 'IOSCO',
    category: 'market_regulation_standard',
    priority: 'high',
    official_portal: 'https://www.iosco.org',
    update_frequency: 'on_change',
    freshness_days: 540,
  },
  IAIS: {
    id: 'IAIS',
    full_name: 'IAIS Insurance Core Principles and guidance corpus',
    authority: 'International Association of Insurance Supervisors',
    identifier: 'IAIS-ICP',
    category: 'insurance_supervision_standard',
    priority: 'high',
    official_portal: 'https://www.iais.org',
    update_frequency: 'on_change',
    freshness_days: 540,
  },
  FSB: {
    id: 'FSB',
    full_name: 'FSB policy and publication corpus',
    authority: 'Financial Stability Board',
    identifier: 'FSB',
    category: 'resolution_standard',
    priority: 'high',
    official_portal: 'https://www.fsb.org',
    update_frequency: 'on_change',
    freshness_days: 540,
  },
  CPMI_IOSCO: {
    id: 'CPMI_IOSCO',
    full_name: 'CPMI-IOSCO standards, publications, and PFMI implementation records',
    authority: 'BIS and IOSCO',
    identifier: 'PFMI',
    category: 'fmi_standard',
    priority: 'high',
    official_portal: 'https://www.bis.org/cpmi/publ/index.htm',
    update_frequency: 'on_change',
    freshness_days: 730,
  },
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--full')) {
    await ingestFullCorpus();
    return;
  }

  if (args.includes('--validate')) {
    printUsage();
    validateExistingSeeds();
    return;
  }

  if (args.length === 2 && !args[0].startsWith('--')) {
    const [sourceIdArg, inputPathArg] = args;
    ingestSourcePackage(sourceIdArg, inputPathArg);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

function ingestSourcePackage(sourceIdArg: string, inputPathArg: string): void {
  const sourceId = sourceIdArg.trim().toUpperCase();
  const inputPath = path.resolve(process.cwd(), inputPathArg);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as SeedSnapshot;
  const normalized = normalizeForSource(sourceId, input);

  fs.mkdirSync(SEED_DIR, { recursive: true });

  const outputPath = path.join(SEED_DIR, `${sourceId.toLowerCase()}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');

  console.log(`Ingested source package for ${sourceId}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Sources: ${normalized.sources?.length ?? 0}`);
  console.log(`Provisions: ${normalized.provisions?.length ?? 0}`);
  console.log(`Definitions: ${normalized.definitions?.length ?? 0}`);
  console.log(`Mappings: ${normalized.national_mappings?.length ?? 0}`);
}

function printUsage(): void {
  console.log('Usage:');
  console.log('  npm run ingest                       # Run full live ingestion and write data/seed/core.json');
  console.log('  npm run ingest -- --full             # Same as above');
  console.log('  npm run ingest -- --validate         # Validate existing local seeds');
  console.log('  npm run ingest -- <SOURCE_ID> <input.json>  # Legacy source-package normalizer');
  console.log('');
  console.log('Example:');
  console.log('  npm run ingest -- BASEL ./tmp/basel-package.json');
}

function normalizeForSource(sourceId: string, input: SeedSnapshot): SeedSnapshot {
  const sources = (input.sources ?? []).filter((source) => source.id.toUpperCase() === sourceId);
  const provisions = (input.provisions ?? []).filter(
    (provision) => provision.source_id.toUpperCase() === sourceId,
  );
  const definitions = (input.definitions ?? []).filter(
    (definition) => definition.source.toUpperCase() === sourceId,
  );

  const nationalMappings = (input.national_mappings ?? []).filter(
    (mapping) => mapping.international_source_id.toUpperCase() === sourceId,
  );

  const snapshot: SeedSnapshot = {
    sources,
    provisions,
    definitions,
    national_mappings: nationalMappings,
  };

  if (sourceId === 'FATF_LIST') {
    snapshot.fatf_country_status = input.fatf_country_status ?? [];
  }

  if (sourceId === 'FATF_REC') {
    snapshot.mutual_evaluations = input.mutual_evaluations ?? [];
  }

  return snapshot;
}

async function ingestFullCorpus(): Promise<void> {
  fs.mkdirSync(SEED_DIR, { recursive: true });

  const baseline = loadBaselineCore();
  const warnings: IngestionWarning[] = [];

  const [baselResult, cpmiResult, fsbResult, iaisResult, ioscoResult, fatfLinkResult] = await Promise.all([
    ingestBasel(),
    ingestCpmiIosco(),
    ingestFsb(),
    ingestIais(),
    ingestIosco(),
    ingestFatfPublicationLinks(),
  ]);

  warnings.push(...baselResult.warnings);
  warnings.push(...cpmiResult.warnings);
  warnings.push(...fsbResult.warnings);
  warnings.push(...iaisResult.warnings);
  warnings.push(...ioscoResult.warnings);
  warnings.push(...fatfLinkResult.warnings);

  const allProvisions = dedupeProvisions([
    ...(baseline.provisions ?? []),
    ...baselResult.provisions,
    ...cpmiResult.provisions,
    ...fsbResult.provisions,
    ...iaisResult.provisions,
    ...ioscoResult.provisions,
    ...fatfLinkResult.provisions,
  ]);

  const sourceStats = buildSourceStats(allProvisions, [
    ...baselResult.sourceStats,
    ...cpmiResult.sourceStats,
    ...fsbResult.sourceStats,
    ...iaisResult.sourceStats,
    ...ioscoResult.sourceStats,
    ...fatfLinkResult.sourceStats,
  ]);

  const today = toIsoDate(new Date());
  const sources = buildSourceRows(sourceStats);
  const definitions = dedupeDefinitions(baseline.definitions ?? []);

  const snapshot: SeedSnapshot = {
    snapshot_id: `intl-finreg-live-${today}`,
    generated_on: today,
    note:
      'Live ingestion from official machine-readable endpoints (BIS APIs, FSB/IAIS sitemaps, IOSCO v2/RSS) with FATF faceted corpus ingestion and resilient fallbacks.',
    sources,
    provisions: allProvisions,
    definitions,
    fatf_country_status: dedupeFatfStatus(baseline.fatf_country_status ?? []),
    mutual_evaluations: dedupeMutualEvaluations(baseline.mutual_evaluations ?? []),
    national_mappings: dedupeMappings(baseline.national_mappings ?? []),
  };

  fs.writeFileSync(CORE_SEED_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf-8');

  console.log('Full corpus ingestion complete.');
  console.log(`Output: ${CORE_SEED_PATH}`);
  console.log(`Sources: ${sources.length}`);
  console.log(`Provisions: ${allProvisions.length}`);
  console.log(`Definitions: ${definitions.length}`);
  console.log(`FATF statuses: ${snapshot.fatf_country_status?.length ?? 0}`);
  console.log(`Mutual evaluations: ${snapshot.mutual_evaluations?.length ?? 0}`);
  console.log(`National mappings: ${snapshot.national_mappings?.length ?? 0}`);

  for (const stat of sourceStats.sort((a, b) => a.sourceId.localeCompare(b.sourceId))) {
    console.log(`- ${stat.sourceId}: ${stat.count} provisions (last_updated=${stat.lastUpdated ?? 'unknown'})`);
  }

  if (warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`- [${warning.source}] ${warning.message}`);
    }
  }
}

async function ingestBasel(): Promise<{
  provisions: ProvisionRow[];
  sourceStats: SourceIngestionStats[];
  warnings: IngestionWarning[];
}> {
  const warnings: IngestionWarning[] = [];
  const provisions: ProvisionRow[] = [];
  const sourceDates: string[] = [];

  try {
    const docs = await fetchJson<BisDocumentListResponse>('https://www.bis.org/api/document_lists/bcbspubls.json');
    for (const [key, doc] of Object.entries(docs.list ?? {})) {
      const itemId = `DOC-${slugForId(lastPathSegment(key))}`;
      const title = cleanText(doc.short_title ?? key);
      const publicationDate = normalizeDate(doc.publication_start_date ?? doc.publication_timestamp);
      if (publicationDate) {
        sourceDates.push(publicationDate);
      }

      provisions.push({
        provision_uid: `BASEL:${itemId}`,
        source_id: 'BASEL',
        part: doc.publication_type ?? doc.recurse_category?.[0] ?? null,
        item_id: itemId,
        title,
        text: compactText(
          `${title}. Type: ${doc.publication_type ?? 'publication'}. Status: ${doc.publication_status ?? 'unknown'}. Topics: ${(doc.topics ?? []).join(', ') || 'none listed'}.`,
        ),
        topic_tags: dedupeTags(['basel', 'bcbs', ...(doc.topics ?? []).map((topic) => slugForTag(topic))]),
        requirement_level: 'guidance',
        url: absoluteBisUrl(doc.path ?? key),
        metadata: {
          standard_id: deriveBaselStandardId(key),
          publication_type: doc.publication_type ?? null,
          publication_status: doc.publication_status ?? null,
          publication_start_date: publicationDate,
          bis_path: doc.path ?? key,
        },
      });
    }
  } catch (error) {
    warnings.push({
      source: 'BASEL',
      message: `Failed to ingest BCBS publication list: ${toErrorMessage(error)}`,
    });
  }

  try {
    const standards = await fetchJson<BisStandard[]>('https://www.bis.org/api/bcbs_standards.json');
    for (const standard of standards) {
      const standardId = slugForId(standard.name ?? `STD-${standard.id ?? 'UNKNOWN'}`);
      const standardTitle = cleanText(standard.title ?? standardId);
      const standardDate = normalizeDate(standard.updated_at ?? standard.created_at);
      if (standardDate) {
        sourceDates.push(standardDate);
      }

      provisions.push({
        provision_uid: `BASEL:STANDARD-${standardId}`,
        source_id: 'BASEL',
        part: 'Standard',
        item_id: `STANDARD-${standardId}`,
        title: standardTitle,
        text: compactText(stripHtml(standard.description ?? standardTitle)),
        topic_tags: dedupeTags(['basel', 'bcbs', slugForTag(standardId)]),
        requirement_level: 'must',
        url: 'https://www.bis.org/basel_framework/',
        metadata: {
          standard_id: standardId,
          standard_name: standard.name ?? null,
          standard_title: standardTitle,
          publication_start_date: standardDate,
        },
      });

      for (const chapter of standard.chapters ?? []) {
        const chapterId = chapter.id ?? 0;
        const chapterCode = slugForId(chapter.name ?? String(chapterId));
        const itemId = `${standardId}-CH${chapterCode}-${chapterId}`;
        const chapterDate = normalizeDate(
          chapter.updated_at ?? chapter.in_force_at ?? chapter.created_at ?? chapter.out_force_at ?? chapter.removed_at,
        );
        if (chapterDate) {
          sourceDates.push(chapterDate);
        }

        provisions.push({
          provision_uid: `BASEL:${itemId}`,
          source_id: 'BASEL',
          part: `Chapter ${chapter.name ?? chapterId}`,
          item_id: itemId,
          title: cleanText(chapter.title ?? `${standardTitle} chapter ${chapter.name ?? chapterId}`),
          text: compactText(
            stripHtml(
              `${chapter.description ?? ''} ${chapter.revision_track_content ?? ''}`.trim() ||
                `${standardTitle} chapter ${chapter.name ?? chapterId}`,
            ),
          ),
          topic_tags: dedupeTags(['basel', 'bcbs', slugForTag(standardId), 'capital-framework']),
          requirement_level: 'must',
          url: 'https://www.bis.org/basel_framework/',
          metadata: {
            standard_id: standardId,
            standard_name: standard.name ?? null,
            chapter_id: chapterId,
            chapter_name: chapter.name ?? null,
            chapter_title: chapter.title ?? null,
            in_force_at: normalizeDate(chapter.in_force_at),
            out_force_at: normalizeDate(chapter.out_force_at),
            removed_at: normalizeDate(chapter.removed_at),
            publication_start_date: chapterDate,
          },
        });
      }
    }
  } catch (error) {
    warnings.push({
      source: 'BASEL',
      message: `Failed to ingest Basel standards API: ${toErrorMessage(error)}`,
    });
  }

  return {
    provisions,
    sourceStats: [
      {
        sourceId: 'BASEL',
        count: provisions.length,
        lastUpdated: maxDate(sourceDates),
        coverageNote: 'Basel records from BIS BCBS publication and standards APIs.',
      },
    ],
    warnings,
  };
}

async function ingestCpmiIosco(): Promise<{
  provisions: ProvisionRow[];
  sourceStats: SourceIngestionStats[];
  warnings: IngestionWarning[];
}> {
  const warnings: IngestionWarning[] = [];
  const provisions: ProvisionRow[] = [];
  const sourceDates: string[] = [];

  try {
    const docs = await fetchJson<BisDocumentListResponse>('https://www.bis.org/api/document_lists/cpmi_all.json');
    for (const [key, doc] of Object.entries(docs.list ?? {})) {
      const itemId = `DOC-${slugForId(lastPathSegment(key))}`;
      const title = cleanText(doc.short_title ?? key);
      const publicationDate = normalizeDate(doc.publication_start_date ?? doc.publication_timestamp);
      if (publicationDate) {
        sourceDates.push(publicationDate);
      }

      provisions.push({
        provision_uid: `CPMI_IOSCO:${itemId}`,
        source_id: 'CPMI_IOSCO',
        part: doc.publication_type ?? doc.recurse_category?.[0] ?? null,
        item_id: itemId,
        title,
        text: compactText(
          `${title}. Type: ${doc.publication_type ?? 'publication'}. Topics: ${(doc.topics ?? []).join(', ') || 'none listed'}.`,
        ),
        topic_tags: dedupeTags([
          'cpmi-iosco',
          'cpmi',
          'fmi',
          ...(doc.topics ?? []).map((topic) => slugForTag(topic)),
        ]),
        requirement_level: 'guidance',
        url: absoluteBisUrl(doc.path ?? key),
        metadata: {
          standard_id: inferCpmiStandardId(doc.short_title ?? ''),
          publication_type: doc.publication_type ?? null,
          publication_start_date: publicationDate,
          bis_path: doc.path ?? key,
        },
      });
    }
  } catch (error) {
    warnings.push({
      source: 'CPMI_IOSCO',
      message: `Failed to ingest CPMI publication list: ${toErrorMessage(error)}`,
    });
  }

  try {
    const pfmi = await fetchJson<Record<string, PfmiEntry>>('https://www.bis.org/api/pfmi.json');
    for (const entry of Object.values(pfmi)) {
      const rawId = entry.id_cms ?? `${entry.jurisdiction ?? 'UNK'}-${entry.principle_id ?? 'UNK'}`;
      const itemId = `PFMI-${slugForId(rawId)}`;
      const principleId = cleanText(entry.principle_id ?? 'unknown');
      const date = normalizeDate(entry.rating_date ?? entry.submitted_date);
      if (date) {
        sourceDates.push(date);
      }

      const text = compactText(
        [
          entry.principle,
          entry.key_consideration,
          entry.implementation_measure,
          entry.key_conclusions,
        ]
          .filter(Boolean)
          .join(' '),
      );

      provisions.push({
        provision_uid: `CPMI_IOSCO:${itemId}`,
        source_id: 'CPMI_IOSCO',
        part: `Principle ${principleId}`,
        item_id: itemId,
        title: cleanText(`PFMI ${principleId} - ${entry.jurisdiction ?? 'Unknown jurisdiction'} ${entry.fmi_type ?? ''}`),
        text: text.length > 0 ? text : cleanText(entry.principle ?? 'PFMI implementation record'),
        topic_tags: dedupeTags([
          'cpmi-iosco',
          'pfmi',
          slugForTag(entry.fmi_type ?? 'fmi'),
          slugForTag(entry.rating ?? 'rating-unknown'),
        ]),
        requirement_level: 'guidance',
        url: entry.l2_report_href ?? 'https://www.bis.org/cpmi/publ/d101a.pdf',
        metadata: {
          standard_id: 'PFMI',
          principle_id: principleId,
          jurisdiction: entry.jurisdiction ?? null,
          authority: entry.authority ?? null,
          fmi_type: entry.fmi_type ?? null,
          rating: entry.rating ?? null,
          rating_date: normalizeDate(entry.rating_date),
          submitted_date: normalizeDate(entry.submitted_date),
          source_record_id: entry.id_cms ?? null,
        },
      });
    }
  } catch (error) {
    warnings.push({
      source: 'CPMI_IOSCO',
      message: `Failed to ingest PFMI API: ${toErrorMessage(error)}`,
    });
  }

  return {
    provisions,
    sourceStats: [
      {
        sourceId: 'CPMI_IOSCO',
        count: provisions.length,
        lastUpdated: maxDate(sourceDates),
        coverageNote: 'CPMI-IOSCO records from BIS CPMI publication list and PFMI implementation API.',
      },
    ],
    warnings,
  };
}

async function ingestFsb(): Promise<{
  provisions: ProvisionRow[];
  sourceStats: SourceIngestionStats[];
  warnings: IngestionWarning[];
}> {
  const warnings: IngestionWarning[] = [];
  const rssProvisions: ProvisionRow[] = [];
  const sitemapProvisions: ProvisionRow[] = [];
  const sourceDates: string[] = [];

  try {
    const feedXml = await fetchText('https://www.fsb.org/feed/');
    const items = parseRssItems(feedXml);

    for (const item of items) {
      const url = item.link ? toAbsoluteUrl('https://www.fsb.org', item.link) : null;
      const title = cleanText(item.title || 'FSB publication');
      const pubDate = normalizeDate(item.pubDate);
      if (pubDate) {
        sourceDates.push(pubDate);
      }
      const itemId = itemIdFromUrl(url ?? `https://www.fsb.org/feed/#${item.guid ?? title}`, 'FSB');

      rssProvisions.push({
        provision_uid: `FSB:${itemId}`,
        source_id: 'FSB',
        part: 'RSS',
        item_id: itemId,
        title,
        text: compactText(stripHtml(item.description || item.content || title)),
        topic_tags: dedupeTags(['fsb', 'financial-stability', ...(item.categories.map((cat) => slugForTag(cat)))]),
        requirement_level: 'guidance',
        url,
        metadata: {
          publication_start_date: pubDate,
          guid: item.guid || null,
          source_feed: 'https://www.fsb.org/feed/',
        },
      });
    }
  } catch (error) {
    warnings.push({
      source: 'FSB',
      message: `Failed to ingest FSB RSS feed: ${toErrorMessage(error)}`,
    });
  }

  try {
    const sitemapXml = await fetchText('https://www.fsb.org/sitemap_index.xml');
    const urls = parseSitemapUrls(sitemapXml);

    for (const entry of urls) {
      const lastmod = normalizeDate(entry.lastmod);
      if (lastmod) {
        sourceDates.push(lastmod);
      }
      const itemId = itemIdFromUrl(entry.loc, 'FSB');
      const title = titleFromUrl(entry.loc, 'FSB item');

      sitemapProvisions.push({
        provision_uid: `FSB:${itemId}`,
        source_id: 'FSB',
        part: urlFirstPathSegment(entry.loc),
        item_id: itemId,
        title,
        text: compactText(`${title}. Official FSB corpus URL indexed in sitemap.`),
        topic_tags: dedupeTags(['fsb', ...urlPathTags(entry.loc)]),
        requirement_level: 'guidance',
        url: entry.loc,
        metadata: {
          publication_start_date: lastmod,
          source_sitemap: 'https://www.fsb.org/sitemap_index.xml',
          url_path: safeUrlPath(entry.loc),
        },
      });
    }
  } catch (error) {
    warnings.push({
      source: 'FSB',
      message: `Failed to ingest FSB sitemap: ${toErrorMessage(error)}`,
    });
  }

  const provisions = dedupeProvisions([...rssProvisions, ...sitemapProvisions]);

  return {
    provisions,
    sourceStats: [
      {
        sourceId: 'FSB',
        count: provisions.length,
        lastUpdated: maxDate(sourceDates),
        coverageNote: 'FSB corpus URLs and feed entries from official sitemap and RSS.',
      },
    ],
    warnings,
  };
}

async function ingestIais(): Promise<{
  provisions: ProvisionRow[];
  sourceStats: SourceIngestionStats[];
  warnings: IngestionWarning[];
}> {
  const warnings: IngestionWarning[] = [];
  const provisions: ProvisionRow[] = [];
  const sourceDates: string[] = [];

  try {
    const sitemapXml = await fetchText('https://www.iais.org/sitemap.xml');
    const urls = parseSitemapUrls(sitemapXml);

    for (const entry of urls) {
      const lastmod = normalizeDate(entry.lastmod);
      if (lastmod) {
        sourceDates.push(lastmod);
      }
      const itemId = itemIdFromUrl(entry.loc, 'IAIS');
      const title = titleFromUrl(entry.loc, 'IAIS item');

      provisions.push({
        provision_uid: `IAIS:${itemId}`,
        source_id: 'IAIS',
        part: urlFirstPathSegment(entry.loc),
        item_id: itemId,
        title,
        text: compactText(`${title}. Official IAIS corpus URL indexed in sitemap.`),
        topic_tags: dedupeTags(['iais', 'insurance', ...urlPathTags(entry.loc)]),
        requirement_level: 'guidance',
        url: entry.loc,
        metadata: {
          publication_start_date: lastmod,
          source_sitemap: 'https://www.iais.org/sitemap.xml',
          url_path: safeUrlPath(entry.loc),
        },
      });
    }
  } catch (error) {
    warnings.push({
      source: 'IAIS',
      message: `Failed to ingest IAIS sitemap: ${toErrorMessage(error)}`,
    });
  }

  return {
    provisions,
    sourceStats: [
      {
        sourceId: 'IAIS',
        count: provisions.length,
        lastUpdated: maxDate(sourceDates),
        coverageNote: 'IAIS corpus URLs from official sitemap.',
      },
    ],
    warnings,
  };
}

async function ingestIosco(): Promise<{
  provisions: ProvisionRow[];
  sourceStats: SourceIngestionStats[];
  warnings: IngestionWarning[];
}> {
  const warnings: IngestionWarning[] = [];
  const collectedByUrl = new Map<
    string,
    {
      url: string;
      title: string | null;
      section: string | null;
      publicationDate: string | null;
      description: string | null;
      sourceMode: 'v2-dump' | 'v2-crawl' | 'rss';
      sourcePage: string | null;
      guid: string | null;
    }
  >();
  const sourceDates: string[] = [];

  const upsertCollected = (entry: {
    url: string;
    title: string | null;
    section: string | null;
    publicationDate: string | null;
    description: string | null;
    sourceMode: 'v2-dump' | 'v2-crawl' | 'rss';
    sourcePage: string | null;
    guid?: string | null;
  }): void => {
    const existing = collectedByUrl.get(entry.url);
    if (!existing) {
      collectedByUrl.set(entry.url, {
        ...entry,
        guid: entry.guid ?? null,
      });
      return;
    }

    collectedByUrl.set(entry.url, {
      url: entry.url,
      title: choosePreferred(existing.title, entry.title),
      section: choosePreferred(existing.section, entry.section),
      publicationDate: maxDate([existing.publicationDate, entry.publicationDate]),
      description: chooseLonger(existing.description, entry.description),
      sourceMode: existing.sourceMode === 'v2-dump' ? existing.sourceMode : entry.sourceMode,
      sourcePage: choosePreferred(existing.sourcePage, entry.sourcePage),
      guid: choosePreferred(existing.guid, entry.guid ?? null),
    });
  };

  const dumpEntries = loadIoscoDumpEntries();
  for (const entry of dumpEntries) {
    const url = normalizeIoscoUrl(entry.url ?? '');
    if (!url || !isLikelyIoscoCorpusUrl(url)) {
      continue;
    }
    const publicationDate = normalizeDateFromAny(entry.publicationDate);
    if (publicationDate) {
      sourceDates.push(publicationDate);
    }

    upsertCollected({
      url,
      title: cleanText(entry.title ?? ''),
      section: normalizeIoscoSection(entry.section),
      publicationDate,
      description: cleanText(entry.description ?? ''),
      sourceMode: 'v2-dump',
      sourcePage: entry.sourcePage ?? null,
    });
  }

  if (dumpEntries.length === 0) {
    warnings.push({
      source: 'IOSCO',
      message: `IOSCO v2 dump not found at ${IOSCO_V2_DUMP_PATH}; attempting direct crawl and RSS fallback.`,
    });
  }

  const ioscoSectionUrls = [
    'https://iosco.org/v2/publications/?subsection=public_reports',
    'https://iosco.org/v2/publications/?subsection=public_comment_letters',
    'https://iosco.org/v2/publications/?subsection=consultation_reports',
    'https://iosco.org/v2/publications/?subsection=methodologies',
    'https://iosco.org/v2/publications/?subsection=policy_recommendations',
    'https://iosco.org/v2/publications/?subsection=standards',
    'https://iosco.org/v2/publications/?subsection=reports',
    'https://iosco.org/v2/publications/?subsection=iosco_annual_reports',
    'https://iosco.org/v2/publications/?subsection=implementation_reports',
    'https://iosco.org/v2/publications/?subsection=market_intelligence_reports',
    'https://iosco.org/v2/media_room/?subsection=media_releases',
    'https://iosco.org/v2/media_room/?subsection=speeches',
    'https://iosco.org/v2/media_room/?subsection=opinion_editorials',
    'https://iosco.org/v2/media_room/?subsection=events',
  ];

  for (const sectionUrl of ioscoSectionUrls) {
    try {
      const sectionRows = await crawlIoscoSection(sectionUrl);
      for (const row of sectionRows) {
        const publicationDate = normalizeDateFromAny(row.publicationDate);
        if (publicationDate) {
          sourceDates.push(publicationDate);
        }
        upsertCollected({
          url: row.url,
          title: cleanText(row.title ?? ''),
          section: normalizeIoscoSection(row.section),
          publicationDate,
          description: cleanText(row.description ?? ''),
          sourceMode: 'v2-crawl',
          sourcePage: row.sourcePage ?? sectionUrl,
        });
      }
    } catch (error) {
      warnings.push({
        source: 'IOSCO',
        message: `Failed IOSCO v2 crawl for ${sectionUrl}: ${toErrorMessage(error)}`,
      });
    }
  }

  try {
    const rss = await fetchText('https://www.iosco.org/rss/rss.xml');
    const items = parseRssItems(rss);

    for (const item of items) {
      const rawUrl = item.link ? toAbsoluteUrl('https://www.iosco.org', item.link) : '';
      const url = normalizeIoscoUrl(rawUrl);
      if (!url) {
        continue;
      }

      const title = cleanText(item.title || 'IOSCO publication');
      const pubDate = normalizeDate(item.pubDate);
      if (pubDate) {
        sourceDates.push(pubDate);
      }

      upsertCollected({
        url,
        title,
        section: item.categories[0] ?? null,
        publicationDate: pubDate,
        description: cleanText(stripHtml(item.description || item.content || '')),
        sourceMode: 'rss',
        sourcePage: 'https://www.iosco.org/rss/rss.xml',
        guid: item.guid || null,
      });
    }
  } catch (error) {
    warnings.push({
      source: 'IOSCO',
      message: `Failed to ingest IOSCO RSS feed: ${toErrorMessage(error)}`,
    });
  }

  const provisions: ProvisionRow[] = [];
  for (const row of collectedByUrl.values()) {
    const title = cleanText(row.title ?? titleFromUrl(row.url, 'IOSCO publication'));
    const publicationDate = normalizeDate(row.publicationDate);
    if (publicationDate) {
      sourceDates.push(publicationDate);
    }
    const standardId = inferIoscoStandardId(title, row.description ?? '');
    const section = row.section ?? inferIoscoSectionFromUrl(row.url) ?? 'Publication';

    provisions.push({
      provision_uid: `IOSCO:${itemIdFromUrl(row.url, 'IOSCO')}`,
      source_id: 'IOSCO',
      part: section,
      item_id: itemIdFromUrl(row.url, 'IOSCO'),
      title,
      text: compactText(
        [title, row.description ?? '', `IOSCO corpus record discovered via ${row.sourceMode}.`]
          .filter((part) => part.trim().length > 0)
          .join(' '),
      ),
      topic_tags: dedupeTags([
        'iosco',
        slugForTag(section),
        ...urlPathTags(row.url),
      ]),
      requirement_level: title.toLowerCase().includes('principle') ? 'should' : 'guidance',
      url: row.url,
      metadata: {
        standard_id: standardId,
        publication_start_date: publicationDate,
        guid: row.guid,
        source_mode: row.sourceMode,
        source_page: row.sourcePage,
      },
    });
  }

  const dedupedProvisions = dedupeProvisions(provisions);

  return {
    provisions: dedupedProvisions,
    sourceStats: [
      {
        sourceId: 'IOSCO',
        count: dedupedProvisions.length,
        lastUpdated: maxDate(sourceDates),
        coverageNote:
          'IOSCO corpus records from local v2 crawl dump, direct v2 crawling, and official RSS fallback.',
      },
    ],
    warnings,
  };
}

async function ingestFatfPublicationLinks(): Promise<{
  provisions: ProvisionRow[];
  sourceStats: SourceIngestionStats[];
  warnings: IngestionWarning[];
}> {
  const warnings: IngestionWarning[] = [];
  const provisions: ProvisionRow[] = [];
  const sourceDates: string[] = [];

  const facetedEntries = loadFatfFacetedEntries();
  if (facetedEntries.length > 0) {
    for (const entry of facetedEntries) {
      const resolvedUrl = fatfPathToPublicUrl(entry.path ?? '');
      if (!resolvedUrl) {
        continue;
      }

      const sourceId = classifyFatfSource(entry.path ?? '', entry.title ?? '');
      const itemId = itemIdFromUrl(resolvedUrl, sourceId);
      const title = cleanText(entry.title ?? titleFromUrl(resolvedUrl, 'FATF publication'));
      const publicationDate = normalizeDateFromAny(entry.publicationDate);
      if (publicationDate) {
        sourceDates.push(publicationDate);
      }
      const description = cleanText(entry.description ?? '');
      const part = fatfPartFromPath(entry.path ?? '');

      provisions.push({
        provision_uid: `${sourceId}:${itemId}`,
        source_id: sourceId,
        part,
        item_id: itemId,
        title,
        text: compactText([title, description].filter((partValue) => partValue.length > 0).join(' ')),
        topic_tags: dedupeTags([
          'fatf',
          sourceId === 'FATF_LIST' ? 'jurisdiction-risk' : 'aml-cft',
          ...urlPathTags(resolvedUrl),
        ]),
        requirement_level: sourceId === 'FATF_LIST' ? 'should' : 'guidance',
        url: resolvedUrl,
        metadata: {
          publication_start_date: publicationDate,
          fatf_path: entry.path ?? null,
          image_path: entry.imagePath ?? null,
          ingestion_mode: 'fatf-faceted-results',
          source_file: path.basename(FATF_FACETED_PATH),
        },
      });
    }
  } else {
    warnings.push({
      source: 'FATF_REC',
      message: `FATF faceted dump not found at ${FATF_FACETED_PATH}; using fallback link extraction.`,
    });
  }

  const fatfMirrorUrl = 'https://r.jina.ai/http://www.fatf-gafi.org/en/publications/mutualevaluations.html';

  if (facetedEntries.length === 0) {
    try {
      const markdown = await fetchText(fatfMirrorUrl);
      const links = extractMarkdownLinks(markdown).filter((link) =>
        /fatf-gafi\.org\/en\/publications\//i.test(link.url),
      );

      for (const link of links) {
        const sourceId: SourceId = classifyFatfSource(link.url, link.text);
        const normalizedUrl = link.url.replace(/^http:\/\//i, 'https://');
        const itemId = itemIdFromUrl(normalizedUrl, sourceId);
        const title = cleanText(link.text || titleFromUrl(normalizedUrl, 'FATF publication'));
        const dateMatch = title.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
        const publicationDate = normalizeDate(dateMatch?.[1] ?? null);
        if (publicationDate) {
          sourceDates.push(publicationDate);
        }

        provisions.push({
          provision_uid: `${sourceId}:${itemId}`,
          source_id: sourceId,
          part: 'Publication index',
          item_id: itemId,
          title,
          text: compactText(`${title}. FATF publication reference discovered from official publication index.`),
          topic_tags: dedupeTags([
            'fatf',
            sourceId === 'FATF_LIST' ? 'jurisdiction-risk' : 'aml-cft',
            ...urlPathTags(normalizedUrl),
          ]),
          requirement_level: 'guidance',
          url: normalizedUrl,
          metadata: {
            publication_start_date: publicationDate,
            source_mirror: fatfMirrorUrl,
            ingestion_mode: 'link-extraction-fallback',
          },
        });
      }

      if (provisions.length === 0) {
        warnings.push({
          source: 'FATF_REC',
          message:
            'FATF publication page fetched but no publication links were extracted; retaining curated FATF seed records only.',
        });
      }
    } catch (error) {
      warnings.push({
        source: 'FATF_REC',
        message: `Could not ingest FATF publication links (likely bot protection): ${toErrorMessage(error)}`,
      });
      warnings.push({
        source: 'FATF_LIST',
        message: 'Programmatic FATF list ingestion blocked; retaining curated FATF list snapshot rows.',
      });
    }
  }

  const dedupedProvisions = dedupeProvisions(provisions);

  return {
    provisions: dedupedProvisions,
    sourceStats: [
      {
        sourceId: 'FATF_REC',
        count: dedupedProvisions.filter((row) => row.source_id === 'FATF_REC').length,
        lastUpdated: maxDate(sourceDates),
        coverageNote:
          'FATF recommendation corpus from faceted publication index with resilient link-extraction fallback.',
      },
      {
        sourceId: 'FATF_LIST',
        count: dedupedProvisions.filter((row) => row.source_id === 'FATF_LIST').length,
        lastUpdated: maxDate(sourceDates),
        coverageNote:
          'FATF jurisdiction list corpus from faceted publication index with resilient link-extraction fallback.',
      },
    ],
    warnings,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetchWithTimeout(url);
  const text = await response.text();
  return JSON.parse(text) as T;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetchWithTimeout(url);
  return response.text();
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  content: string;
  pubDate: string;
  guid: string;
  categories: string[];
}> {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  return blocks.map((block) => {
    const categories = [...block.matchAll(/<category>([\s\S]*?)<\/category>/gi)].map((match) =>
      decodeXmlEntities(stripCdata(match[1] ?? '')).trim(),
    );

    return {
      title: decodeXmlEntities(extractXmlField(block, 'title')),
      link: decodeXmlEntities(extractXmlField(block, 'link')),
      description: decodeXmlEntities(extractXmlField(block, 'description')),
      content: decodeXmlEntities(extractXmlField(block, 'content:encoded')),
      pubDate: decodeXmlEntities(extractXmlField(block, 'pubDate')),
      guid: decodeXmlEntities(extractXmlField(block, 'guid')),
      categories,
    };
  });
}

function parseSitemapUrls(xml: string): Array<{ loc: string; lastmod: string | null }> {
  const blocks = xml.match(/<url\b[\s\S]*?<\/url>/gi) ?? [];
  return blocks
    .map((block) => ({
      loc: decodeXmlEntities(extractXmlField(block, 'loc')).trim(),
      lastmod: normalizeDate(decodeXmlEntities(extractXmlField(block, 'lastmod'))) ?? null,
    }))
    .filter((entry) => entry.loc.length > 0);
}

function extractXmlField(xmlBlock: string, fieldName: string): string {
  const escapedField = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const direct = new RegExp(`<${escapedField}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${escapedField}>`, 'i');
  const match = xmlBlock.match(direct);
  if (!match) {
    return '';
  }
  return stripCdata(match[1] ?? '').trim();
}

function extractMarkdownLinks(markdown: string): Array<{ text: string; url: string }> {
  const matches = [...markdown.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)];
  return matches.map((match) => ({
    text: cleanText(match[1] ?? ''),
    url: match[2] ?? '',
  }));
}

function extractHtmlLinks(html: string): Array<{ href: string; text: string }> {
  const matches = [
    ...html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi),
  ];
  return matches
    .map((match) => {
      const href = cleanText(match[1] ?? match[2] ?? match[3] ?? '');
      const text = cleanText(stripHtml(match[4] ?? ''));
      return { href, text };
    })
    .filter((link) => link.href.length > 0);
}

function loadFatfFacetedEntries(): FatfFacetedEntry[] {
  if (!fs.existsSync(FATF_FACETED_PATH)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(FATF_FACETED_PATH, 'utf-8')) as FatfFacetedSnapshot;
    const rows = parsed.results ?? [];
    return rows.filter((row) => typeof row.path === 'string' && row.path.length > 0);
  } catch {
    return [];
  }
}

function loadIoscoDumpEntries(): IoscoDumpEntry[] {
  if (!fs.existsSync(IOSCO_V2_DUMP_PATH)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(IOSCO_V2_DUMP_PATH, 'utf-8')) as
      | IoscoDumpSnapshot
      | { results?: IoscoDumpEntry[] }
      | IoscoDumpEntry[];

    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.entries)) {
      return parsed.entries;
    }
    if (Array.isArray(parsed.results)) {
      return parsed.results;
    }
    return [];
  } catch {
    return [];
  }
}

function normalizeDateFromAny(value: string | number | null | undefined): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeDate(new Date(value).toISOString());
  }
  if (typeof value === 'string') {
    return normalizeDate(value);
  }
  return null;
}

function fatfPathToPublicUrl(pathValue: string): string | null {
  const raw = cleanText(pathValue);
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/^https?:\/\/www\.fatf-gafi\.org/i, '');
  const contentPrefix = '/content/fatf-gafi/en/';
  if (normalized.startsWith(contentPrefix)) {
    const suffix = normalized.slice(contentPrefix.length);
    return `https://www.fatf-gafi.org/en/${suffix}`;
  }
  if (normalized.startsWith('/en/')) {
    return `https://www.fatf-gafi.org${normalized}`;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/^http:\/\//i, 'https://');
  }
  return toAbsoluteUrl('https://www.fatf-gafi.org/en/', normalized);
}

function fatfPartFromPath(pathValue: string): string {
  const normalized = cleanText(pathValue).toLowerCase();
  if (normalized.includes('/high-risk-and-other-monitored-jurisdictions/')) {
    return 'High-risk and monitored jurisdictions';
  }
  if (normalized.includes('/mutualevaluations/')) {
    return 'Mutual evaluations';
  }
  if (normalized.includes('/fatfrecommendations/')) {
    return 'FATF recommendations';
  }
  if (normalized.includes('/methodsandtrends/')) {
    return 'Methods and trends';
  }
  return 'Publications';
}

function classifyFatfSource(urlOrPath: string, title: string): SourceId {
  const target = `${urlOrPath} ${title}`.toLowerCase();
  if (
    target.includes('high-risk-and-other-monitored-jurisdictions') ||
    target.includes('call-for-action') ||
    target.includes('increased-monitoring') ||
    target.includes('black-and-grey-lists')
  ) {
    return 'FATF_LIST';
  }
  return 'FATF_REC';
}

function normalizeIoscoUrl(urlValue: string): string {
  if (!urlValue) {
    return '';
  }

  const absolute = toAbsoluteUrl('https://www.iosco.org', urlValue);
  try {
    const url = new URL(absolute);
    url.protocol = 'https:';
    url.hostname = url.hostname.toLowerCase() === 'iosco.org' ? 'www.iosco.org' : url.hostname.toLowerCase();
    url.hash = '';
    if (!/\/v2\/(publications|media_room)\//.test(url.pathname)) {
      url.search = '';
    }
    return url.toString();
  } catch {
    return absolute;
  }
}

function normalizeIoscoSection(section: string | null | undefined): string | null {
  if (!section) {
    return null;
  }
  const cleaned = cleanText(section);
  if (!cleaned) {
    return null;
  }
  return cleaned.replace(/[_-]+/g, ' ');
}

function inferIoscoSectionFromUrl(urlValue: string): string | null {
  try {
    const url = new URL(urlValue);
    const subsection = url.searchParams.get('subsection');
    if (subsection) {
      return normalizeIoscoSection(subsection);
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const v2Index = segments.findIndex((segment) => segment === 'v2');
    if (v2Index >= 0 && segments.length > v2Index + 1) {
      return normalizeIoscoSection(segments[v2Index + 1]);
    }
    return normalizeIoscoSection(segments[0] ?? null);
  } catch {
    return null;
  }
}

function isLikelyIoscoCorpusUrl(urlValue: string): boolean {
  if (!urlValue) {
    return false;
  }

  try {
    const url = new URL(urlValue);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== 'www.iosco.org' && hostname !== 'iosco.org') {
      return false;
    }

    const pathname = url.pathname.toLowerCase().replace(/\/+$/, '');
    if (pathname.endsWith('.pdf') || pathname.includes('/pdf/')) {
      return true;
    }
    if (pathname.startsWith('/library/pubdocs') && pathname !== '/library/pubdocs') {
      return true;
    }
    if (pathname.startsWith('/news') && pathname !== '/news') {
      return true;
    }
    if (pathname.startsWith('/v2/publications') && pathname !== '/v2/publications') {
      return true;
    }
    if (pathname.startsWith('/v2/media_room') && pathname !== '/v2/media_room') {
      return true;
    }
    if (pathname.startsWith('/v2/news') && pathname !== '/v2/news') {
      return true;
    }
    if (pathname.startsWith('/v2/library/pubdocs') && pathname !== '/v2/library/pubdocs') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function crawlIoscoSection(
  sectionUrl: string,
): Promise<Array<{ url: string; title: string | null; section: string | null; publicationDate: string | null; sourcePage: string; description: string | null }>> {
  const byUrl = new Map<
    string,
    { url: string; title: string | null; section: string | null; publicationDate: string | null; sourcePage: string; description: string | null }
  >();
  const visitedSignatures = new Set<string>();
  const baseUrl = new URL(normalizeIoscoUrl(sectionUrl));
  const baseSection = normalizeIoscoSection(baseUrl.searchParams.get('subsection') ?? inferIoscoSectionFromUrl(baseUrl.toString()));
  let emptyPageStreak = 0;

  for (let page = 1; page <= 30; page += 1) {
    const pageUrl = new URL(baseUrl.toString());
    if (page > 1) {
      pageUrl.searchParams.set('page', String(page));
    } else {
      pageUrl.searchParams.delete('page');
    }

    const html = await fetchText(pageUrl.toString());
    const signature = shortHash(html);
    if (visitedSignatures.has(signature)) {
      break;
    }
    visitedSignatures.add(signature);

    const links = extractHtmlLinks(html);
    let newRows = 0;

    for (const link of links) {
      const normalizedUrl = normalizeIoscoUrl(link.href);
      if (!isLikelyIoscoCorpusUrl(normalizedUrl)) {
        continue;
      }
      const publicationDate = inferDateFromText(link.text);
      const current = byUrl.get(normalizedUrl);

      if (!current) {
        byUrl.set(normalizedUrl, {
          url: normalizedUrl,
          title: link.text || null,
          section: baseSection,
          publicationDate,
          sourcePage: pageUrl.toString(),
          description: null,
        });
        newRows += 1;
        continue;
      }

      byUrl.set(normalizedUrl, {
        url: normalizedUrl,
        title: choosePreferred(current.title, link.text || null),
        section: choosePreferred(current.section, baseSection),
        publicationDate: maxDate([current.publicationDate, publicationDate]),
        sourcePage: choosePreferred(current.sourcePage, pageUrl.toString()) ?? pageUrl.toString(),
        description: current.description,
      });
    }

    if (newRows === 0) {
      emptyPageStreak += 1;
    } else {
      emptyPageStreak = 0;
    }
    if (emptyPageStreak >= 2) {
      break;
    }
  }

  return [...byUrl.values()];
}

function inferDateFromText(value: string): string | null {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return null;
  }
  const direct = cleaned.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (direct) {
    return normalizeDate(direct[1]);
  }
  const longDate = cleaned.match(/\b(\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/);
  if (longDate) {
    return normalizeDate(longDate[1]);
  }
  return null;
}

function chooseLonger(left: string | null, right: string | null): string | null {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return right.length > left.length ? right : left;
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(value: string): string {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function compactText(value: string): string {
  return cleanText(value).slice(0, 2000);
}

function cleanText(value: string): string {
  return decodeXmlEntities(value).replace(/\s+/g, ' ').trim();
}

function slugForId(value: string): string {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 80) : 'UNKNOWN';
}

function slugForTag(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 50) : 'tag';
}

function dedupeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))];
}

function lastPathSegment(pathValue: string): string {
  const trimmed = pathValue.replace(/\/+$/, '');
  const parts = trimmed.split('/').filter((part) => part.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : trimmed;
}

function absoluteBisUrl(pathValue: string): string {
  const normalized = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
  return `https://www.bis.org${normalized}`;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) {
    return directMatch[1];
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function maxDate(dates: Array<string | null>): string | null {
  const validDates = dates.filter((date): date is string => Boolean(date));
  if (validDates.length === 0) {
    return null;
  }

  return validDates.sort().at(-1) ?? null;
}

function itemIdFromUrl(urlValue: string, prefix: string): string {
  const urlHash = shortHash(urlValue);
  const segment = titleFromUrl(urlValue, prefix);
  const segmentSlug = slugForId(segment).slice(0, 32);
  return `${prefix}-${segmentSlug}-${urlHash}`;
}

function titleFromUrl(urlValue: string, fallback: string): string {
  try {
    const url = new URL(urlValue);
    const pathname = url.pathname.replace(/\/+$/, '');
    const lastSegment = pathname.split('/').filter(Boolean).pop();
    if (!lastSegment) {
      return fallback;
    }

    const decoded = decodeURIComponent(lastSegment)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_]+/g, ' ');
    return cleanText(decoded);
  } catch {
    return fallback;
  }
}

function urlFirstPathSegment(urlValue: string): string | null {
  try {
    const url = new URL(urlValue);
    const segment = url.pathname.split('/').filter(Boolean)[0];
    return segment ? cleanText(segment) : null;
  } catch {
    return null;
  }
}

function safeUrlPath(urlValue: string): string | null {
  try {
    return new URL(urlValue).pathname;
  } catch {
    return null;
  }
}

function urlPathTags(urlValue: string): string[] {
  try {
    const segments = new URL(urlValue).pathname.split('/').filter(Boolean);
    return segments.slice(0, 5).map((segment) => slugForTag(segment));
  } catch {
    return [];
  }
}

function toAbsoluteUrl(base: string, value: string): string {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function deriveBaselStandardId(pathValue: string): string {
  if (/bcbs/i.test(pathValue)) {
    const match = pathValue.match(/bcbs\d+[a-z]?/i);
    if (match) {
      return match[0].toUpperCase();
    }
  }

  if (/basel/i.test(pathValue)) {
    return 'BASEL';
  }

  return 'BCBS';
}

function inferCpmiStandardId(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes('principles for financial market infrastructures')) {
    return 'PFMI';
  }
  if (normalized.includes('counterparty') || normalized.includes('ccp')) {
    return 'CPMI-CCP';
  }
  return 'CPMI';
}

function inferIoscoStandardId(title: string, description: string): string {
  const joined = `${title} ${description}`.toLowerCase();
  if (joined.includes('principles')) {
    return 'IOSCO-PRINCIPLES';
  }
  if (joined.includes('methodology')) {
    return 'IOSCO-METHODOLOGY';
  }
  return 'IOSCO-PUBLICATION';
}

function dedupeProvisions(rows: ProvisionRow[]): ProvisionRow[] {
  const byKey = new Map<string, ProvisionRow>();

  for (const row of rows) {
    const key = `${row.source_id}::${row.item_id}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }

    const merged: ProvisionRow = {
      ...existing,
      title: choosePreferred(existing.title, row.title),
      text: row.text.length > existing.text.length ? row.text : existing.text,
      topic_tags: dedupeTags([...existing.topic_tags, ...row.topic_tags]),
      requirement_level: strongerRequirement(existing.requirement_level, row.requirement_level),
      url: choosePreferred(existing.url, row.url),
      metadata: {
        ...(existing.metadata ?? {}),
        ...(row.metadata ?? {}),
      },
    };

    byKey.set(key, merged);
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.source_id !== b.source_id) {
      return a.source_id.localeCompare(b.source_id);
    }
    return a.item_id.localeCompare(b.item_id);
  });
}

function strongerRequirement(
  left: ProvisionRow['requirement_level'],
  right: ProvisionRow['requirement_level'],
): ProvisionRow['requirement_level'] {
  const rank: Record<ProvisionRow['requirement_level'], number> = {
    guidance: 1,
    should: 2,
    must: 3,
  };
  return rank[left] >= rank[right] ? left : right;
}

function choosePreferred<T>(left: T | null, right: T | null): T | null {
  if (left && String(left).length > 0) {
    return left;
  }
  return right;
}

function buildSourceStats(
  provisions: ProvisionRow[],
  explicitStats: SourceIngestionStats[],
): SourceIngestionStats[] {
  const statsMap = new Map<SourceId, SourceIngestionStats>();

  for (const sourceId of Object.keys(SOURCE_BASE) as SourceId[]) {
    statsMap.set(sourceId, {
      sourceId,
      count: 0,
      lastUpdated: null,
      coverageNote: `${sourceId} records`,
    });
  }

  for (const row of provisions) {
    const current = statsMap.get(row.source_id)!;
    current.count += 1;
    const publicationDate = normalizeDate((row.metadata?.publication_start_date as string | undefined) ?? null);
    current.lastUpdated = maxDate([current.lastUpdated, publicationDate]);
  }

  for (const stat of explicitStats) {
    const current = statsMap.get(stat.sourceId);
    if (!current) {
      continue;
    }
    if (stat.lastUpdated) {
      current.lastUpdated = maxDate([current.lastUpdated, stat.lastUpdated]);
    }
    if (stat.coverageNote) {
      current.coverageNote = stat.coverageNote;
    }
  }

  return [...statsMap.values()];
}

function buildSourceRows(stats: SourceIngestionStats[]): SourceRow[] {
  const bySourceId = new Map(stats.map((stat) => [stat.sourceId, stat]));

  return (Object.keys(SOURCE_BASE) as SourceId[]).map((sourceId) => {
    const base = SOURCE_BASE[sourceId];
    const stat = bySourceId.get(sourceId);
    const count = stat?.count ?? 0;

    return {
      ...base,
      last_updated: stat?.lastUpdated ?? null,
      coverage_note: compactText(
        `${count} records. ${stat?.coverageNote ?? 'Ingested from configured source endpoints.'}`,
      ),
    };
  });
}

function dedupeDefinitions(definitions: DefinitionRow[]): DefinitionRow[] {
  const map = new Map<string, DefinitionRow>();
  for (const definition of definitions) {
    const key = `${definition.source}::${definition.term.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, definition);
    }
  }
  return [...map.values()].sort((a, b) => a.source.localeCompare(b.source) || a.term.localeCompare(b.term));
}

function dedupeFatfStatus(rows: FatfCountryStatusRow[]): FatfCountryStatusRow[] {
  const map = new Map<string, FatfCountryStatusRow>();
  for (const row of rows) {
    map.set(row.country_code.toUpperCase(), row);
  }
  return [...map.values()].sort((a, b) => a.country_code.localeCompare(b.country_code));
}

function dedupeMutualEvaluations(rows: MutualEvaluationRow[]): MutualEvaluationRow[] {
  const map = new Map<string, MutualEvaluationRow>();
  for (const row of rows) {
    map.set(row.jurisdiction_code.toUpperCase(), row);
  }
  return [...map.values()].sort((a, b) => a.jurisdiction_code.localeCompare(b.jurisdiction_code));
}

function dedupeMappings(rows: NationalMappingRow[]): NationalMappingRow[] {
  const map = new Map<string, NationalMappingRow>();
  for (const row of rows) {
    const key = [
      row.country_code.toUpperCase(),
      row.international_source_id,
      row.international_item_id,
      row.national_framework,
      row.national_reference,
    ].join('::');
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => {
    if (a.country_code !== b.country_code) {
      return a.country_code.localeCompare(b.country_code);
    }
    if (a.international_source_id !== b.international_source_id) {
      return a.international_source_id.localeCompare(b.international_source_id);
    }
    return a.international_item_id.localeCompare(b.international_item_id);
  });
}

function loadBaselineCore(): SeedSnapshot {
  if (!fs.existsSync(CORE_SEED_PATH)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(CORE_SEED_PATH, 'utf-8')) as SeedSnapshot;
  } catch {
    return {};
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function validateExistingSeeds(): void {
  if (!fs.existsSync(SEED_DIR)) {
    console.log(`Seed directory does not exist yet: ${SEED_DIR}`);
    return;
  }

  const seedFiles = fs
    .readdirSync(SEED_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();

  if (seedFiles.length === 0) {
    console.log(`No JSON seed files found in ${SEED_DIR}`);
    return;
  }

  let sourceCount = 0;
  let provisionCount = 0;

  for (const seedFile of seedFiles) {
    const fullPath = path.join(SEED_DIR, seedFile);
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as SeedSnapshot;

    sourceCount += parsed.sources?.length ?? 0;
    provisionCount += parsed.provisions?.length ?? 0;
  }

  console.log(`Validated ${seedFiles.length} seed file(s).`);
  console.log(`Total source records: ${sourceCount}`);
  console.log(`Total provision records: ${provisionCount}`);
}

main().catch((error) => {
  console.error(`Ingestion failed: ${toErrorMessage(error)}`);
  process.exitCode = 1;
});
