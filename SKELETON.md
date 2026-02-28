# Ansvar MCP Server Skeleton

> **The definitive template for building MCP servers in the Ansvar ecosystem**

```
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║     ___              _____                 __                 ║
    ║    /   |  ____  ____/ ___/____  ____ _____/ /_____  _____     ║
    ║   / /| | / __ \/ ___\__ \/ __ \/ __ `/ __  / ___/ / / / /     ║
    ║  / ___ |/ / / (__  )__/ / /_/ / /_/ / /_/ (__  ) /_/ / /      ║
    ║ /_/  |_/_/ /_/____/____/\____/\__,_/\__,_/____/\__, /_/       ║
    ║                                               /____/          ║
    ║                                                               ║
    ║            MCP SERVER SKELETON TEMPLATE                       ║
    ║            Version 1.0 | January 2026                         ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
```

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Detailed Setup Guide](#detailed-setup-guide)
5. [File Reference](#file-reference)
6. [Tool Development Guide](#tool-development-guide)
7. [Database Design](#database-design)
8. [Data Ingestion](#data-ingestion)
9. [Testing Strategy](#testing-strategy)
10. [Deployment](#deployment)
11. [Checklist](#checklist)

---

## Overview

### What Is This?

This skeleton provides a **production-ready template** for creating MCP (Model Context Protocol) servers that provide AI assistants with access to structured legal, regulatory, or reference data.

### Designed For

| Server | Package | Status |
|--------|---------|--------|
| 🇪🇺 EU Regulations | `@ansvar/eu-regulations-mcp` | ✅ Live |
| 🇸🇪 Swedish Law | `@ansvar/swedish-law-mcp` | 📋 Planned |
| 🇳🇴🇩🇰🇫🇮 Nordic Law | `@ansvar/nordic-law-mcp` | 📋 Planned |

### Core Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    DESIGN PRINCIPLES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. OFFLINE-FIRST                                               │
│     └─ All data embedded in SQLite, no runtime API calls        │
│                                                                 │
│  2. FULL-TEXT SEARCH                                            │
│     └─ SQLite FTS5 for fast, relevant search                    │
│                                                                 │
│  3. TYPE-SAFE                                                   │
│     └─ TypeScript interfaces for all inputs/outputs             │
│                                                                 │
│  4. WELL-TESTED                                                 │
│     └─ In-memory test database, comprehensive coverage          │
│                                                                 │
│  5. EASY DEPLOYMENT                                             │
│     └─ npm, Docker, or direct invocation                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP SERVER ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐         ┌──────────────────┐
    │                  │  stdio  │                  │
    │   AI Assistant   │◄───────►│   MCP Server     │
    │  (Claude, etc.)  │  JSON   │   (this code)    │
    │                  │         │                  │
    └──────────────────┘         └────────┬─────────┘
                                          │
                                          │ SQL queries
                                          ▼
                                 ┌──────────────────┐
                                 │                  │
                                 │     SQLite DB    │
                                 │  (embedded data) │
                                 │                  │
                                 └──────────────────┘

    ┌─────────────────────────────────────────────────────────────┐
    │ DATA PIPELINE (Build Time)                                  │
    ├─────────────────────────────────────────────────────────────┤
    │                                                             │
    │  Source          Ingest Script       Seed JSON      DB      │
    │  ──────          ─────────────       ─────────      ──      │
    │                                                             │
    │  EUR-Lex    ───► ingest-eurlex.ts ──► gdpr.json            │
    │  lagen.nu   ───► ingest-sfs.ts    ──► brottsbalken.json    │
    │  lovdata.no ───► ingest-norway.ts ──► sikkerhetsloven.json │
    │                                                    │        │
    │                                                    ▼        │
    │                                            ┌───────────┐    │
    │                       build-db.ts ◄─────── │ seed/*.json│   │
    │                            │               └───────────┘    │
    │                            ▼                                │
    │                    ┌──────────────┐                         │
    │                    │ database.db  │                         │
    │                    └──────────────┘                         │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
international-financial-regulation-mcp/
│
├── 📁 src/                          # TypeScript source code
│   ├── 📄 index.ts                  # MCP server entry point
│   └── 📁 tools/                    # Tool implementations
│       ├── 📄 search.ts             # Full-text search tool
│       ├── 📄 get-item.ts           # Get specific item tool
│       ├── 📄 list.ts               # List/browse tool
│       └── 📄 ...                   # Additional tools
│
├── 📁 scripts/                      # Build and data scripts
│   ├── 📄 build-db.ts               # Build SQLite from seed JSON
│   ├── 📄 ingest-source.ts          # Scrape/fetch source data
│   └── 📄 check-updates.ts          # Monitor for source updates
│
├── 📁 tests/                        # Test suite
│   ├── 📁 fixtures/
│   │   └── 📄 test-db.ts            # In-memory test database
│   └── 📁 tools/
│       ├── 📄 search.test.ts        # Tool tests
│       └── 📄 ...
│
├── 📁 data/                         # Data files
│   ├── 📄 database.db               # Pre-built SQLite database
│   └── 📁 seed/                     # Source JSON files
│       ├── 📄 item1.json
│       ├── 📄 item2.json
│       ├── 📁 mappings/             # Cross-reference mappings
│       └── 📁 applicability/        # Applicability rules
│
├── 📁 .github/
│   └── 📁 workflows/
│       └── 📄 publish.yml           # NPM publish workflow
│
├── 📄 package.json                  # Dependencies and scripts
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 vitest.config.ts              # Test configuration
├── 📄 Dockerfile                    # Docker build
├── 📄 smithery.yaml                 # Smithery registry
├── 📄 README.md                     # User documentation
├── 📄 CONTRIBUTING.md               # Contributor guidelines
├── 📄 COVERAGE.md                   # Data coverage tracking
└── 📄 LICENSE                       # Apache 2.0
```

