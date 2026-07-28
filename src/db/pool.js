import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle Postgres client', err);
});

export async function withTransaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
