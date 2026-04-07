#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import { openDatabase } from './db.js';
import { buildCitation } from './utils/citation.js';
import {
  aboutServer,
  checkDataFreshness,
  checkFatfStatus,
  compareRequirements,
  getBaselStandard,
  getFatfRecommendation,
  getMutualEvaluationSummary,
  getProvision,
  listFinancialSources,
  mapToNationalRequirements,
  searchFinancialRegulation,
} from './tools/international-financial-regulation.js';

const TOOLS = [
  {
    name: 'search_financial_regulation',
    description: 'Search Basel, FATF, IOSCO, IAIS, FSB, and CPMI-IOSCO provisions using full-text search.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (FTS syntax supported).' },
        sources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional source IDs to filter (for example: ["BASEL", "FATF_REC"]).',
        },
        topics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional topic tags filter (for example: ["aml", "capital"]).',
        },
        include_guidance: {
          type: 'boolean',
          description: 'When false, exclude guidance-level items.',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default 10, max 50).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description: 'Retrieve a single provision by source and item ID, with optional national mapping links.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source_id: { type: 'string', description: 'Source identifier (for example: BASEL, FATF_REC).' },
        item_id: { type: 'string', description: 'Provision identifier in that source (for example: R10).' },
        include_national_mappings: {
          type: 'boolean',
          description: 'When true, include national mappings for the provision.',
        },
        country_code: {
          type: 'string',
          description: 'Optional country filter (ISO alpha-3) when include_national_mappings is true.',
        },
      },
      required: ['source_id', 'item_id'],
    },
  },
  {
    name: 'get_basel_standard',
    description: 'List Basel standards or retrieve Basel provisions by standard ID and optional search query.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        standard_id: {
          type: 'string',
          description: 'Basel standard ID or specific Basel provision item ID.',
        },
        query: {
          type: 'string',
          description: 'Optional full-text filter scoped to Basel provisions.',
        },
        limit: { type: 'number', description: 'Maximum results (default 10, max 50).' },
      },
      required: [],
    },
  },
  {
    name: 'get_fatf_recommendation',
    description: 'Retrieve a FATF recommendation by code (e.g. R10) or number (e.g. 10).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        recommendation: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
          description: 'Recommendation code or number.',
        },
      },
      required: ['recommendation'],
    },
  },
  {
    name: 'check_fatf_status',
    description: 'Check FATF high-risk/increased monitoring list status for a country.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country_code: { type: 'string', description: 'ISO alpha-3 country code.' },
        country_name: { type: 'string', description: 'Country name fallback lookup.' },
      },
      required: [],
    },
  },
  {
    name: 'get_mutual_evaluation_summary',
    description: 'Get mutual evaluation summaries by jurisdiction or list recent evaluations.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        jurisdiction_code: { type: 'string', description: 'ISO alpha-3 jurisdiction code.' },
        jurisdiction_name: { type: 'string', description: 'Jurisdiction name.' },
        limit: { type: 'number', description: 'Maximum evaluations to return (default 10, max 50).' },
      },
      required: [],
    },
  },
  {
    name: 'map_to_national_requirements',
    description: 'Map international provisions to country-level legal or supervisory references.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country_code: { type: 'string', description: 'ISO alpha-3 country code.' },
        international_source_id: { type: 'string', description: 'Optional source filter.' },
        international_item_id: { type: 'string', description: 'Optional provision filter.' },
        status: {
          type: 'string',
          enum: ['implemented', 'partial', 'gap'],
          description: 'Optional implementation status filter.',
        },
        limit: { type: 'number', description: 'Maximum mappings (default 10, max 50).' },
      },
      required: ['country_code'],
    },
  },
  {
    name: 'compare_requirements',
    description: 'Compare requirements on a topic across multiple international regulatory sources.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        topic: { type: 'string', description: 'Topic to compare (for example: governance, aml, capital).' },
        sources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional source IDs to include in comparison.',
        },
        limit_per_source: { type: 'number', description: 'Max items per source (default 3, max 10).' },
        include_guidance: {
          type: 'boolean',
          description: 'When false, exclude guidance-level items.',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'list_sources',
    description: 'List all sources with coverage/freshness metadata, or list items for one source.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source_id: { type: 'string', description: 'Optional source identifier for a detailed view.' },
        include_items: {
          type: 'boolean',
          description: 'When source_id is provided, include item listing (default true).',
        },
        limit: {
          type: 'number',
          description: 'Maximum items when listing one source (default 10, max 50).',
        },
      },
      required: [],
    },
  },
  {
    name: 'about',
    description: 'Return server identity, scope, and implemented capability summary.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'check_data_freshness',
    description: 'Evaluate local source freshness based on last-updated timestamps and freshness windows.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        as_of_date: {
          type: 'string',
          description: 'Override comparison date (YYYY-MM-DD). Defaults to current date.',
        },
        threshold_days: {
          type: 'number',
          description: 'Override source-specific freshness window for all sources.',
        },
      },
      required: [],
    },
  },
];

