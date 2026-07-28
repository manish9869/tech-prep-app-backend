import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function signAccessToken(user) {
    return jwt.sign(
        { sub: user.id, role: user.role, email: user.email },
        env.jwtAccessSecret,
        { expiresIn: env.jwtAccessTtl }
    );
}

export function verifyAccessToken(token) {
    return jwt.verify(token, env.jwtAccessSecret);
}

// Refresh tokens are opaque random strings, not JWTs — only their SHA-256 hash is stored,
// so a leaked database dump doesn't hand out usable session tokens.
export function generateRefreshToken() {
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000);
    return { token, tokenHash: hashToken(token), expiresAt };
}

export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
