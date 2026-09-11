#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import pg from 'pg';

// Ana uygulamanın kök .env dosyasını kullanır (tek DATABASE_URL kaynağı) — cwd'den
// bağımsız olsun diye bu dosyaya göreli yol çözülür.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL ortam değişkeni tanımlı değil (.env dosyasına bakın)');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Verilen tablo adının gerçekten public şemada var olan bir tablo olduğunu doğrular.
// row_count gibi tablo adını SQL identifier olarak (parametre değil) kullanan sorgularda
// enjeksiyonu önlemek için — sadece information_schema'da bulunan gerçek isimler geçer.
async function assertTableExists(table) {
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  if (rows.length === 0) {
    throw new Error(`Tablo bulunamadı: "${table}"`);
  }
}

const server = new McpServer({ name: 'mini-erp-db-schema', version: '1.0.0' });

server.registerTool(
  'list_tables',
  {
    description: 'mini-erp veritabanındaki (public şema) tüm tabloları listeler',
    inputSchema: {},
  },
  async () => {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    return { content: [{ type: 'text', text: rows.map((r) => r.table_name).join('\n') }] };
  },
);

server.registerTool(
  'describe_table',
  {
    description: 'Bir tablonun kolonlarını, tiplerini, primary key ve foreign key ilişkilerini döner',
    inputSchema: { table: z.string().describe('Tablo adı, örn. products') },
  },
  async ({ table }) => {
    await assertTableExists(table);

    const columns = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    );

    const primaryKeys = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' AND tc.table_name = $1`,
      [table],
    );

    const foreignKeys = await pool.query(
      `SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = $1`,
      [table],
    );

    const pkSet = new Set(primaryKeys.rows.map((r) => r.column_name));
    const lines = [`Tablo: ${table}`, '', 'Kolonlar:'];
    for (const col of columns.rows) {
      const pk = pkSet.has(col.column_name) ? ' [PK]' : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      lines.push(`  - ${col.column_name}: ${col.data_type} ${nullable}${def}${pk}`);
    }
    if (foreignKeys.rows.length > 0) {
      lines.push('', 'Foreign key ilişkileri:');
      for (const fk of foreignKeys.rows) {
        lines.push(`  - ${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_column}`);
      }
    }
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
);

server.registerTool(
  'schema_summary',
  {
    description: 'Tüm veritabanı şemasının özetini (her tablo için kolonlar + foreign key ilişkileri) tek metin halinde döner',
    inputSchema: {},
  },
  async () => {
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );

    const allColumns = await pool.query(
      `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`,
    );

    const allForeignKeys = await pool.query(
      `SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
       ORDER BY tc.table_name`,
    );

    const columnsByTable = new Map();
    for (const col of allColumns.rows) {
      if (!columnsByTable.has(col.table_name)) columnsByTable.set(col.table_name, []);
      columnsByTable.get(col.table_name).push(col);
    }
    const fksByTable = new Map();
    for (const fk of allForeignKeys.rows) {
      if (!fksByTable.has(fk.table_name)) fksByTable.set(fk.table_name, []);
      fksByTable.get(fk.table_name).push(fk);
    }

    const lines = [`mini-erp şema özeti — ${tables.rows.length} tablo`, ''];
    for (const { table_name } of tables.rows) {
      const cols = columnsByTable.get(table_name) ?? [];
      const fks = fksByTable.get(table_name) ?? [];
      const colSummary = cols.map((c) => `${c.column_name}:${c.data_type}`).join(', ');
      lines.push(`## ${table_name} (${cols.length} kolon)`);
      lines.push(`  ${colSummary}`);
      for (const fk of fks) {
        lines.push(`  FK: ${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_column}`);
      }
      lines.push('');
    }
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
);

server.registerTool(
  'row_count',
  {
    description: 'Bir tablodaki satır sayısını döner',
    inputSchema: { table: z.string().describe('Tablo adı, örn. products') },
  },
  async ({ table }) => {
    await assertTableExists(table);
    // assertTableExists ile information_schema'ya karşı doğrulandığı için burada
    // identifier'ı parametre olarak DEĞİL, doğrudan (tırnak escape'lenmiş) gömmek güvenli.
    const quoted = `"${table.replace(/"/g, '""')}"`;
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${quoted}`);
    return { content: [{ type: 'text', text: String(rows[0].count) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('mini-erp-db-schema MCP sunucusu stdio üzerinde çalışıyor');