---

## Quick Start

### 1. Copy the Skeleton

```bash
# From the EU_compliance_MCP repository
cp -r skeleton/ ../international-financial-regulation-mcp/
cd ../international-financial-regulation-mcp/

# Or use degit for a clean copy
npx degit ansvar-systems/eu-regulations-mcp/skeleton international-financial-regulation-mcp
```

### 2. Customize package.json

```bash
# Update these fields in package.json:
# - name: "@ansvar/international-financial-regulation-mcp"
# - description: "Your server description"
# - repository: Your GitHub URL
# - keywords: Relevant keywords
```

### 3. Define Your Data Model

Edit `scripts/build-db.ts` to define your schema:

```typescript
// Example for Swedish law:
const SCHEMA = `
  CREATE TABLE statutes (
    id TEXT PRIMARY KEY,
    sfs_number TEXT UNIQUE,      -- e.g., "2018:218"
    short_cite TEXT,             -- e.g., "DSL"
    full_name TEXT,
    effective_date TEXT
  );

  CREATE TABLE sections (
    rowid INTEGER PRIMARY KEY,
    statute TEXT REFERENCES statutes(id),
    chapter TEXT,
    section_number TEXT,
    text TEXT,
    UNIQUE(statute, chapter, section_number)
  );

  -- FTS5 for full-text search
  CREATE VIRTUAL TABLE sections_fts USING fts5(
    statute, chapter, section_number, text,
    content='sections',
    content_rowid='rowid'
  );
`;
```

### 4. Implement Your Tools

Create tools in `src/tools/`:

```typescript
// src/tools/search.ts
export interface SearchInput {
  query: string;
  statutes?: string[];
  limit?: number;
}

export async function searchStatutes(
  db: Database,
  input: SearchInput
): Promise<SearchResult[]> {
  // Implementation
}
```

### 5. Wire Up the Server

Register tools in `src/index.ts`:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_statutes',
      description: 'Search Swedish statutes by keyword',
      inputSchema: { /* ... */ }
    }
  ]
}));
```

### 6. Build and Test

```bash
npm install
npm run build:db    # Build database from seed data
npm run build       # Compile TypeScript
npm test            # Run tests
npm run dev         # Test with MCP inspector
```

---

## Detailed Setup Guide

### Step 1: Initialize the Project

```bash
# Create directory and initialize
mkdir @ansvar/international-financial-regulation-mcp
cd @ansvar/international-financial-regulation-mcp
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk better-sqlite3
npm install -D typescript vitest tsx @types/node @types/better-sqlite3

# Copy skeleton files
cp -r /path/to/skeleton/* .
```

### Step 2: Configure TypeScript

The provided `tsconfig.json` is pre-configured:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Step 3: Design Your Data Model

Ask yourself:

1. **What entities am I storing?**
   - EU Regulations: regulations, articles, definitions
   - Swedish Law: statutes, sections, cases, propositions
   - Nordic Law: countries, statutes, sections

2. **What relationships exist?**
   - One-to-many: statute → sections
   - Many-to-many: controls ↔ articles (via mappings)

3. **What needs full-text search?**
   - Usually: main text content
   - Create FTS5 virtual tables for searchable content

### Step 4: Create Seed Data Format

Define your JSON seed format:

```typescript
// Swedish law example
interface StatuteSeed {
  id: string;           // "DSL"
  sfs_number: string;   // "2018:218"
  short_cite: string;   // "Dataskyddslagen"
  full_name: string;    // "Lag (2018:218) med kompletterande..."
  effective_date: string;

  chapters: Array<{
    number: string;     // "1"
    title: string;      // "Lagens syfte och tillämpningsområde"
    sections: Array<{
      number: string;   // "1"
      text: string;
      effective_from?: string;
    }>;
  }>;

  definitions?: Array<{
    term: string;
    definition: string;
    section: string;    // Reference to defining section
  }>;
}
```

### Step 5: Implement Data Ingestion

Create a script to fetch and parse source data:

```typescript
// scripts/ingest-sfs.ts
import { JSDOM } from 'jsdom';
import fs from 'fs';

async function ingestStatute(sfsNumber: string, outputPath: string) {
  // 1. Fetch HTML from lagen.nu or riksdagen.se
  const url = `https://lagen.nu/${sfsNumber.replace(':', '_')}`;
  const response = await fetch(url);
  const html = await response.text();

  // 2. Parse HTML to DOM
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // 3. Extract structured data
  const statute: StatuteSeed = {
    id: extractShortCite(document),
    sfs_number: sfsNumber,
    // ... extract other fields
  };

  // 4. Write seed JSON
  fs.writeFileSync(outputPath, JSON.stringify(statute, null, 2));
  console.log(`✓ Saved ${outputPath}`);
}
```

### Step 6: Build the Database

The `build-db.ts` script:

1. Creates fresh SQLite database
2. Runs schema creation
3. Loads all seed JSON files
4. Inserts data with proper relationships
5. Creates FTS5 indexes

```bash
npm run build:db
# Output: data/database.db
```

### Step 7: Implement Tools

See [Tool Development Guide](#tool-development-guide) below.

### Step 8: Write Tests

See [Testing Strategy](#testing-strategy) below.

### Step 9: Create Documentation

Required documentation:

- `README.md` - User-facing documentation
- `COVERAGE.md` - What data is included
- `CONTRIBUTING.md` - How to contribute
- `LICENSE` - Apache 2.0

---

## File Reference

### src/index.ts - MCP Server Entry Point

```typescript
/**
 * @fileoverview MCP Server Entry Point
 *
 * This file sets up the Model Context Protocol server and registers
 * all available tools. It handles:
 *
 * 1. Server initialization with stdio transport
 * 2. Database connection (singleton, lazy-loaded)
 * 3. Tool registration (ListTools handler)
 * 4. Tool execution (CallTool handler)
 * 5. Error handling and graceful shutdown
 *
 * @example Running the server
 * ```bash
 * # Direct execution
 * node dist/index.js
 *
 * # Via npm
 * npm start
 *
 * # Development with hot reload
 * npm run dev
 * ```
 */
