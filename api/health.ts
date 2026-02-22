import type { IncomingMessage, ServerResponse } from 'http';
// TODO: Replace better-sqlite3 with @ansvar/mcp-sqlite for Vercel production
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, copyFileSync, statSync } from 'fs';

const SOURCE_DB = process.env.INTERNATIONAL_FINANCIAL_REGULATION_DB_PATH
  || join(process.cwd(), 'data', 'database.db');
const TMP_DB = '/tmp/database.db';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    if (!existsSync(TMP_DB) && existsSync(SOURCE_DB)) {
      copyFileSync(SOURCE_DB, TMP_DB);
    }

    const dbPath = existsSync(TMP_DB) ? TMP_DB : SOURCE_DB;

    if (!existsSync(dbPath)) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        error: 'Database not found',
        server: 'international-financial-regulation-mcp',
      }));
      return;
    }

    const db = new Database(dbPath, { readonly: true });

    const provisions = (db.prepare('SELECT COUNT(*) as c FROM provisions').get() as any).c;
    const sources = (db.prepare('SELECT COUNT(*) as c FROM sources').get() as any).c;
    const definitions = (db.prepare('SELECT COUNT(*) as c FROM definitions').get() as any).c;

    const dbStat = statSync(dbPath);
    const dbSizeMB = Number((dbStat.size / (1024 * 1024)).toFixed(1));

    db.close();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: '0.1.0',
      category: 'domain_intelligence',
      server: 'international-financial-regulation-mcp',
      stats: {
        provisions,
        sources,
        definitions,
        database_size_mb: dbSizeMB,
      },
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'error',
      server: 'international-financial-regulation-mcp',
      error: message,
    }));
  }
}
