import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { signAccessToken, generateRefreshToken, hashToken } from './jwt.js';

const REFRESH_COOKIE = 'refresh_token';

export function refreshCookieOptions() {
    return {
        httpOnly: true,
        secure: env.isProd,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
    };
}

export function toPublicProfile(row) {
    return {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        role: row.role,
        email_verified: row.email_verified,
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        last_study_date: row.last_study_date,
        created_at: row.created_at,
    };
}

// Issues a fresh access+refresh pair for a user, persists the refresh token hash, and
// sets it as an httpOnly cookie on the response. Returns the access token for the JSON body.
export async function issueSession(res, user) {
    const accessToken = signAccessToken(user);
    const { token, tokenHash, expiresAt } = generateRefreshToken();

    await pool.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, tokenHash, expiresAt]
    );

    res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
    return accessToken;
}

export async function rotateSession(res, oldToken, user) {
    const oldHash = hashToken(oldToken);
    await pool.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
        [oldHash]
    );
    return issueSession(res, user);
}

export async function revokeAllSessions(userId) {
    await pool.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
    );
}

export function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
}

export { REFRESH_COOKIE };
