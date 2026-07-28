import { z } from 'zod';
import { pool } from '../db/pool.js';
import { toPublicProfile } from '../lib/authSession.js';

export async function me(req, res, next) {
    try {
        const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Profile not found' });
        res.json(toPublicProfile(rows[0]));
    } catch (err) {
        next(err);
    }
}

// Intentionally does NOT accept `role`, `id`, `email`, or streak fields — those are either
// server-owned or require the separate admin-only role-change endpoint below.
const updateMeSchema = z.object({
    full_name: z.string().trim().min(1).max(120).optional(),
});

export async function updateMe(req, res, next) {
    try {
        const parsed = updateMeSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
        if (Object.keys(parsed.data).length === 0) {
            return res.status(400).json({ error: 'No updatable fields provided' });
        }

        const { rows } = await pool.query(
            'UPDATE profiles SET full_name = COALESCE($1, full_name), updated_at = now() WHERE id = $2 RETURNING *',
            [parsed.data.full_name ?? null, req.user.id]
        );
        res.json(toPublicProfile(rows[0]));
    } catch (err) {
        next(err);
    }
}

export async function listUsers(req, res, next) {
    try {
        const { rows } = await pool.query(
            'SELECT id, email, full_name, role, current_streak, longest_streak, created_at FROM profiles ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
}

const roleSchema = z.object({ role: z.enum(['user', 'admin']) });

export async function updateUserRole(req, res, next) {
    try {
        const parsed = roleSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: "role must be 'user' or 'admin'" });

        if (req.params.id === req.user.id && parsed.data.role !== 'admin') {
            return res.status(400).json({ error: 'You cannot demote yourself' });
        }

        const { rows } = await pool.query(
            'UPDATE profiles SET role = $1, updated_at = now() WHERE id = $2 RETURNING *',
            [parsed.data.role, req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'User not found' });
        res.json(toPublicProfile(rows[0]));
    } catch (err) {
        next(err);
    }
}