```

### src/tools/*.ts - Tool Implementations

Each tool file exports:

```typescript
/**
 * @fileoverview [Tool Name] Tool
 *
 * [Description of what this tool does]
 *
 * @example MCP Tool Call
 * ```json
 * {
 *   "name": "tool_name",
 *   "arguments": {
 *     "param1": "value1"
 *   }
 * }
 * ```
 *
 * @example Response
 * ```json
 * {
 *   "field1": "value1"
 * }
 * ```
 */

// Input interface - what the AI provides
export interface ToolInput {
  requiredParam: string;
  optionalParam?: number;
}

// Output interface - what we return
export interface ToolOutput {
  results: ResultItem[];
}

// Main function
export async function toolFunction(
  db: Database,
  input: ToolInput
): Promise<ToolOutput> {
  // Implementation
}
```

### scripts/build-db.ts - Database Builder

```typescript
/**
 * @fileoverview Database Builder Script
 *
 * Builds the SQLite database from seed JSON files. Run this script
 * whenever seed data changes.
 *
 * @example
 * ```bash
 * npm run build:db
 * ```
 *
 * Input:  data/seed/*.json
 * Output: data/database.db
 */
```

### tests/fixtures/test-db.ts - Test Database

```typescript
/**
 * @fileoverview Test Database Fixture
 *
 * Creates an in-memory SQLite database with sample data for testing.
 * This ensures tests are:
 *
 * 1. Fast (in-memory, no disk I/O)
 * 2. Isolated (fresh database per test suite)
 * 3. Reproducible (deterministic sample data)
 *
 * @example Usage in tests
 * ```typescript
 * import { createTestDatabase, closeTestDatabase } from './fixtures/test-db';
 *
 * describe('myTool', () => {
 *   let db: Database;
 *
 *   beforeAll(() => {
 *     db = createTestDatabase();
 *   });
 *
 *   afterAll(() => {
 *     closeTestDatabase(db);
 *   });
 *
 *   it('should work', async () => {
 *     const result = await myTool(db, { ... });
 *     expect(result).toBeDefined();
 *   });
 * });
 * ```
 */
```

---

## Tool Development Guide

### Tool Categories

MCP servers typically need these tool types:

| Category | Purpose | Example |
|----------|---------|---------|
| **Search** | Full-text search across content | `search_regulations` |
| **Get** | Retrieve specific item by ID | `get_article`, `get_statute` |
| **List** | Browse available content | `list_regulations`, `list_chapters` |
| **Compare** | Cross-reference items | `compare_requirements` |
| **Lookup** | Find specific metadata | `get_definition`, `find_case` |
| **Check** | Answer yes/no questions | `check_applicability` |
| **Map** | Cross-framework mappings | `map_to_iso27001` |

### Tool Design Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOOL DESIGN PRINCIPLES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SINGLE RESPONSIBILITY                                       │
│     Each tool does one thing well                               │
│                                                                 │
│  2. CLEAR NAMING                                                │
│     verb_noun format: search_statutes, get_article              │
│                                                                 │
│  3. SENSIBLE DEFAULTS                                           │
│     Works without optional parameters                           │
│                                                                 │
│  4. HELPFUL ERRORS                                              │
│     Return null/empty for not found, throw for invalid input    │
│                                                                 │
│  5. RICH OUTPUT                                                 │
│     Include context: article text + chapter + cross-refs        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Search Tool Pattern

```typescript
/**
 * Full-text search tool using SQLite FTS5
 *
 * Features:
 * - BM25 relevance ranking
 * - Snippet extraction with context
 * - Optional filtering by source
 * - Configurable result limit
 */

export interface SearchInput {
  /** Search query (supports AND, OR, NOT, "phrases") */
  query: string;
  /** Filter to specific sources (optional) */
  sources?: string[];
  /** Maximum results to return (default: 10) */
  limit?: number;
}

export interface SearchResult {
  source: string;
  item_id: string;
  title: string;
  /** Snippet with >>>match<<< markers */
  snippet: string;
  /** BM25 relevance score */
  relevance: number;
}

export async function searchContent(
  db: Database,
  input: SearchInput
): Promise<SearchResult[]> {
  const limit = input.limit ?? 10;

  // Escape FTS5 special characters
  const safeQuery = escapeFTS5Query(input.query);

  // Build query with optional source filter
  let sql = `
    SELECT
      source,
      item_id,
      title,
      snippet(content_fts, 3, '>>>', '<<<', '...', 32) as snippet,
      bm25(content_fts) as relevance
    FROM content_fts
    WHERE content_fts MATCH ?
  `;

  const params: any[] = [safeQuery];

  if (input.sources?.length) {
    sql += ` AND source IN (${input.sources.map(() => '?').join(',')})`;
    params.push(...input.sources);
  }

  sql += ` ORDER BY relevance LIMIT ?`;
  params.push(limit);

  return db.prepare(sql).all(...params) as SearchResult[];
}