const META_DISCLAIMER =
  'This data is for informational purposes only and does not constitute legal or financial advice. Verify all information against official sources before making compliance decisions.';

const db = openDatabase();

function getDataAge(): string {
  try {
    const row = db.prepare('SELECT MAX(last_updated) as latest FROM sources').get() as { latest: string | null } | undefined;
    return row?.latest ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function buildGetCitation(name: string, args: Record<string, unknown>, result: unknown): Record<string, string> | undefined {
  const r = result as Record<string, unknown> | null;
  if (!r) return undefined;
  switch (name) {
    case 'get_provision': {
      const sourceId = String(args.source_id ?? '');
      const itemId = String(args.item_id ?? '');
      return buildCitation(
        `${sourceId} ${itemId}`,
        String(r.title ?? `${sourceId} ${itemId}`),
        'get_provision',
        { source_id: sourceId, item_id: itemId },
        r.url as string | undefined,
      ) as any;
    }
    case 'get_basel_standard': {
      const stdId = String(args.standard_id ?? 'Basel');
      return buildCitation(
        stdId,
        String(r.title ?? stdId),
        'get_basel_standard',
        { standard_id: stdId },
        r.url as string | undefined,
      ) as any;
    }
    case 'get_fatf_recommendation': {
      const rec = String(args.recommendation ?? '');
      const code = rec.startsWith('R') ? rec : `R${rec}`;
      return buildCitation(
        `FATF ${code}`,
        String(r.title ?? `FATF Recommendation ${rec}`),
        'get_fatf_recommendation',
        { recommendation: rec },
        r.url as string | undefined,
      ) as any;
    }
    case 'get_mutual_evaluation_summary': {
      const jCode = String(args.jurisdiction_code ?? args.jurisdiction_name ?? '');
      return buildCitation(
        `FATF MER ${jCode}`,
        String(r.title ?? `Mutual Evaluation — ${jCode}`),
        'get_mutual_evaluation_summary',
        { jurisdiction_code: jCode },
        r.url as string | undefined,
      ) as any;
    }
    default:
      return undefined;
  }
}

async function handleToolCall(name: string, args: Record<string, unknown>) {
  let result: unknown;
  switch (name) {
    case 'search_financial_regulation': result = await searchFinancialRegulation(db, args as any); break;
    case 'get_provision': result = await getProvision(db, args as any); break;
    case 'get_basel_standard': result = await getBaselStandard(db, args as any); break;
    case 'get_fatf_recommendation': result = await getFatfRecommendation(db, args as any); break;
    case 'check_fatf_status': result = await checkFatfStatus(db, args as any); break;
    case 'get_mutual_evaluation_summary': result = await getMutualEvaluationSummary(db, args as any); break;
    case 'map_to_national_requirements': result = await mapToNationalRequirements(db, args as any); break;
    case 'compare_requirements': result = await compareRequirements(db, args as any); break;
    case 'list_sources': result = await listFinancialSources(db, args as any); break;
    case 'about': result = aboutServer(); break;
    case 'check_data_freshness': result = await checkDataFreshness(db, args as any); break;
    default: throw new Error(`Unknown tool: ${name}`);
  }
  const citation = buildGetCitation(name, args, result);
  return {
    result,
    _meta: {
      disclaimer: META_DISCLAIMER,
      data_source: 'Ansvar MCP Network (ansvar.ai/mcp)',
      data_age: getDataAge(),
    },
    ...(citation && { _citation: citation }),
  };
}

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, (args ?? {}) as Record<string, unknown>);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
