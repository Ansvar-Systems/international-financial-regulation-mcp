#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import { openDatabase } from './db.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sourcePkgPath = join(__dirname, '..', 'package.json');
const distPkgPath = join(__dirname, '..', '..', 'package.json');
const PKG_PATH = existsSync(sourcePkgPath) ? sourcePkgPath : distPkgPath;
const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8')) as { version: string };

const PORT = Number(process.env.PORT || '3000');

const db = openDatabase();

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
  'International financial regulation data is compiled from public standards bodies. National implementation varies. Not financial, legal, or compliance advice.';

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
  return { result, _meta: { disclaimer: META_DISCLAIMER } };
}

const sessions = new Map<string, StreamableHTTPServerTransport>();

function createMCPServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: pkg.version },
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

  return server;
}

function setCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
}

function handleHealth(_req: IncomingMessage, res: ServerResponse): void {
  setCors(res);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', server: SERVER_NAME, version: pkg.version }));
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCors(res);

  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (req.method === 'POST') {
    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId)!.handleRequest(req, res);
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    const server = createMCPServer();
    await server.connect(transport);

    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
      }
    };

    await transport.handleRequest(req, res);

    if (transport.sessionId) {
      sessions.set(transport.sessionId, transport);
    }
    return;
  }

  if ((req.method === 'GET' || req.method === 'DELETE') && sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId)!.handleRequest(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Session not found or unsupported MCP method' }));
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  try {
    if (req.method === 'OPTIONS') {
      setCors(res);
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/health' && req.method === 'GET') {
      handleHealth(req, res);
      return;
    }

    if (url.pathname === '/mcp') {
      await handleMcp(req, res);
      return;
    }

    setCors(res);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    setCors(res);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
    );
  }
});

httpServer.listen(PORT, () => {
  console.log(`${SERVER_NAME} HTTP server listening on port ${PORT}`);
});