/** Escape special FTS5 characters */
function escapeFTS5Query(query: string): string {
  // Escape: " ( ) * : ^
  return query.replace(/[\"()*:^]/g, char => `"${char}"`);
}
```

### Get Item Tool Pattern

```typescript
/**
 * Get a specific item by identifier
 *
 * Returns detailed information including:
 * - Full text content
 * - Metadata (dates, sources)
 * - Related items (cross-references)
 */

export interface GetItemInput {
  /** Source identifier (e.g., "GDPR", "BrB") */
  source: string;
  /** Item identifier (e.g., "25", "4:9c") */
  item_id: string;
  /** Include related items? (default: false) */
  include_related?: boolean;
}

export interface Item {
  source: string;
  item_id: string;
  title: string | null;
  text: string;
  parent?: string;  // e.g., chapter
  metadata?: Record<string, string>;
  related?: RelatedItem[];
}

export async function getItem(
  db: Database,
  input: GetItemInput
): Promise<Item | null> {
  const sql = `
    SELECT
      source,
      item_id,
      title,
      text,
      parent,
      metadata,
      related
    FROM items
    WHERE source = ? AND item_id = ?
  `;

  const row = db.prepare(sql).get(input.source, input.item_id) as any;

  if (!row) return null;

  const item: Item = {
    source: row.source,
    item_id: row.item_id,
    title: row.title,
    text: row.text,
    parent: row.parent,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };

  if (input.include_related && row.related) {
    item.related = JSON.parse(row.related);
  }

  return item;
}
```

### List Tool Pattern

```typescript
/**
 * List available content with optional filtering
 *
 * Supports:
 * - List all sources
 * - List items within a source
 * - Hierarchical browsing (chapters → sections)
 */

export interface ListInput {
  /** Source to list items from (optional - lists all sources if omitted) */
  source?: string;
  /** Parent item to list children of (e.g., chapter) */
  parent?: string;
}

export interface ListResult {
  sources?: SourceSummary[];
  items?: ItemSummary[];
}

export async function listContent(
  db: Database,
  input: ListInput
): Promise<ListResult> {
  // List all sources
  if (!input.source) {
    const sql = `
      SELECT
        id,
        name,
        COUNT(items.id) as item_count
      FROM sources
      LEFT JOIN items ON items.source = sources.id
      GROUP BY sources.id
    `;
    const sources = db.prepare(sql).all() as SourceSummary[];
    return { sources };
  }

  // List items in source
  let sql = `
    SELECT item_id, title, parent
    FROM items
    WHERE source = ?
  `;
  const params: any[] = [input.source];

  if (input.parent) {
    sql += ` AND parent = ?`;
    params.push(input.parent);
  }

  sql += ` ORDER BY item_id`;

  const items = db.prepare(sql).all(...params) as ItemSummary[];
  return { items };
}
```

### Registering Tools

In `src/index.ts`:

```typescript
// Tool definitions with JSON Schema
const TOOLS: Tool[] = [
  {
    name: 'search_content',
    description: 'Full-text search across all content. Supports boolean operators (AND, OR, NOT) and phrase search with quotes.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        sources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter to specific sources (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 10)'
        }
      },
      required: ['query']
    }
  },
  // ... more tools
];

// Register list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

// Register call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case 'search_content':
        result = await searchContent(getDb(), args as SearchInput);
        break;
      case 'get_item':
        result = await getItem(getDb(), args as GetItemInput);
        break;
      case 'list_content':
        result = await listContent(getDb(), args as ListInput);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${(error as Error).message}`
      }],
      isError: true
    };
  }
});
```

---

## Database Design

### Core Tables

Every MCP server needs these fundamental tables:

```sql
-- ═══════════════════════════════════════════════════════════════
-- CORE TABLES
-- ═══════════════════════════════════════════════════════════════

-- Sources (regulations, statutes, standards)
CREATE TABLE sources (
  id TEXT PRIMARY KEY,           -- Short ID: "GDPR", "BrB", "ISO27001"
  full_name TEXT NOT NULL,       -- Full name
  source_type TEXT,              -- "regulation", "statute", "standard"
  jurisdiction TEXT,             -- "EU", "SE", "NO", etc.
  identifier TEXT UNIQUE,        -- Official ID: CELEX, SFS number
  effective_date TEXT,           -- ISO 8601 date
  last_amended TEXT,             -- ISO 8601 date
  source_url TEXT                -- Official URL
);

-- Main content items (articles, sections, clauses)
CREATE TABLE items (
  rowid INTEGER PRIMARY KEY,
  source TEXT NOT NULL REFERENCES sources(id),
  item_id TEXT NOT NULL,         -- "1", "4:9c", "A.5.1"
  item_type TEXT,                -- "article", "section", "clause"
  title TEXT,
  text TEXT NOT NULL,
  parent TEXT,                   -- Chapter, part, etc.
  metadata TEXT,                 -- JSON: {effective_from, amended_by, ...}
  related TEXT,                  -- JSON: [{type, source, item_id}, ...]
  UNIQUE(source, item_id)
);

-- Full-text search index
CREATE VIRTUAL TABLE items_fts USING fts5(
  source,
  item_id,
  title,
  text,
  content='items',
  content_rowid='rowid',
  tokenize='unicode61'
);

-- Auto-sync FTS on changes
CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, source, item_id, title, text)
  VALUES (new.rowid, new.source, new.item_id, new.title, new.text);
END;

CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, source, item_id, title, text)
  VALUES ('delete', old.rowid, old.source, old.item_id, old.title, old.text);
END;

CREATE TRIGGER items_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, source, item_id, title, text)
  VALUES ('delete', old.rowid, old.source, old.item_id, old.title, old.text);
  INSERT INTO items_fts(rowid, source, item_id, title, text)
  VALUES (new.rowid, new.source, new.item_id, new.title, new.text);
END;
```

