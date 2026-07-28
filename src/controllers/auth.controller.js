import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateOpaqueToken, hashOpaqueToken } from '../lib/tokens.js';
import {
    issueSession,
    rotateSession,
    revokeAllSessions,
    clearRefreshCookie,
    toPublicProfile,
    REFRESH_COOKIE,
} from '../lib/authSession.js';
import { hashToken } from '../lib/jwt.js';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    full_name: z.string().trim().min(1).max(120).optional(),
});

export async function register(req, res, next) {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { email, password, full_name } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        const existing = await pool.query('SELECT id FROM profiles WHERE email = $1', [normalizedEmail]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const passwordHash = await hashPassword(password);
        const role = env.adminBootstrapEmails.includes(normalizedEmail) ? 'admin' : 'user';
        const id = crypto.randomUUID();

        const { rows } = await pool.query(
            `INSERT INTO profiles (id, email, full_name, password_hash, role, email_verified)
             VALUES ($1, $2, $3, $4, $5, false)
             RETURNING *`,
            [id, normalizedEmail, full_name || null, passwordHash, role]
        );
        const user = rows[0];

        const accessToken = await issueSession(res, user);
        res.status(201).json({ user: toPublicProfile(user), accessToken });
    } catch (err) {
        next(err);
    }
}

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export async function login(req, res, next) {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const { email, password } = parsed.data;
        const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email.toLowerCase()]);
        const user = rows[0];

        // Constant response shape whether the user exists or the password is wrong,
        // to avoid leaking which emails are registered.
        if (!user || !(await comparePassword(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Late admin-bootstrap: promotes on login too, in case the email was added to
        // ADMIN_BOOTSTRAP_EMAILS after the account already existed.
        if (env.adminBootstrapEmails.includes(user.email) && user.role !== 'admin') {
            const { rows: updated } = await pool.query(
                "UPDATE profiles SET role = 'admin' WHERE id = $1 RETURNING *",
                [user.id]
            );
            Object.assign(user, updated[0]);
        }

        const accessToken = await issueSession(res, user);
        res.json({ user: toPublicProfile(user), accessToken });
    } catch (err) {
        next(err);
    }
}

export async function refresh(req, res, next) {
    try {
        const token = req.cookies?.[REFRESH_COOKIE];
        if (!token) return res.status(401).json({ error: 'No refresh token' });

        const tokenHash = hashToken(token);
        const { rows } = await pool.query(
            `SELECT rt.*, p.* FROM refresh_tokens rt
             JOIN profiles p ON p.id = rt.user_id
             WHERE rt.token_hash = $1`,
            [tokenHash]
        );
        const record = rows[0];

        if (!record) {
            clearRefreshCookie(res);
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
        if (record.revoked_at) {
            // Reuse of an already-rotated/revoked token — likely theft. Nuke every session.
            await revokeAllSessions(record.user_id);
            clearRefreshCookie(res);
            return res.status(401).json({ error: 'Session revoked, please log in again' });
        }
        if (new Date(record.expires_at) < new Date()) {
            clearRefreshCookie(res);
            return res.status(401).json({ error: 'Refresh token expired' });
        }

        const user = { id: record.user_id, email: record.email, role: record.role };
        const accessToken = await rotateSession(res, token, user);
        res.json({ user: toPublicProfile(record), accessToken });
    } catch (err) {
        next(err);
    }
}

export async function logout(req, res, next) {
    try {
        const token = req.cookies?.[REFRESH_COOKIE];
        if (token) {
            await pool.query(
                'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
                [hashToken(token)]
            );
        }
        clearRefreshCookie(res);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

const forgotSchema = z.object({ email: z.string().email() });

export async function forgotPassword(req, res, next) {
    try {
        const parsed = forgotSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'Valid email required' });

        const { rows } = await pool.query('SELECT id FROM profiles WHERE email = $1', [
            parsed.data.email.toLowerCase(),
        ]);
        const user = rows[0];

        let devResetLink;
        if (user) {
            const { token, tokenHash, expiresAt } = generateOpaqueToken(60 * 60 * 1000); // 1 hour
            await pool.query(
                'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
                [user.id, tokenHash, expiresAt]
            );
            const link = `${env.frontendUrl}/reset-password?token=${token}`;
            console.log(`[password reset] ${parsed.data.email} -> ${link}`);
            if (!env.isProd) devResetLink = link;
        }

        // Always the same response, whether or not the account exists.
        res.json({
            message: 'If an account with that email exists, a reset link has been sent.',
            ...(devResetLink ? { devResetLink } : {}),
        });
    } catch (err) {
        next(err);
    }
}

const resetSchema = z.object({
    token: z.string().min(10),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function resetPassword(req, res, next) {
    try {
        const parsed = resetSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { token, password } = parsed.data;
        const tokenHash = hashOpaqueToken(token);

        const { rows } = await pool.query(
            `SELECT * FROM password_reset_tokens
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
            [tokenHash]
        );
        const record = rows[0];
        if (!record) return res.status(400).json({ error: 'Invalid or expired reset link' });

        const passwordHash = await hashPassword(password);
        await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [
            passwordHash,
            record.user_id,
        ]);
        await pool.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [record.id]);
        await revokeAllSessions(record.user_id); // force re-login everywhere after a password reset

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}
