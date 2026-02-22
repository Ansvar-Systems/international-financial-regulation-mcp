# International Financial Regulation MCP

> Structured access to Basel, FATF, IOSCO, IAIS, FSB, and CPMI-IOSCO regulatory standards — 10,508 provisions from 7 authoritative sources.

[![npm](https://img.shields.io/npm/v/@ansvar/international-financial-regulation-mcp)](https://www.npmjs.com/package/@ansvar/international-financial-regulation-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![CI](https://github.com/Ansvar-Systems/international-financial-regulation-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/international-financial-regulation-mcp/actions/workflows/ci.yml)

## Quick Start

### Remote (Vercel)

Use the hosted endpoint — no installation needed:

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "international-financial-regulation": {
      "url": "https://international-financial-regulation-mcp.vercel.app/mcp"
    }
  }
}
```

**Cursor / VS Code** (`.cursor/mcp.json` or `.vscode/mcp.json`):
```json
{
  "servers": {
    "international-financial-regulation": {
      "url": "https://international-financial-regulation-mcp.vercel.app/mcp"
    }
  }
}
```

### Local (npm)

Run entirely on your machine:

```bash
npx @ansvar/international-financial-regulation-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "international-financial-regulation": {
      "command": "npx",
      "args": ["-y", "@ansvar/international-financial-regulation-mcp"]
    }
  }
}
```

## What's Included

| Source | Authority | Items | Completeness |
|--------|-----------|------:|-------------|
| Basel Committee standards | BIS | 1,116 | Partial |
| FATF Recommendations | FATF | 1,336 | Full |
| FATF High-Risk Lists | FATF | 125 | Snapshot |
| IOSCO Principles | IOSCO | 1,029 | Partial |
| IAIS Core Principles | IAIS | 1,077 | Partial |
| FSB Key Attributes | FSB | 1,130 | Partial |
| CPMI-IOSCO PFMI | BIS/IOSCO | 4,695 | Partial |

**Total:** 10,508 provisions, 15 MB database

## What's NOT Included

- IOSCO data is stale (last refresh May 2023)
- National mappings are seed data only (5 sample records)
- Mutual evaluations are seed data only (3 sample records)
- FATF grey/black lists are point-in-time snapshots

See [COVERAGE.md](COVERAGE.md) for full gap analysis and limitations.

## Available Tools

| Tool | Category | Description |
|------|----------|-------------|
| `search_financial_regulation` | Search | FTS5 search across all provisions |
| `get_provision` | Lookup | Retrieve provision by source + item ID |
| `get_basel_standard` | Lookup | List/retrieve Basel standards |
| `get_fatf_recommendation` | Lookup | Get FATF recommendation by code/number |
| `check_fatf_status` | Lookup | Check FATF grey/black list status |
| `get_mutual_evaluation_summary` | Lookup | Get mutual evaluation summaries |
| `map_to_national_requirements` | Analysis | Map international to national requirements |
| `compare_requirements` | Analysis | Compare requirements across sources |
| `list_sources` | Meta | List all sources with metadata |
| `about` | Meta | Server identity and stats |
| `check_data_freshness` | Meta | Per-source freshness report |

See [TOOLS.md](TOOLS.md) for full documentation with parameters, examples, and limitations.

## Data Sources & Freshness

All data is sourced from authoritative international regulatory bodies:

| Source | Refresh Schedule | Last Refresh |
|--------|-----------------|-------------|
| Basel Committee (BIS) | Monthly | 2026-02-20 |
| FATF Recommendations | Monthly | 2026-02-19 |
| FATF Lists | Monthly | 2026-02-19 |
| IOSCO | Monthly | 2023-05-24 |
| IAIS | Monthly | 2026-02-20 |
| FSB | Monthly | 2026-02-21 |
| CPMI-IOSCO | Monthly | 2025-12-18 |

Check freshness programmatically with the `check_data_freshness` tool.

## Security

| Layer | Tool | Trigger |
|-------|------|---------|
| Static Analysis | CodeQL | Weekly + PR |
| Pattern Detection | Semgrep | PR |
| Dependency Scan | Trivy | Weekly |
| Secret Detection | Gitleaks | PR |
| Supply Chain | OSSF Scorecard | Weekly |
| Dependencies | Dependabot | Weekly |

## Disclaimer

**This is NOT professional advice.** This tool provides structured access to international financial regulatory data for informational and research purposes only. Always verify critical data against authoritative sources before relying on it professionally. See [DISCLAIMER.md](DISCLAIMER.md).

## Ansvar MCP Network

This server is part of the **Ansvar MCP Network** — 80+ MCP servers providing structured access to global legislation, compliance frameworks, and cybersecurity standards.

| Category | Servers | Examples |
|----------|---------|---------|
| EU Regulations | 1 | 49 regulations, 2,693 articles |
| US Regulations | 1 | 15 federal + state laws |
| National Law | 69+ | All EU/EEA + 30 global jurisdictions |
| Security Frameworks | 1 | 261 frameworks, 1,451 controls |
| Domain Intelligence | 2+ | Financial regulation, health law |

Explore the full network at [ansvar.ai/mcp](https://ansvar.ai/mcp)

## Development

### Branch Strategy

```
feature-branch → PR to dev → verify on dev → PR to main → deploy
```

Never push directly to `main`. All changes land on `dev` first.

### Setup

```bash
git clone https://github.com/Ansvar-Systems/international-financial-regulation-mcp.git
cd international-financial-regulation-mcp
npm install
npm run build:db
npm run build
npm test
```

### Data Pipeline

```bash
npm run ingest          # Full live ingestion
npm run build:db        # Rebuild database from seed files
npm run freshness:check # Check source freshness
npm run coverage:verify # Verify coverage consistency (Gate 6)
npm run test:contract   # Run golden contract tests
```

## License

[Apache License 2.0](LICENSE) — Code and tooling.

**Data licenses:** All regulatory data is sourced from official publications by international regulatory bodies (BIS, FATF, IOSCO, IAIS, FSB). Verify redistribution terms with each authority before bulk replication. See [sources.yml](sources.yml) for details.