### Definitions Table

```sql
-- ═══════════════════════════════════════════════════════════════
-- DEFINITIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE definitions (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL REFERENCES sources(id),
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  defining_item TEXT,            -- Item that defines this term
  UNIQUE(source, term)
);

-- Index for partial matching
CREATE INDEX idx_definitions_term ON definitions(term COLLATE NOCASE);
```

### Cross-Reference Mappings

```sql
-- ═══════════════════════════════════════════════════════════════
-- CROSS-REFERENCE MAPPINGS
-- ═══════════════════════════════════════════════════════════════

-- Map between frameworks (e.g., ISO 27001 ↔ GDPR)
CREATE TABLE mappings (
  id INTEGER PRIMARY KEY,
  framework TEXT NOT NULL,       -- "ISO27001", "NIST_CSF"
  control_id TEXT NOT NULL,      -- "A.5.1", "PR.AC-1"
  control_name TEXT,
  target_source TEXT NOT NULL REFERENCES sources(id),
  target_items TEXT NOT NULL,    -- JSON array: ["25", "32"]
  coverage TEXT CHECK(coverage IN ('full', 'partial', 'related')),
  notes TEXT
);

CREATE INDEX idx_mappings_framework ON mappings(framework);
CREATE INDEX idx_mappings_target ON mappings(target_source);
```

### Applicability Rules

```sql
-- ═══════════════════════════════════════════════════════════════
-- APPLICABILITY RULES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE applicability_rules (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL REFERENCES sources(id),
  sector TEXT NOT NULL,          -- "financial", "healthcare", etc.
  subsector TEXT,                -- More specific: "banking", "insurance"
  applies INTEGER NOT NULL,      -- 1 = applies, 0 = does not apply
  confidence TEXT CHECK(confidence IN ('definite', 'likely', 'possible')),
  basis_item TEXT,               -- Item that establishes this rule
  conditions TEXT,               -- JSON: additional conditions
  notes TEXT
);

CREATE INDEX idx_applicability_sector ON applicability_rules(sector);
```

### Source Registry

```sql
-- ═══════════════════════════════════════════════════════════════
-- SOURCE REGISTRY (for update tracking)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE source_registry (
  source TEXT PRIMARY KEY REFERENCES sources(id),
  official_id TEXT,              -- CELEX, SFS number
  official_version TEXT,         -- Version identifier
  last_fetched TEXT,             -- ISO 8601 timestamp
  items_expected INTEGER,
  items_parsed INTEGER,
  quality_status TEXT CHECK(quality_status IN ('complete', 'review', 'incomplete')),
  notes TEXT
);
```

---

## Data Ingestion

### Ingestion Script Template

```typescript
#!/usr/bin/env tsx
/**
 * @fileoverview Data Ingestion Script
 *
 * Fetches data from [SOURCE] and converts to seed JSON format.
 *
 * @example Usage
 * ```bash
 * npm run ingest -- <identifier> <output-path>
 * npm run ingest -- "2018:218" data/seed/dataskyddslagen.json
 * ```
 */

import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/** Base URL for data source */
const SOURCE_BASE_URL = 'https://example.com/law/';

/** Known identifiers and their metadata */
const KNOWN_SOURCES: Record<string, SourceMetadata> = {
  '2018:218': {
    id: 'DSL',
    full_name: 'Dataskyddslagen',
    effective_date: '2018-05-25'
  },
  // Add more...
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SourceMetadata {
  id: string;
  full_name: string;
  effective_date?: string;
}

interface SeedFormat {
  id: string;
  full_name: string;
  identifier: string;
  effective_date?: string;
  source_url: string;
  items: ItemSeed[];
  definitions?: DefinitionSeed[];
}

interface ItemSeed {
  item_id: string;
  title?: string;
  text: string;
  parent?: string;
}

interface DefinitionSeed {
  term: string;
  definition: string;
  defining_item?: string;
}

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════

async function ingest(identifier: string, outputPath: string): Promise<void> {
  console.log(`\n📥 Ingesting: ${identifier}`);

  // 1. Get metadata
  const metadata = KNOWN_SOURCES[identifier];
  if (!metadata) {
    throw new Error(`Unknown identifier: ${identifier}. Add it to KNOWN_SOURCES.`);
  }

  // 2. Fetch HTML
  const url = `${SOURCE_BASE_URL}${encodeURIComponent(identifier)}`;
  console.log(`   Fetching: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // 3. Parse HTML
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // 4. Extract data
  console.log('   Parsing...');
  const items = extractItems(document);
  const definitions = extractDefinitions(document);

  // 5. Build seed object
  const seed: SeedFormat = {
    id: metadata.id,
    full_name: metadata.full_name,
    identifier: identifier,
    effective_date: metadata.effective_date,
    source_url: url,
    items,
    definitions: definitions.length > 0 ? definitions : undefined
  };

  // 6. Write output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(seed, null, 2));

  console.log(`\n✅ Success!`);
  console.log(`   Items: ${items.length}`);
  console.log(`   Definitions: ${definitions.length}`);
  console.log(`   Output: ${outputPath}`);
}

// ═══════════════════════════════════════════════════════════════
// PARSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract items (articles, sections) from document
 *
 * TODO: Customize this for your data source
 */
