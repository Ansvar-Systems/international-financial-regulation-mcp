# Coverage — International Financial Regulation MCP

> Last verified: 2026-02-22 | Database version: 0.1.0

## What's Included

| Source | Authority | Items | Last Refresh | Completeness | Refresh |
|--------|-----------|------:|-------------|-------------|---------|
| Basel Committee standards | BIS | 1,116 | 2026-02-20 | Partial | Monthly |
| FATF Recommendations | FATF | 1,336 | 2026-02-19 | Full | Monthly |
| FATF High-Risk Lists | FATF | 125 | 2026-02-19 | Snapshot | Monthly |
| IOSCO Principles | IOSCO | 1,029 | 2023-05-24 | Partial | Monthly |
| IAIS Core Principles | IAIS | 1,077 | 2026-02-20 | Partial | Monthly |
| FSB Key Attributes | FSB | 1,130 | 2026-02-21 | Partial | Monthly |
| CPMI-IOSCO PFMI | BIS/IOSCO | 4,695 | 2025-12-18 | Partial | Monthly |

**Total:** 11 tools, 10,508 provisions, 4 definitions, ~15 MB database

## What's NOT Included

| Gap | Reason | Planned? |
|-----|--------|----------|
| IOSCO data is stale (May 2023) | Website structure changed; crawl dump not refreshed | Yes (v0.2) |
| National mappings are seed data (5 records) | Comprehensive mapping requires manual legal research | Yes (v0.3) |
| Mutual evaluations are seed data (3 records) | Full corpus requires PDF extraction | Yes (v0.3) |
| PFMI jurisdiction assessments | Assessment data in PDFs only | No |
| FATF lists are snapshots, not real-time | No FATF API for live status | No |
| Only 4 term definitions | Definition extraction is partial | Yes (v0.2) |

## Limitations

- Data is a **snapshot** — sources update independently, and there may be a delay between upstream changes and database refresh
- FATF bot protections can block direct API retrieval; ingestion uses pre-saved faceted exports as fallback
- IOSCO publication history is ingested from a 2023 crawl dump — publications after May 2023 are NOT included
- National mappings and mutual evaluations contain sample/seed data only — not comprehensive
- Provision granularity varies: some documents are split to paragraph level, others to section level
- This is a **reference tool, not professional advice** — verify critical data against authoritative sources

## Data Freshness

| Source | Refresh Schedule | Last Refresh | Freshness Window |
|--------|-----------------|-------------|------------------|
| Basel Committee | Monthly | 2026-02-20 | 365 days |
| FATF Recommendations | Monthly | 2026-02-19 | 365 days |
| FATF Lists | Monthly | 2026-02-19 | 45 days |
| IOSCO | Monthly | 2023-05-24 | 365 days |
| IAIS | Monthly | 2026-02-20 | 365 days |
| FSB | Monthly | 2026-02-21 | 365 days |
| CPMI-IOSCO | Monthly | 2025-12-18 | 365 days |

To check freshness programmatically, call the `check_data_freshness` tool.

To trigger a manual refresh:
```
gh workflow run ingest.yml --repo Ansvar-Systems/international-financial-regulation-mcp -f force=true
```
