# Tools — International Financial Regulation MCP

> 11 tools across 4 categories

## Search Tools

### `search_financial_regulation`

Full-text search across all Basel, FATF, IOSCO, IAIS, FSB, and CPMI-IOSCO provisions using SQLite FTS5. Supports source filtering, topic filtering, and guidance exclusion. Results are ranked by BM25 relevance.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Search query — FTS5 syntax supported |
| `sources` | string[] | No | Filter by source IDs (e.g., `["BASEL", "FATF_REC"]`) |
| `topics` | string[] | No | Filter by topic tags (e.g., `["aml", "capital"]`) |
| `include_guidance` | boolean | No | When false, exclude guidance-level items (default: true) |
| `limit` | number | No | Maximum results, 1-50 (default: 10) |

**Returns:** Array of matched provisions with source_id, item_id, title, snippet, relevance score, requirement_level, and topic_tags.

**Example:**
```
"What are the Basel requirements for operational risk?"
-> search_financial_regulation({ query: "operational risk", sources: ["BASEL"] })
```

**Data sources:** BASEL, FATF_REC, FATF_LIST, IOSCO, IAIS, FSB, CPMI_IOSCO

**Limitations:**
- FTS5 returns snippets, not full text — use `get_provision` for complete content
- Topic filtering uses substring matching on tag arrays
- Results capped at 50

---

## Lookup Tools

### `get_provision`

Retrieve a single provision by source and item ID, with optional national mapping links showing how international standards are implemented at country level.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `source_id` | string | Yes | Source identifier (e.g., `BASEL`, `FATF_REC`) |
| `item_id` | string | Yes | Provision identifier within that source (e.g., `R10`, `BCBS239-P1`) |
| `include_national_mappings` | boolean | No | When true, include national implementation mappings |
| `country_code` | string | No | ISO alpha-3 country filter for national mappings |

**Returns:** Full provision record with text, metadata, topic_tags, requirement_level, and optional national_mappings array.

**Example:**
```
"Show me FATF Recommendation 10 and how Sweden implements it"
-> get_provision({ source_id: "FATF_REC", item_id: "R10", include_national_mappings: true, country_code: "SWE" })
```

**Data sources:** All 7 sources + national_mappings table

**Limitations:**
- National mappings are seed data only (5 records) — not comprehensive
- Returns null if provision not found (not an error)

---

### `get_basel_standard`

List available Basel standards grouped by standard ID, or retrieve provisions for a specific standard. When called without parameters, returns a summary of all Basel standard groupings with item counts.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `standard_id` | string | No | Basel standard ID (e.g., `BCBS239`) or specific item ID |
| `query` | string | No | FTS5 search filter scoped to Basel provisions |
| `limit` | number | No | Maximum results, 1-50 (default: 10) |

**Returns:** Either a list of `{ standard_id, item_count }` summaries, or filtered Basel provisions.

**Example:**
```
"What Basel standards exist for risk data aggregation?"
-> get_basel_standard({ query: "risk data aggregation" })
```

**Data sources:** BASEL

**Limitations:**
- Standard ID grouping relies on metadata.standard_id field — provisions without this field appear under "UNSPECIFIED"

---

### `get_fatf_recommendation`

Retrieve a specific FATF recommendation by its code (e.g., `R10`) or numeric value (e.g., `10`). Accepts both formats and normalizes automatically.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `recommendation` | string \| number | Yes | Recommendation code (`R10`) or number (`10`) |

**Returns:** Object with `recommendation_code`, `recommendation_number`, and the full `provision` record (or null if not found).

**Example:**
```
"What does FATF Recommendation 16 say about wire transfers?"
-> get_fatf_recommendation({ recommendation: 16 })
```

**Data sources:** FATF_REC

**Limitations:**
- Only matches by item_id or metadata.recommendation_number — does not search text content

---

### `check_fatf_status`

Check whether a country appears on the FATF high-risk (black list) or increased monitoring (grey list). Supports lookup by ISO alpha-3 code or country name with fuzzy matching.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `country_code` | string | No | ISO alpha-3 country code (e.g., `IRN`) |
| `country_name` | string | No | Country name (exact or partial match) |

**Returns:** FATF status record with list_type, status, as_of_date, and notes — or null if country not on any list.

**Example:**
```
"Is Iran on the FATF black list?"
-> check_fatf_status({ country_code: "IRN" })
```

**Data sources:** FATF_LIST (fatf_country_status table)

**Limitations:**
- Data is a point-in-time snapshot, not real-time
- Only 5 seed records in current database — not all listed countries included
- At least one of country_code or country_name is required

---

### `get_mutual_evaluation_summary`

Get FATF mutual evaluation summaries for a jurisdiction, including overall rating, key findings, and priority actions. Can list recent evaluations or filter by specific jurisdiction.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `jurisdiction_code` | string | No | ISO alpha-3 jurisdiction code |
| `jurisdiction_name` | string | No | Jurisdiction name |
| `limit` | number | No | Maximum evaluations, 1-50 (default: 10) |

**Returns:** Array of evaluation summaries with assessment_body, publication_date, overall_rating, executive_summary, key_findings, and priority_actions.

**Example:**
```
"What did the FATF mutual evaluation say about Sweden?"
-> get_mutual_evaluation_summary({ jurisdiction_code: "SWE" })
```