function extractItems(document: Document): ItemSeed[] {
  const items: ItemSeed[] = [];

  // Example: extract by CSS selector
  const itemElements = document.querySelectorAll('.article, .section');

  for (const el of itemElements) {
    const item_id = el.getAttribute('data-id') || '';
    const title = el.querySelector('.title')?.textContent?.trim() || undefined;
    const text = el.querySelector('.text')?.textContent?.trim() || '';
    const parent = el.getAttribute('data-chapter') || undefined;

    if (item_id && text) {
      items.push({ item_id, title, text, parent });
    }
  }

  return items;
}

/**
 * Extract definitions from document
 *
 * TODO: Customize this for your data source
 */
function extractDefinitions(document: Document): DefinitionSeed[] {
  const definitions: DefinitionSeed[] = [];

  // Example: extract definition list
  const defElements = document.querySelectorAll('dl.definitions dt, dl.definitions dd');

  let currentTerm: string | null = null;

  for (const el of defElements) {
    if (el.tagName === 'DT') {
      currentTerm = el.textContent?.trim() || null;
    } else if (el.tagName === 'DD' && currentTerm) {
      definitions.push({
        term: currentTerm,
        definition: el.textContent?.trim() || ''
      });
      currentTerm = null;
    }
  }

  return definitions;
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: npm run ingest -- <identifier> <output-path>');
  console.error('Example: npm run ingest -- "2018:218" data/seed/dataskyddslagen.json');
  process.exit(1);
}

ingest(args[0], args[1]).catch(error => {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
});
```

### Build Database Script Template

```typescript
#!/usr/bin/env tsx
/**
 * @fileoverview Database Builder
 *
 * Builds SQLite database from seed JSON files.
 *
 * @example
 * ```bash
 * npm run build:db
 * ```
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const SEED_DIR = path.join(__dirname, '../data/seed');
const DB_PATH = path.join(__dirname, '../data/database.db');

// ═══════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════

const SCHEMA = `
-- Sources
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  identifier TEXT UNIQUE,
  effective_date TEXT,
  source_url TEXT
);

-- Items
CREATE TABLE items (
  rowid INTEGER PRIMARY KEY,
  source TEXT NOT NULL REFERENCES sources(id),
  item_id TEXT NOT NULL,
  title TEXT,
  text TEXT NOT NULL,
  parent TEXT,
  metadata TEXT,
  related TEXT,
  UNIQUE(source, item_id)
);

-- FTS5 Index
CREATE VIRTUAL TABLE items_fts USING fts5(
  source, item_id, title, text,
  content='items', content_rowid='rowid',
  tokenize='unicode61'
);

-- FTS Triggers
CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, source, item_id, title, text)
  VALUES (new.rowid, new.source, new.item_id, new.title, new.text);
END;

CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, source, item_id, title, text)
  VALUES ('delete', old.rowid, old.source, old.item_id, old.title, old.text);
END;

-- Definitions
CREATE TABLE definitions (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL REFERENCES sources(id),
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  defining_item TEXT,
  UNIQUE(source, term)
);

-- Source Registry
CREATE TABLE source_registry (
  source TEXT PRIMARY KEY,
  official_id TEXT,
  last_fetched TEXT,
  items_expected INTEGER,
  items_parsed INTEGER,
  quality_status TEXT
);
`;

// ═══════════════════════════════════════════════════════════════
// BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════

function buildDatabase(): void {
  console.log('🏗️  Building database...\n');

  // Delete existing database
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('   Deleted existing database');
  }

  // Create new database
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create schema
  db.exec(SCHEMA);
  console.log('   Created schema');

  // Load seed files
  const seedFiles = fs.readdirSync(SEED_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('.'));

  console.log(`\n📂 Loading ${seedFiles.length} seed files...\n`);

  // Prepare statements
  const insertSource = db.prepare(`
    INSERT INTO sources (id, full_name, identifier, effective_date, source_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO items (source, item_id, title, text, parent, metadata, related)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDefinition = db.prepare(`
    INSERT INTO definitions (source, term, definition, defining_item)
    VALUES (?, ?, ?, ?)
  `);

  const insertRegistry = db.prepare(`
    INSERT INTO source_registry (source, official_id, last_fetched, items_expected, items_parsed, quality_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Process each seed file
  let totalItems = 0;
  let totalDefinitions = 0;

  for (const file of seedFiles) {
    const filePath = path.join(SEED_DIR, file);
    const seed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Insert source
    insertSource.run(
      seed.id,
      seed.full_name,
      seed.identifier,
      seed.effective_date,
      seed.source_url
    );

    // Insert items
    for (const item of seed.items || []) {
      insertItem.run(
        seed.id,
        item.item_id,
        item.title,
        item.text,
        item.parent,
        item.metadata ? JSON.stringify(item.metadata) : null,
        item.related ? JSON.stringify(item.related) : null
      );
      totalItems++;
    }

    // Insert definitions
    for (const def of seed.definitions || []) {
      insertDefinition.run(
        seed.id,
        def.term,
        def.definition,
        def.defining_item
      );
      totalDefinitions++;
    }

    // Insert registry
    insertRegistry.run(
      seed.id,
      seed.identifier,
      new Date().toISOString(),
      seed.items?.length || 0,
      seed.items?.length || 0,
      'complete'
    );

    console.log(`   ✓ ${seed.id}: ${seed.items?.length || 0} items, ${seed.definitions?.length || 0} definitions`);
  }

  db.close();

  console.log(`\n✅ Database built successfully!`);
  console.log(`   Total items: ${totalItems}`);
  console.log(`   Total definitions: ${totalDefinitions}`);
  console.log(`   Output: ${DB_PATH}`);
}

// Run
buildDatabase();
```

---

## Testing Strategy

### Test Database Fixture

```typescript
/**
 * @fileoverview Test Database Fixture
 *
 * Creates an in-memory database with sample data for testing.
 */

