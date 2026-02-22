# CLAUDE.md — International Financial Regulation MCP

> Instructions for Claude Code when working on this MCP server

## Project Overview

MCP server providing structured access to international financial regulatory standards: Basel Committee (BIS), FATF, IOSCO, IAIS, FSB, and CPMI-IOSCO. Built with TypeScript and SQLite FTS5. Part of the Ansvar MCP Network.

## Architecture

```
src/
├── index.ts                                    # MCP server entry (stdio transport)
└── tools/
    └── international-financial-regulation.ts    # All 11 tool implementations

api/
├── mcp.ts      # Streamable HTTP endpoint (Vercel)
└── health.ts   # Health check endpoint

scripts/
├── build-db.ts         # Build SQLite DB from seed files
├── ingest.ts           # Live ingestion from upstream sources
├── check-updates.ts    # Check source freshness
├── ingest-fetch.ts     # Fetch latest upstream data
├── ingest-diff.ts      # Diff fetched data against current DB
├── update-coverage.ts  # Regenerate coverage manifests
├── check-freshness.ts  # Freshness check for CI
└── verify-coverage.ts  # Gate 6: coverage consistency

tests/
├── fixtures/
│   ├── test-db.ts      # Generic in-memory test DB
│   └── domain-db.ts    # Domain-specific test DB with sample data
├── tools/              # Unit tests
└── contract/
    └── golden.test.ts  # Contract tests against production DB

data/
├── seed/               # JSON seed files for each source
├── database.db         # SQLite database (built from seed)
├── coverage.json       # Machine-readable coverage manifest
└── .source-hashes.json # Diff detection hashes
```

## Key Patterns

### Database

- Always use parameterized queries: `db.prepare('SELECT * FROM provisions WHERE source_id = ?').get(id)`
- FTS5 queries must escape user input via `escapeFtsQuery()` (escapes `()^*:`)
- Database opened readonly — write operations only in build-db.ts and ingestion scripts

### Tool Functions

All tools are in `src/tools/international-financial-regulation.ts`:
- Each function takes `(db: Database, input: TypedInput)` and returns a typed result
- Exported types for all inputs and results
- Limit clamping via `clampLimit()` — all limits default 10, max 50
- JSON arrays in DB stored as strings, parsed via `parseJsonArray()`

### Error Handling

```typescript
// Return MCP error format
return { content: [{ type: 'text', text: 'Error message' }], isError: true };
```

### Transport

- **stdio**: `src/index.ts` — uses `StdioServerTransport`
- **HTTP**: `api/mcp.ts` — uses `StreamableHTTPServerTransport`, fresh Server per request

## Common Commands

```bash
npm run dev              # Run with tsx (hot reload)
npm run build            # Compile TypeScript
npm test                 # Unit tests (vitest)
npm run test:contract    # Contract tests against production DB
npm run build:db         # Rebuild DB from seed files
npm run ingest           # Live ingestion from upstream
npm run freshness:check  # Check source freshness
npm run coverage:verify  # Gate 6 coverage check
npm run lint             # TypeScript type check
```

## Database Schema

```sql
-- 7 regulatory sources
CREATE TABLE sources (id TEXT PRIMARY KEY, full_name, authority, ...);

-- 10,508 provisions with FTS5 index
CREATE TABLE provisions (provision_uid TEXT UNIQUE, source_id, item_id, title, text, topic_tags, requirement_level, ...);
CREATE VIRTUAL TABLE provisions_fts USING fts5(source_id, item_id, title, text, part, topic_tags);

-- Supporting tables
CREATE TABLE definitions (source, term, definition);
CREATE TABLE fatf_country_status (country_code PRIMARY KEY, list_type, status, as_of_date);
CREATE TABLE mutual_evaluations (jurisdiction_code PRIMARY KEY, assessment_body, overall_rating, ...);
CREATE TABLE national_mappings (country_code, international_source_id, international_item_id, national_framework, status);
```

## Sources

| Source ID | Authority | Items |
|-----------|-----------|------:|
| BASEL | Bank for International Settlements | 1,116 |
| FATF_REC | Financial Action Task Force | 1,336 |
| FATF_LIST | Financial Action Task Force | 125 |
| IOSCO | Int'l Organization of Securities Commissions | 1,029 |
| IAIS | Int'l Association of Insurance Supervisors | 1,077 |
| FSB | Financial Stability Board | 1,130 |
| CPMI_IOSCO | BIS and IOSCO | 4,695 |

## Git Workflow

- **Never commit directly to `main`** — always go through `dev` first
- Branch from `dev` for features, PR back to `dev`
- Only merge `dev` → `main` when all 6 pre-deploy gates pass
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