**Data sources:** FATF_REC (mutual_evaluations table)

**Limitations:**
- Only 3 seed records in current database — not comprehensive
- Key findings and priority actions are JSON arrays

---

## Analysis Tools

### `map_to_national_requirements`

Map international financial regulation provisions to country-level legal or supervisory references. Shows how international standards are implemented domestically, including implementation status and gap notes.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `country_code` | string | Yes | ISO alpha-3 country code |
| `international_source_id` | string | No | Filter by international source |
| `international_item_id` | string | No | Filter by specific provision |
| `status` | string | No | Filter by status: `implemented`, `partial`, or `gap` |
| `limit` | number | No | Maximum mappings, 1-50 (default: 10) |

**Returns:** Array of mapping records with national_framework, national_reference, requirement_summary, status, and gap_notes.

**Example:**
```
"How has Sweden implemented FATF Recommendation 10?"
-> map_to_national_requirements({ country_code: "SWE", international_source_id: "FATF_REC", international_item_id: "R10" })
```

**Data sources:** national_mappings table

**Limitations:**
- Only 5 seed records — mappings are sample data, not production-grade
- Requires country_code as minimum input

---

### `compare_requirements`

Compare how different international regulatory bodies address the same topic. Searches across all sources for a given topic and groups results by source, showing the top provisions from each.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | Yes | Topic to compare (e.g., `governance`, `aml`, `capital`) |
| `sources` | string[] | No | Limit comparison to specific sources |
| `limit_per_source` | number | No | Max items per source, 1-10 (default: 3) |
| `include_guidance` | boolean | No | When false, exclude guidance-level items (default: true) |

**Returns:** Object with topic, compared_sources list, and comparisons array grouped by source_id.

**Example:**
```
"Compare how Basel, FATF, and FSB address governance requirements"
-> compare_requirements({ topic: "governance", sources: ["BASEL", "FATF_REC", "FSB"] })
```

**Data sources:** All 7 sources (via search)

**Limitations:**
- Quality depends on FTS5 relevance for the topic term
- Limited to text-based matching — no semantic understanding of regulatory equivalence

---

## Meta Tools

### `list_sources`

List all data sources with coverage and freshness metadata, or drill into a specific source to see its provisions. When called without parameters, returns a summary of all 7 sources. When called with source_id, returns source details plus an item listing.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `source_id` | string | No | Source ID for detailed view (e.g., `BASEL`) |
| `include_items` | boolean | No | Include item listing when source_id provided (default: true) |
| `limit` | number | No | Maximum items in listing, 1-50 (default: 10) |

**Returns:** Either array of source summaries (with provision_count, freshness_status), or single source detail with items array.

**Example:**
```
"What data sources does this server have?"
-> list_sources({})
```

**Data sources:** All 7 sources

**Limitations:**
- Item listing is paginated — large sources may need multiple calls with different limits

---

### `about`

Return server identity, version, category, stats, data sources, freshness information, disclaimer, and Ansvar MCP Network membership. No parameters needed.

**Parameters:** None

**Returns:** Server metadata object with name, version, category, description, stats, data_sources, freshness, disclaimer, and network info.

**Example:**
```
"Tell me about this MCP server"
-> about({})
```

**Data sources:** None (static metadata)

**Limitations:**
- Stats are hardcoded at build time — may drift from actual database counts between versions

---

### `check_data_freshness`

Evaluate local source freshness by comparing each source's last-updated timestamp against its expected refresh window. Reports per-source status (fresh/stale/unknown) and provides instructions for triggering a manual refresh.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `as_of_date` | string | No | Override comparison date (YYYY-MM-DD, default: today) |
| `threshold_days` | number | No | Override freshness window for all sources |

**Returns:** Report with checked_at, summary counts, per-source status array, and update_instructions with `gh workflow run` command.

**Example:**
```
"Is the financial regulation data up to date?"
-> check_data_freshness({})
```

**Data sources:** All 7 sources (reads from sources table)

**Limitations:**
- Freshness is based on metadata timestamps, not verified against upstream
- "stale" means past the expected refresh window, not necessarily outdated content

---

## Domain Glossary

| Term | Meaning |
|------|---------|
| **Basel III/IV** | International banking regulation frameworks issued by the Basel Committee (BCBS) |
| **BCBS** | Basel Committee on Banking Supervision — sets global banking standards |
| **FATF** | Financial Action Task Force — sets AML/CFT standards via 40 Recommendations |
| **AML/CFT** | Anti-Money Laundering / Countering the Financing of Terrorism |
| **CDD** | Customer Due Diligence — FATF requirement for knowing your customer |
| **IOSCO** | International Organization of Securities Commissions — securities regulation |
| **IAIS** | International Association of Insurance Supervisors — insurance regulation |
| **ICP** | Insurance Core Principles — IAIS baseline standards for insurance supervision |
| **FSB** | Financial Stability Board — coordinates financial regulation globally |
| **CPMI** | Committee on Payments and Market Infrastructures (BIS) |
| **PFMI** | Principles for Financial Market Infrastructures — CPMI-IOSCO standard |
| **Grey/Black List** | FATF jurisdictions under increased monitoring (grey) or high-risk (black) |
| **Mutual Evaluation** | FATF peer review of a country's AML/CFT framework effectiveness |