import Database from 'better-sqlite3';

// Sample data for tests
const SAMPLE_SOURCES = [
  { id: 'SOURCE1', full_name: 'Test Source 1', identifier: 'TEST-001' },
  { id: 'SOURCE2', full_name: 'Test Source 2', identifier: 'TEST-002' }
];

const SAMPLE_ITEMS = [
  { source: 'SOURCE1', item_id: '1', title: 'First Item', text: 'This is the first test item with searchable content.', parent: 'Chapter I' },
  { source: 'SOURCE1', item_id: '2', title: 'Second Item', text: 'This is the second test item about data protection.', parent: 'Chapter I' },
  { source: 'SOURCE2', item_id: '1', title: 'Another Item', text: 'Different source item about security requirements.', parent: null }
];

const SAMPLE_DEFINITIONS = [
  { source: 'SOURCE1', term: 'test term', definition: 'A term used for testing purposes', defining_item: '1' },
  { source: 'SOURCE2', term: 'security', definition: 'Protection against threats', defining_item: '1' }
];

export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');

  // Create schema (same as production)
  db.exec(`
    CREATE TABLE sources (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      identifier TEXT UNIQUE
    );

    CREATE TABLE items (
      rowid INTEGER PRIMARY KEY,
      source TEXT NOT NULL,
      item_id TEXT NOT NULL,
      title TEXT,
      text TEXT NOT NULL,
      parent TEXT,
      UNIQUE(source, item_id)
    );

    CREATE VIRTUAL TABLE items_fts USING fts5(
      source, item_id, title, text,
      content='items', content_rowid='rowid'
    );

    CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, source, item_id, title, text)
      VALUES (new.rowid, new.source, new.item_id, new.title, new.text);
    END;

    CREATE TABLE definitions (
      id INTEGER PRIMARY KEY,
      source TEXT NOT NULL,
      term TEXT NOT NULL,
      definition TEXT NOT NULL,
      defining_item TEXT
    );
  `);

  // Insert sample data
  const insertSource = db.prepare('INSERT INTO sources VALUES (?, ?, ?)');
  for (const s of SAMPLE_SOURCES) {
    insertSource.run(s.id, s.full_name, s.identifier);
  }

  const insertItem = db.prepare('INSERT INTO items (source, item_id, title, text, parent) VALUES (?, ?, ?, ?, ?)');
  for (const i of SAMPLE_ITEMS) {
    insertItem.run(i.source, i.item_id, i.title, i.text, i.parent);
  }

  const insertDef = db.prepare('INSERT INTO definitions (source, term, definition, defining_item) VALUES (?, ?, ?, ?)');
  for (const d of SAMPLE_DEFINITIONS) {
    insertDef.run(d.source, d.term, d.definition, d.defining_item);
  }

  return db;
}

