# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-22

### Added

- 11 tools: search, get_provision, get_basel_standard, get_fatf_recommendation, check_fatf_status, get_mutual_evaluation_summary, map_to_national_requirements, compare_requirements, list_sources, about, check_data_freshness
- 10,508 provisions from 7 authoritative sources (Basel/BIS, FATF, IOSCO, IAIS, FSB, CPMI-IOSCO)
- FTS5 full-text search with topic filtering and source scoping
- FATF jurisdiction status lookups (grey/black list)
- Mutual evaluation summaries
- International-to-national requirement mappings
- Cross-source requirement comparison
- Data freshness monitoring with per-source windows
- Dual transport: stdio (npm) + Streamable HTTP (Vercel)
