import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INIT_MIGRATION_PATH = path.join(__dirname, '../../migrations/001_init.sql');

function normalizeType(type) {
  return (type || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.slice();
  }
  if (value == null) {
    return [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // JSON array e.g. ["a","b"]
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed.replace(/{/g, '[').replace(/}/g, ']'));
        return normalizeArray(parsed);
      } catch (error) {
        // Fall through to text-array parsing if JSON.parse fails
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const inner = trimmed.slice(1, -1);
          if (!inner) return [];
          return inner
            .split(',')
            .map((item) => item.replace(/^"|"$/g, '').trim())
            .filter(Boolean);
        }
        return [trimmed];
      }
    }

    return [trimmed];
  }

  // Handle iterable objects (e.g. pg arrays, Sets)
  if (typeof value[Symbol.iterator] === 'function') {
    return Array.from(value).map((item) => (typeof item === 'string' ? item.trim() : item));
  }

  return [value];
}

function safeFilter(value, predicate) {
  return normalizeArray(value).filter(predicate);
}

function loadCreationOrder() {
  if (!fs.existsSync(INIT_MIGRATION_PATH)) {
    return {};
  }
  const sql = fs.readFileSync(INIT_MIGRATION_PATH, 'utf8');
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][\w]*)/gi;
  const order = {};
  let match;
  let index = 0;
  while ((match = regex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    if (!(tableName in order)) {
      order[tableName] = index++;
    }
  }
  return order;
}

function buildColumnMap(columns) {
  const map = new Map();
  for (const col of columns) {
    const key = `${col.table_schema}.${col.table_name}`;
    if (!map.has(key)) {
      map.set(key, new Map());
    }
    map.get(key).set(col.column_name, col);
  }
  return map;
}