export function closeTestDatabase(db: Database.Database): void {
  db.close();
}
```

### Test File Template

```typescript
/**
 * @fileoverview Tests for [Tool Name]
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Database } from 'better-sqlite3';
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db';
import { toolFunction, ToolInput } from '../../src/tools/tool-name';

describe('toolFunction', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  // ─────────────────────────────────────────────────────────────
  // Happy Path Tests
  // ─────────────────────────────────────────────────────────────

  it('should return results for valid input', async () => {
    const input: ToolInput = { query: 'test' };
    const result = await toolFunction(db, input);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should filter by source when specified', async () => {
    const input: ToolInput = { query: 'test', sources: ['SOURCE1'] };
    const result = await toolFunction(db, input);

    expect(result.every(r => r.source === 'SOURCE1')).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────

  it('should return empty array for no matches', async () => {
    const input: ToolInput = { query: 'nonexistent' };
    const result = await toolFunction(db, input);

    expect(result).toEqual([]);
  });

  it('should handle special characters in query', async () => {
    const input: ToolInput = { query: 'test (with) "special" chars' };
    const result = await toolFunction(db, input);

    // Should not throw, may return empty
    expect(Array.isArray(result)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────
  // Limit and Pagination
  // ─────────────────────────────────────────────────────────────

  it('should respect limit parameter', async () => {
    const input: ToolInput = { query: 'test', limit: 1 };
    const result = await toolFunction(db, input);

    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('should use default limit when not specified', async () => {
    const input: ToolInput = { query: 'test' };
    const result = await toolFunction(db, input);

    expect(result.length).toBeLessThanOrEqual(10); // Default limit
  });
});
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts']  // Entry point tested via integration
    }
  }
});
```

---

## Deployment

### Package.json Scripts

```json
{
  "name": "@ansvar/international-financial-regulation-mcp",
  "version": "0.1.0",
  "description": "MCP server for [Your Content]",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "international-financial-regulation-mcp": "dist/index.js"
  },
  "files": [
    "dist",
    "data/database.db"
  ],
  "scripts": {
    "build": "tsc",
    "build:db": "tsx scripts/build-db.ts",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "ingest": "tsx scripts/ingest-source.ts",
    "check-updates": "tsx scripts/check-updates.ts",
    "lint": "eslint src tests",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.25.3",
    "better-sqlite3": "^12.6.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.14",
    "@types/node": "^22.15.29",
    "jsdom": "^27.4.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vitest": "^4.0.18"
  },
  "engines": {
    "node": ">=18"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/Ansvar-Systems/international-financial-regulation-mcp"
  },
  "keywords": ["mcp", "compliance", "ansvar"],
  "author": "Ansvar Systems AB",
  "license": "Apache-2.0"
}
```

### Dockerfile

```dockerfile
# ═══════════════════════════════════════════════════════════════
# Multi-stage Dockerfile for MCP Server
# ═══════════════════════════════════════════════════════════════

# Stage 1: Build TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && \
    # Rebuild native modules for Alpine
    npm rebuild better-sqlite3

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy pre-built database
COPY data/database.db ./data/database.db

# Create non-root user
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

# Environment
ENV NODE_ENV=production

# Entry point
CMD ["node", "dist/index.js"]
```

### GitHub Actions Workflow

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # For npm provenance

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci --ignore-scripts

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Publish
        run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Smithery Configuration

```yaml
# smithery.yaml
name: international-financial-regulation-mcp
description: MCP server for [Your Content]
version: "0.1.0"

runtime: node
entrypoint: dist/index.js

transport:
  type: stdio

metadata:
  author: Ansvar Systems AB
  license: Apache-2.0
  homepage: https://github.com/Ansvar-Systems/international-financial-regulation-mcp
  tags:
    - compliance
    - legal
    - ansvar
```

---

## Checklist

### New Server Setup Checklist

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW SERVER CHECKLIST                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INITIALIZATION                                                 │
│  ─────────────                                                  │
│  [ ] Copy skeleton to new directory                             │
│  [ ] Update package.json (name, description, repository)        │
│  [ ] Initialize git repository                                  │
│  [ ] Create GitHub repository                                   │
│                                                                 │
│  DATA MODELING                                                  │
│  ─────────────                                                  │
│  [ ] Define data entities and relationships                     │
│  [ ] Design database schema in build-db.ts                      │
│  [ ] Create seed JSON format specification                      │
│  [ ] Document data sources                                      │
│                                                                 │
│  DATA INGESTION                                                 │
│  ──────────────                                                 │
│  [ ] Implement ingest script for data source                    │
│  [ ] Test ingestion with sample data                            │
│  [ ] Ingest all required data                                   │
│  [ ] Build database and verify                                  │
│                                                                 │
│  TOOL DEVELOPMENT                                               │
│  ────────────────                                               │
│  [ ] Implement search tool                                      │
│  [ ] Implement get-item tool                                    │
│  [ ] Implement list tool                                        │
│  [ ] Implement domain-specific tools                            │
│  [ ] Register all tools in index.ts                             │
│                                                                 │
│  TESTING                                                        │
│  ───────                                                        │
│  [ ] Create test database fixture with sample data              │
│  [ ] Write tests for each tool                                  │
│  [ ] Achieve >80% code coverage                                 │
│  [ ] Test with MCP Inspector                                    │
│                                                                 │
│  DOCUMENTATION                                                  │
│  ─────────────                                                  │
│  [ ] Write README.md with installation instructions             │
│  [ ] Document all tools with examples                           │
│  [ ] Create COVERAGE.md listing included data                   │
│  [ ] Add CONTRIBUTING.md guidelines                             │
│  [ ] Include LICENSE file (Apache 2.0)                          │
│                                                                 │
│  DEPLOYMENT                                                     │
│  ──────────                                                     │
│  [ ] Create Dockerfile                                          │
│  [ ] Create smithery.yaml                                       │
│  [ ] Set up GitHub Actions workflow                             │
│  [ ] Configure npm publishing                                   │
│                                                                 │
│  LAUNCH                                                         │
│  ──────                                                         │
│  [ ] Publish to npm                                             │
│  [ ] Push to Docker Hub                                         │
│  [ ] Submit to Smithery                                         │
│  [ ] Submit to Glama                                            │
│  [ ] Create PR for awesome-mcp-servers                          │
│  [ ] Announce on LinkedIn                                       │
│  [ ] Post on r/mcp                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix: Quick Reference

### Common SQL Patterns

```sql
-- Full-text search with BM25 ranking
SELECT *, bm25(items_fts) as score
FROM items_fts
WHERE items_fts MATCH ?
ORDER BY score
LIMIT ?;

-- Snippet extraction
SELECT snippet(items_fts, 3, '>>>', '<<<', '...', 32) as snippet
FROM items_fts
WHERE items_fts MATCH ?;

-- Get item with parsed JSON
SELECT *, json_extract(metadata, '$.effective_date') as effective
FROM items
WHERE source = ? AND item_id = ?;

-- Count items by source
SELECT source, COUNT(*) as count
FROM items
GROUP BY source;
```

### Common TypeScript Patterns

```typescript
// Null-safe JSON parsing
const metadata = row.metadata
  ? JSON.parse(row.metadata)
  : null;

// Array from optional input
const sources = input.sources ?? [];

// Default limit
const limit = input.limit ?? 10;

// Build dynamic WHERE clause
const conditions: string[] = [];
const params: any[] = [];

if (input.source) {
  conditions.push('source = ?');
  params.push(input.source);
}

const where = conditions.length
  ? `WHERE ${conditions.join(' AND ')}`
  : '';
```

### MCP Tool Schema Reference

```typescript
// String parameter
{
  type: 'string',
  description: 'Description of parameter'
}

// Number parameter
{
  type: 'number',
  description: 'Description'
}

// Boolean parameter
{
  type: 'boolean',
  description: 'Description'
}

// Array of strings
{
  type: 'array',
  items: { type: 'string' },
  description: 'Description'
}

// Enum (limited values)
{
  type: 'string',
  enum: ['option1', 'option2', 'option3'],
  description: 'Description'
}
```

---

<p align="center">
<strong>Ansvar Systems AB</strong><br>
Building the compliance infrastructure for Nordic AI<br>
<a href="https://ansvar.ai">ansvar.ai</a>
</p>
