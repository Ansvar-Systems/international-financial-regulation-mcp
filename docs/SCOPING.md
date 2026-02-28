# International Financial Regulation MCP Scoping

Generated: 2026-02-22

## Scope baseline

- Tier: Tier 1 (revenue-blocking)
- Driver: Nordea bank
- Deployment: Strategy A (Vercel)
- Package: `@ansvar/international-financial-regulation-mcp`
- Repository target: https://github.com/Ansvar-Systems/international-financial-regulation-mcp

## Source inventory

| Source | Authority | Records | Priority |
|---|---|---:|---|
| Basel Committee standards | Bank for International Settlements | ~50 | CRITICAL |
| FATF Recommendations and Methodology | Financial Action Task Force | ~340 | CRITICAL |
| FATF high-risk and monitored jurisdictions | Financial Action Task Force | Current lists | CRITICAL |
| IOSCO principles | International Organization of Securities Commissions | ~38 principles | HIGH |
| IAIS insurance core principles | International Association of Insurance Supervisors | ~26 ICPs | HIGH |
| FSB key attributes and peer reviews | Financial Stability Board | ~30 | HIGH |
| CPMI-IOSCO principles for financial market infrastructures | BIS and IOSCO | ~24 principles | HIGH |

## Tool set

- `search_financial_regulation`
- `get_provision`
- `get_basel_standard`
- `get_fatf_recommendation`
- `check_fatf_status`
- `get_mutual_evaluation_summary`
- `map_to_national_requirements`
- `compare_requirements`
- `list_sources`
- `about`
- `check_data_freshness`

## Notes

- The current baseline implements all Tier 1 tools with an offline seed snapshot and deterministic SQLite build pipeline.
- Use source-specific parsers per upstream format (API, HTML, XML, PDF index parsing where legal).
- Keep all claims evidence-backed and map to official source URLs.