function buildConstraintMap(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.table_name}::${row.constraint_name}`;
    if (!map.has(key)) {
      map.set(key, {
        table: row.table_name,
        constraint: row.constraint_name,
        type: row.constraint_type,
        columns: []
      });
    }
    map.get(key).columns.push(row.column_name);
  }
  return map;
}

function analyzeForeignKeys(foreignKeys, columnMap, pkUniqueMap, creationOrder) {
  const missingReferencedColumns = [];
  const mismatchedTypes = [];
  const missingReferencedUnique = [];
  const creationOrderHazards = [];

  for (const fk of foreignKeys) {
    const refTable = fk.foreign_table_name;
    const refColumns = fk.foreign_columns;
    const srcTable = fk.table_name;
    const srcColumns = fk.columns;

    const refColumnSet = columnMap.get(`${refTable.schema}.${refTable.name}`) || new Map();

    const missingColumns = safeFilter(refColumns, (col) => !refColumnSet.has(col));
    if (missingColumns.length > 0) {
      missingReferencedColumns.push({
        constraint: fk.constraint_name,
        table: `${srcTable.schema}.${srcTable.name}`,
        referencingColumns: srcColumns,
        referencedTable: `${refTable.schema}.${refTable.name}`,
        missingColumns
      });
    }

    const srcColumnSet = columnMap.get(`${srcTable.schema}.${srcTable.name}`) || new Map();
    const mismatches = [];
    srcColumns.forEach((srcCol, idx) => {
      const refCol = refColumns[idx];
      const srcType = normalizeType(srcColumnSet.get(srcCol)?.data_type);
      const refType = normalizeType(refColumnSet.get(refCol)?.data_type);
      if (srcType && refType && srcType !== refType) {
        mismatches.push({
          column: srcCol,
          referencedColumn: refCol,
          sourceType: srcType,
          referencedType: refType
        });
      }
    });
    if (mismatches.length > 0) {
      mismatchedTypes.push({
        constraint: fk.constraint_name,
        table: `${srcTable.schema}.${srcTable.name}`,
        referencedTable: `${refTable.schema}.${refTable.name}`,
        mismatches
      });
    }

    const candidateConstraints = Array.from(pkUniqueMap.entries())
      .filter(([key]) => key.startsWith(`${refTable.name}::`))
      .map(([, value]) => value);
    const hasUnique = candidateConstraints.some((constraint) => {
      if (constraint.columns.length !== refColumns.length) {
        return false;
      }
      return constraint.columns.every((col, idx) => col === refColumns[idx]);
    });
    if (!hasUnique) {
      missingReferencedUnique.push({
        constraint: fk.constraint_name,
        referencedTable: `${refTable.schema}.${refTable.name}`,
        referencedColumns: refColumns,
        message: 'Referenced columns are not part of a PRIMARY KEY or UNIQUE constraint'
      });
    }

    const srcOrder = creationOrder[srcTable.name.toLowerCase()];
    const refOrder = creationOrder[refTable.name.toLowerCase()];
    if (typeof srcOrder === 'number' && typeof refOrder === 'number' && srcOrder < refOrder) {
      creationOrderHazards.push({
        constraint: fk.constraint_name,
        table: `${srcTable.schema}.${srcTable.name}`,
        referencedTable: `${refTable.schema}.${refTable.name}`,
        detail: `${srcTable.name} is created before ${refTable.name} in 001_init.sql`
      });
    }
  }

  return {
    missingReferencedColumns,
    mismatchedTypes,
    missingReferencedUnique,
    creationOrderHazards
  };
}

export { analyzeForeignKeys };

// NOTE: Refactored to use centralized databases.js instead of creating own pool
// This service introspects the Customer Data DB (public.* schema)

export async function getDbIntrospectionReport() {
  try {
    // Use queryPostgres from centralized databases.js
    const versionResult = await queryPostgres('SELECT version() AS version');
    const tablesSql = `
      SELECT nsp.nspname AS table_schema, cls.relname AS table_name
      FROM pg_class cls
        JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
      WHERE cls.relkind IN ('r', 'p')
        AND nsp.nspname = 'public'
      ORDER BY table_schema, table_name;
    `;
    const columnsSql = `
      SELECT
        nsp.nspname AS table_schema,
        cls.relname AS table_name,
        att.attname AS column_name,
        pg_catalog.format_type(att.atttypid, att.atttypmod) AS data_type,
        att.attnotnull AS is_not_null,
        pg_get_expr(def.adbin, def.adrelid) AS column_default,
        EXISTS (
          SELECT 1
          FROM pg_index idx
          WHERE idx.indrelid = cls.oid
            AND idx.indisprimary
            AND att.attnum = ANY(idx.indkey)
        ) AS is_primary_key
      FROM pg_attribute att
        JOIN pg_class cls ON cls.oid = att.attrelid
        JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
        LEFT JOIN pg_attrdef def
          ON def.adrelid = att.attrelid
         AND def.adnum = att.attnum
      WHERE att.attnum > 0
        AND NOT att.attisdropped
        AND cls.relkind IN ('r', 'p')
        AND nsp.nspname = 'public'
      ORDER BY table_schema, table_name, att.attnum;
    `;
    const fkSql = `
      WITH fk AS (
        SELECT
          con.oid AS constraint_oid,
          con.conname AS constraint_name,
          nsp.nspname AS table_schema,
          rel.relname AS table_name,
          nsp_ref.nspname AS ref_table_schema,
          rel_ref.relname AS ref_table_name,
          json_agg(att.attname ORDER BY ks.ordinality) AS key_columns_json,
          array_agg(att.attname ORDER BY ks.ordinality) AS key_columns_array,
          json_agg(att_ref.attname ORDER BY ks.ordinality) AS ref_columns_json,
          array_agg(att_ref.attname ORDER BY ks.ordinality) AS ref_columns_array
        FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          JOIN pg_class rel_ref ON rel_ref.oid = con.confrelid
          JOIN pg_namespace nsp_ref ON nsp_ref.oid = rel_ref.relnamespace
          JOIN LATERAL generate_subscripts(con.conkey, 1) WITH ORDINALITY AS ks(subscript, ordinality) ON TRUE
          JOIN pg_attribute att
            ON att.attrelid = con.conrelid
           AND att.attnum = con.conkey[ks.subscript]
          JOIN pg_attribute att_ref
            ON att_ref.attrelid = con.confrelid
           AND att_ref.attnum = con.confkey[ks.subscript]
        WHERE con.contype = 'f'
          AND nsp.nspname = 'public'
          AND nsp_ref.nspname = 'public'
        GROUP BY con.oid, con.conname, nsp.nspname, rel.relname, nsp_ref.nspname, rel_ref.relname
      )
      SELECT *
      FROM fk
      ORDER BY table_schema, table_name, constraint_name;
    `;

    const [tablesRes, colsRes, fkRes] = await Promise.all([
      client.query(tablesSql),
      client.query(columnsSql),
      client.query(fkSql)
    ]);

    const tables = {};
    for (const row of tablesRes.rows) {
      const key = `${row.table_schema}.${row.table_name}`;
      tables[key] = {
        schema: row.table_schema,
        name: row.table_name,
        columns: [],
        primaryKey: [],
        foreignKeys: []
      };
    }

    for (const row of colsRes.rows) {
      const key = `${row.table_schema}.${row.table_name}`;
      if (!tables[key]) {
        tables[key] = {
          schema: row.table_schema,
          name: row.table_name,
          columns: [],
          primaryKey: [],
          foreignKeys: []
        };
      }
      tables[key].columns.push({
        name: row.column_name,
        dataType: row.data_type,
        nullable: !row.is_not_null,
        default: row.column_default
      });
      if (row.is_primary_key) {
        tables[key].primaryKey.push(row.column_name);
      }
    }

    const columnMap = buildColumnMap(
      colsRes.rows.map((col) => ({
        ...col,
        table_name: col.table_name,
        table_schema: col.table_schema
      }))
    );

    // Use queryPostgres from centralized databases.js
    const pkUniqueResult = await queryPostgres(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        AND tc.table_schema = 'public'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);

    const pkUniqueMap = buildConstraintMap(pkUniqueResult.rows);
    const creationOrder = loadCreationOrder();
    const normalizationErrors = [];

    function resolveColumns(row, jsonField, arrayField) {
      const primary = row[jsonField] ?? row[arrayField];
      try {
        return normalizeArray(primary);
      } catch (error) {
        normalizationErrors.push({
          constraint: row.constraint_name,
          table: `${row.table_schema}.${row.table_name}`,
          message: `Failed to normalize FK columns: ${error.message}`
        });
        return [];
      }
    }

    for (const row of fkRes.rows) {
      const key = `${row.table_schema}.${row.table_name}`;
      const table = tables[key];
      if (!table) {
        continue;
      }
      const keyColumns = resolveColumns(row, 'key_columns_json', 'key_columns_array');
      const refColumns = resolveColumns(row, 'ref_columns_json', 'ref_columns_array');

      table.foreignKeys.push({
        constraint: row.constraint_name,
        columns: keyColumns,
        references: {
          schema: row.ref_table_schema,
          table: row.ref_table_name,
          columns: refColumns
        }
      });
    }

    const validation = analyzeForeignKeys(
      fkRes.rows.map((row) => ({
        constraint_name: row.constraint_name,
        table_name: { schema: row.table_schema, name: row.table_name },
        columns: resolveColumns(row, 'key_columns_json', 'key_columns_array'),
        foreign_table_name: { schema: row.ref_table_schema, name: row.ref_table_name },
        foreign_columns: resolveColumns(row, 'ref_columns_json', 'ref_columns_array')
      })),
      columnMap,
      pkUniqueMap,
      creationOrder
    );

    return {
      timestamp: new Date().toISOString(),
      database: {
        version: versionResult.rows[0]?.version || 'unknown'
      },
      tables: Object.values(tables),
      validation: {
        ...validation,
        normalizationErrors
      }
    };
  } catch (error) {
    console.error('[db:introspect] hard error', error.message);
    throw new Error(`Introspection failed: ${error.message}`);
  }
}



