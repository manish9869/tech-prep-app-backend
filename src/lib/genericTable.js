import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/errorHandler.js';

// Real Supabase schema/columns for this project were never exported into this repo
// (no migrations folder) — rather than hand-guess column names per table (and risk
// silently dropping or mismatching a field), we introspect the live Postgres schema
// once per table and only ever accept/insert/update columns that genuinely exist.
// This is what makes it safe to accept an admin-supplied payload without knowing its
// exact shape ahead of time: a caller can never smuggle in a column that isn't real,
// and per-route middleware (requireAdmin / ownership) still governs who may call it.
const columnCache = new Map();

export async function getColumns(table) {
    if (columnCache.has(table)) return columnCache.get(table);
    const { rows } = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [table]
    );
    if (rows.length === 0) throw new Error(`Table "${table}" not found or has no columns`);
    const cols = rows.map((r) => r.column_name);
    columnCache.set(table, cols);
    return cols;
}

const ALWAYS_PROTECTED = new Set(['id', 'created_at']);

function pickAllowed(body, columns, extraProtected) {
    const protectedSet = new Set([...ALWAYS_PROTECTED, ...extraProtected]);
    const out = {};
    for (const [key, value] of Object.entries(body || {})) {
        if (columns.includes(key) && !protectedSet.has(key)) out[key] = value;
    }
    return out;
}

// Builds a small CRUD controller for `table`, scoped optionally to the requesting user.
// `extraProtected`: columns a client is never allowed to set directly via this route
// (e.g. `role`, or `user_id` when it's forced server-side instead).
// `ownerColumn`: if set, every query is additionally filtered/forced to `ownerColumn = req.user.id`.
export function makeTableController({ table, extraProtected = [], ownerColumn = null, orderColumn = 'created_at' }) {
    async function scopeFilter(req) {
        const filters = { ...req.query };
        delete filters.orderBy;
        delete filters.ascending;
        if (ownerColumn) filters[ownerColumn] = req.user.id;
        return filters;
    }

    return {
        async list(req, res, next) {
            try {
                const columns = await getColumns(table);
                const filters = await scopeFilter(req);
                const clauses = [];
                const values = [];
                for (const [key, value] of Object.entries(filters)) {
                    if (!columns.includes(key) || value === undefined || value === '') continue;
                    values.push(value);
                    clauses.push(`${key} = $${values.length}`);
                }
                const orderCol = columns.includes(orderColumn) ? orderColumn : 'id';
                const ascending = req.query.ascending === 'true';
                const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
                const { rows } = await pool.query(
                    `SELECT * FROM ${table} ${where} ORDER BY ${orderCol} ${ascending ? 'ASC' : 'DESC'}`,
                    values
                );
                res.json(rows);
            } catch (err) {
                next(err);
            }
        },

        async getOne(req, res, next) {
            try {
                const clauses = ['id = $1'];
                const values = [req.params.id];
                if (ownerColumn) {
                    clauses.push(`${ownerColumn} = $2`);
                    values.push(req.user.id);
                }
                const { rows } = await pool.query(
                    `SELECT * FROM ${table} WHERE ${clauses.join(' AND ')}`,
                    values
                );
                if (!rows[0]) throw new HttpError(404, 'Not found');
                res.json(rows[0]);
            } catch (err) {
                next(err);
            }
        },

        async create(req, res, next) {
            try {
                const columns = await getColumns(table);
                const data = pickAllowed(req.body, columns, [...extraProtected, ownerColumn].filter(Boolean));
                if (ownerColumn) data[ownerColumn] = req.user.id;

                const keys = Object.keys(data);
                if (keys.length === 0) throw new HttpError(400, 'No valid fields provided');
                const values = Object.values(data);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const { rows } = await pool.query(
                    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
                    values
                );
                res.status(201).json(rows[0]);
            } catch (err) {
                next(err);
            }
        },

        async update(req, res, next) {
            try {
                const columns = await getColumns(table);
                const data = pickAllowed(req.body, columns, [...extraProtected, ownerColumn].filter(Boolean));
                const keys = Object.keys(data);
                if (keys.length === 0) throw new HttpError(400, 'No valid fields provided');

                const values = Object.values(data);
                const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
                const hasUpdatedAt = columns.includes('updated_at');

                const whereClauses = [`id = $${values.length + 1}`];
                values.push(req.params.id);
                if (ownerColumn) {
                    whereClauses.push(`${ownerColumn} = $${values.length + 1}`);
                    values.push(req.user.id);
                }

                const { rows } = await pool.query(
                    `UPDATE ${table} SET ${setClause}${hasUpdatedAt ? ', updated_at = now()' : ''}
                     WHERE ${whereClauses.join(' AND ')} RETURNING *`,
                    values
                );
                if (!rows[0]) throw new HttpError(404, 'Not found');
                res.json(rows[0]);
            } catch (err) {
                next(err);
            }
        },

        async remove(req, res, next) {
            try {
                const clauses = ['id = $1'];
                const values = [req.params.id];
                if (ownerColumn) {
                    clauses.push(`${ownerColumn} = $2`);
                    values.push(req.user.id);
                }
                const { rowCount } = await pool.query(
                    `DELETE FROM ${table} WHERE ${clauses.join(' AND ')}`,
                    values
                );
                if (rowCount === 0) throw new HttpError(404, 'Not found');
                res.json({ success: true });
            } catch (err) {
                next(err);
            }
        },
    };
}
