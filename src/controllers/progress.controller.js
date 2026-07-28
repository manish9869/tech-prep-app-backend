import { withTransaction } from '../db/pool.js';
import { getColumns } from '../lib/genericTable.js';
import { bumpStreak } from '../lib/streak.js';
import { HttpError } from '../middleware/errorHandler.js';

const PROTECTED = new Set(['id', 'created_at', 'user_id']);

// Marking a question complete is genuine study activity — bump the streak in the same
// transaction as the insert, using the server's clock (never a client-supplied date).
export async function createProgress(req, res, next) {
    try {
        const columns = await getColumns('progress');
        const data = {};
        for (const [key, value] of Object.entries(req.body || {})) {
            if (columns.includes(key) && !PROTECTED.has(key)) data[key] = value;
        }
        data.user_id = req.user.id;

        const result = await withTransaction(async (client) => {
            const keys = Object.keys(data);
            if (keys.length === 0) throw new HttpError(400, 'No valid fields provided');
            const values = Object.values(data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const { rows } = await client.query(
                `INSERT INTO progress (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
                values
            );
            await bumpStreak(client, req.user.id);
            return rows[0];
        });

        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}
