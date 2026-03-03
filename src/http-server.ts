#!/usr/bin/env node
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
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
  type CheckDataFreshnessInput,
  type CheckFatfStatusInput,
  type CompareRequirementsInput,
  type GetBaselStandardInput,
  type GetFatfRecommendationInput,
  type GetMutualEvaluationSummaryInput,
  type GetProvisionInput,
  type ListSourcesInput,
  type MapToNationalRequirementsInput,
  type SearchFinancialRegulationInput,
} from './tools/international-financial-regulation.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const SERVER_NAME = 'international-financial-regulation-mcp';
const SERVER_VERSION = '0.1.0';
const DB_ENV_VAR = 'INTERNATIONAL_FINANCIAL_REGULATION_DB_PATH';
const DEFAULT_DB_PATH = '../data/database.db';

function getDefaultDbPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, DEFAULT_DB_PATH);
}

const TOOLS: Tool[] = [
  {
    name: 'search_financial_regulation',
    description: 'Search Basel, FATF, IOSCO, IAIS, FSB, and CPMI-IOSCO provisions using full-text search.',
    inputSchema: {
      type: 'object',
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
      type: 'object',
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
      type: 'object',
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
      type: 'object',
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
      type: 'object',
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
      type: 'object',
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
      type: 'object',
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
      type: 'object',
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
      type: 'object',
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
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'check_data_freshness',
    description: 'Evaluate local source freshness based on last-updated timestamps and freshness windows.',
    inputSchema: {
      type: 'object',
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

function createMCPServer() {
  let dbInstance: Database.Database | null = null;

  function getDb(): Database.Database {
    if (!dbInstance) {
      const dbPath = process.env[DB_ENV_VAR] ?? getDefaultDbPath();
      dbInstance = new Database(dbPath, { readonly: true });
      dbInstance.pragma('foreign_keys = ON');
      console.error(`[${SERVER_NAME}] Opened database at ${dbPath}`);
    }
    return dbInstance;
  }

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'search_financial_regulation':
          result = await searchFinancialRegulation(
            getDb(),
            (args ?? {}) as unknown as SearchFinancialRegulationInput,
          );
          break;

        case 'get_provision':
          result = await getProvision(getDb(), (args ?? {}) as unknown as GetProvisionInput);
          break;

        case 'get_basel_standard':
          result = await getBaselStandard(getDb(), (args ?? {}) as GetBaselStandardInput);
          break;

        case 'get_fatf_recommendation':
          result = await getFatfRecommendation(
            getDb(),
            (args ?? {}) as unknown as GetFatfRecommendationInput,
          );
          break;

        case 'check_fatf_status':
          result = await checkFatfStatus(getDb(), (args ?? {}) as CheckFatfStatusInput);
          break;

        case 'get_mutual_evaluation_summary':
          result = await getMutualEvaluationSummary(
            getDb(),
            (args ?? {}) as GetMutualEvaluationSummaryInput,
          );
          break;

        case 'map_to_national_requirements':
          result = await mapToNationalRequirements(
            getDb(),
            (args ?? {}) as unknown as MapToNationalRequirementsInput,
          );
          break;

        case 'compare_requirements':
          result = await compareRequirements(
            getDb(),
            (args ?? {}) as unknown as CompareRequirementsInput,
          );
          break;

        case 'list_sources':
          result = await listFinancialSources(getDb(), (args ?? {}) as ListSourcesInput);
          break;

        case 'about':
          result = aboutServer();
          break;

        case 'check_data_freshness':
          result = await checkDataFreshness(getDb(), (args ?? {}) as CheckDataFreshnessInput);
          break;

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Error: Unknown tool "${name}".`,
              },
            ],
            isError: true,
          };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

async function main() {
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: SERVER_NAME }));
      return;
    }

    if (url.pathname === '/mcp') {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        await sessions.get(sessionId)!.handleRequest(req, res);
        return;
      }

      if (req.method === 'POST') {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });
        const server = createMCPServer();
        await server.connect(transport);

        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };

        await transport.handleRequest(req, res);
        if (transport.sessionId) sessions.set(transport.sessionId, transport);
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad request' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(PORT, () => {
    console.log(`[${SERVER_NAME}] HTTP server listening on port ${PORT}`);
  });

  const shutdown = () => {
    for (const [, t] of sessions) t.close().catch(() => {});
    sessions.clear();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
